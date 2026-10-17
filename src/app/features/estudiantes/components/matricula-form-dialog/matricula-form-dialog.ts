import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  switchMap,
} from 'rxjs';

import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import {
  EstadoEstudiante,
  Estudiante,
  EstudianteRequest,
  PRESENTACION_ESTADO_ESTUDIANTE,
} from '../../models/estudiante.model';
import { OpcionAsignatura, OpcionSemestre } from '../../models/matricula.model';
import { TipoDocumento } from '../../models/tipos-documento';
import { validadoresEstudiante } from '../../models/validadores-estudiante';
import {
  MensajeError,
  mensajeDeError,
  registrarErrorTecnico,
} from '../../services/estudiante-error';
import { CatalogosMatriculaService } from '../../services/catalogos-matricula.service';
import { EstudianteService } from '../../services/estudiante.service';
import { MatriculaService } from '../../services/matricula.service';
import { TipoDocumentoOpcionesService } from '../../services/tipo-documento-opciones.service';

type Campo = 'asignaturaId' | 'semestreId';
type CampoEstudianteNuevo =
  'tipoDocumentoId' | 'numeroDocumento' | 'nombreCompleto' | 'correoInstitucional';

/** Cómo se está indicando al estudiante cuando el padre no lo fija. */
type Modo = 'buscar' | 'nuevo';

/** Opciones del filtro de estado sobre los resultados de la búsqueda. */
type FiltroEstado = 'TODOS' | EstadoEstudiante;

/** Documento completo: lo que el backend valida al registrar (@Pattern del DTO). */
const PATRON_DOCUMENTO_COMPLETO = /^\d{6,10}$/;

/** Un criterio más corto haría un LIKE '%%' que devuelve la tabla entera. */
const LONGITUD_MINIMA_CRITERIO = 3;

/** Pausa al teclear antes de consultar: evita una petición por cada letra. */
const RETARDO_BUSQUEDA_MS = 300;

function criterioSuficiente(control: AbstractControl): ValidationErrors | null {
  const texto = String(control.value ?? '').trim();
  return texto.length >= LONGITUD_MINIMA_CRITERIO ? null : { criterioCorto: true };
}

/**
 * Diálogo de matrícula (RF-08, RF-09a). Sirve a dos entradas distintas:
 *
 * - **Desde la ficha de un estudiante**: el padre pasa `estudianteId` y el diálogo solo pide
 *   asignatura y semestre, como siempre.
 * - **Desde la vista de matriculados**: sin `estudianteId`, el diálogo primero identifica al
 *   estudiante — buscándolo por número de documento (D18) o registrándolo en el acto (RF-09a, D14).
 *
 * El código HTTP del `POST /matriculas` —201 crea, 200 reactiva (D4)— decide el texto que se emite
 * al padre: el cuerpo de la respuesta es idéntico en ambos casos.
 */
@Component({
  selector: 'app-matricula-form-dialog',
  imports: [ChipEstado, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './matricula-form-dialog.html',
  styleUrl: './matricula-form-dialog.scss',
})
export class MatriculaFormDialog implements OnInit {
  private readonly catalogos = inject(CatalogosMatriculaService);
  private readonly service = inject(MatriculaService);
  private readonly estudiantes = inject(EstudianteService);
  private readonly tiposDocumentoService = inject(TipoDocumentoOpcionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  /** Estudiante ya determinado por el padre. Vacío = hay que identificarlo en este diálogo. */
  readonly estudianteId = input('');
  readonly estudianteNombre = input('');
  /** Valores iniciales de los selectores, para abrir con los filtros ya puestos (D16). */
  readonly asignaturaIdInicial = input('');
  readonly semestreIdInicial = input('');

  /** Texto ya resuelto del aviso («matriculado» o «matrícula reactivada»): ver D4. */
  readonly matriculado = output<string>();
  readonly cerrado = output<void>();

  /** Catálogo servido por el backend: los ids tienen que ser los de la base en uso. */
  protected readonly tiposDocumento = signal<TipoDocumento[]>([]);
  protected readonly cargandoTiposDocumento = signal(false);

  // ── Identificación del estudiante ─────────────────────────────────
  protected readonly modo = signal<Modo>('buscar');
  /** Encontrado por documento (D18). */
  protected readonly encontrado = signal<Estudiante | null>(null);
  /**
   * Registrado por este diálogo cuyo `POST /matriculas` falló después (D14). Se recuerda para que
   * el reintento mande solo la matrícula y nunca repita el alta.
   */
  protected readonly creado = signal<Estudiante | null>(null);
  protected readonly buscando = signal(false);
  protected readonly noEncontrado = signal(false);
  protected readonly errorBusqueda = signal<string | null>(null);

  // ── Resultados de la búsqueda ─────────────────────────────────────
  /** Todas las coincidencias del servidor; el usuario elige cuál es (D18). */
  protected readonly resultados = signal<Estudiante[]>([]);
  protected readonly filtroEstado = signal<FiltroEstado>('TODOS');
  /** El estado se filtra aquí: el backend no admite ese parámetro. */
  protected readonly resultadosFiltrados = computed(() => {
    const estado = this.filtroEstado();
    const encontrados = this.resultados();
    return estado === 'TODOS' ? encontrados : encontrados.filter((e) => e.estado === estado);
  });
  /** Hay coincidencias, pero el filtro de estado las esconde todas. */
  protected readonly ocultosPorEstado = computed(
    () => this.resultados().length > 0 && this.resultadosFiltrados().length === 0,
  );
  protected readonly presentacionEstado = PRESENTACION_ESTADO_ESTUDIANTE;
  /** Mensaje que distingue «el alta sí, la matrícula no» (D14). */
  protected readonly altaParcial = signal<string | null>(null);

  /** El estudiante contra el que se matricula: el del padre, el recién creado o el encontrado. */
  protected readonly idEfectivo = computed(
    () => this.estudianteId() || this.creado()?.id || this.encontrado()?.id || '',
  );
  /** El padre lo fijó: no se muestra ninguna forma de identificar a otro. */
  protected readonly estudianteFijadoPorPadre = computed(() => !!this.estudianteId());
  /** Datos del estudiante ya identificado dentro del diálogo, para mostrarlos. */
  protected readonly estudianteIdentificado = computed(() => this.creado() ?? this.encontrado());

  protected readonly guardando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);

  // ── Catálogos ─────────────────────────────────────────────────────
  protected readonly asignaturas = signal<OpcionAsignatura[]>([]);
  protected readonly semestres = signal<OpcionSemestre[]>([]);
  protected readonly cargandoCatalogos = signal(true);
  protected readonly errorCatalogos = signal(false);

  // ── Formularios ───────────────────────────────────────────────────
  protected readonly form = this.fb.nonNullable.group({
    asignaturaId: ['', Validators.required],
    semestreId: ['', Validators.required],
  });

  /** Un solo campo: el backend resuelve el LIKE sobre nombre completo o documento. */
  protected readonly formBusqueda = this.fb.nonNullable.group({
    criterio: ['', [Validators.required, criterioSuficiente]],
  });

  private readonly validadores = validadoresEstudiante();
  protected readonly formNuevo = this.fb.nonNullable.group({
    tipoDocumentoId: ['', this.validadores.tipoDocumentoId],
    numeroDocumento: ['', this.validadores.numeroDocumento],
    nombreCompleto: ['', this.validadores.nombreCompleto],
    correoInstitucional: ['', this.validadores.correoInstitucional],
  });

  /**
   * El alta y la matrícula son una sola acción para el usuario (RF-09a), así que el botón lo dice:
   * en el modo «estudiante nuevo» registra y matricula de una vez.
   */
  protected readonly etiquetaConfirmar = computed(() =>
    this.modo() === 'nuevo' && !this.creado() && !this.estudianteFijadoPorPadre()
      ? 'Registrar y matricular'
      : 'Matricular',
  );

  /** Sin estudiante identificado no se puede matricular (D18). */
  protected readonly puedeConfirmar = computed(
    () =>
      !this.guardando() &&
      !this.cargandoCatalogos() &&
      !this.errorCatalogos() &&
      (!!this.idEfectivo() || this.modo() === 'nuevo'),
  );

  /** Cada criterio que hay que consultar, venga de teclear o del botón. */
  private readonly criterioBuscado = new Subject<string>();
  /** Lo último que se consultó, para que teclear no repita lo que el botón ya pidió. */
  private ultimoCriterio = '';

  constructor() {
    this.cargarCatalogos();
    this.escucharTecleo();
    this.atenderBusquedas();
    afterNextRender(() => {
      const dialogo = this.dialogo().nativeElement;
      if (typeof dialogo.showModal === 'function' && !dialogo.open) {
        dialogo.showModal();
      }
    });
  }

  /** Los valores iniciales se leen aquí: en el constructor los inputs todavía no están puestos. */
  ngOnInit(): void {
    this.form.patchValue({
      asignaturaId: this.asignaturaIdInicial(),
      semestreId: this.semestreIdInicial(),
    });
  }

  protected mostrarError(campo: Campo): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected mostrarErrorNuevo(campo: CampoEstudianteNuevo): boolean {
    const control = this.formNuevo.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected mostrarErrorCriterio(): boolean {
    const control = this.formBusqueda.controls.criterio;
    return control.invalid && (control.touched || control.dirty);
  }

  protected reintentarCatalogos(): void {
    this.cargarCatalogos();
  }

  // ── Identificar al estudiante ─────────────────────────────────────

  /**
   * Busca por nombre, apellido o documento: el `filtro` del backend es un LIKE sobre el nombre
   * completo o el número de documento.
   *
   * Nunca preselecciona una coincidencia parcial (D18): matricularía a otra persona. Solo se
   * resuelve sola cuando el usuario escribió un documento completo y existe tal cual; en
   * cualquier otro caso se listan las coincidencias para que él elija.
   */
  protected buscar(): void {
    if (this.formBusqueda.invalid) {
      this.formBusqueda.markAllAsTouched();
      return;
    }
    this.lanzarBusqueda(this.formBusqueda.getRawValue().criterio.trim());
  }

  /**
   * Busca sola mientras el usuario escribe, tras una pausa. El botón «Buscar» sigue ahí para
   * quien prefiera pedirlo explícitamente y para reintentar tras un fallo.
   */
  private escucharTecleo(): void {
    this.formBusqueda.controls.criterio.valueChanges
      .pipe(
        debounceTime(RETARDO_BUSQUEDA_MS),
        map((texto) => texto.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((criterio) => {
        // Con un criterio demasiado corto no se consulta, y lo mostrado antes deja de valer.
        if (criterio.length < LONGITUD_MINIMA_CRITERIO) {
          this.resultados.set([]);
          this.noEncontrado.set(false);
          this.buscando.set(false);
          return;
        }
        // El botón pudo adelantarse a la pausa: no se repite la misma consulta.
        if (criterio === this.ultimoCriterio) {
          return;
        }
        this.lanzarBusqueda(criterio);
      });
  }

  private lanzarBusqueda(criterio: string): void {
    this.ultimoCriterio = criterio;
    this.errorBusqueda.set(null);
    this.noEncontrado.set(false);
    this.errorApi.set(null);
    this.resultados.set([]);
    this.buscando.set(true);
    this.criterioBuscado.next(criterio);
  }

  /**
   * `switchMap` descarta la respuesta de un criterio que el usuario ya cambió: sin eso, una
   * consulta lenta podría pisar con sus resultados a los de lo que está escrito ahora.
   */
  private atenderBusquedas(): void {
    this.criterioBuscado
      .pipe(
        switchMap((criterio) =>
          this.estudiantes.listar(criterio).pipe(
            map((resultados) => ({ criterio, resultados, fallo: null as unknown })),
            catchError((fallo: unknown) => of({ criterio, resultados: [] as Estudiante[], fallo })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ criterio, resultados, fallo }) => {
        this.buscando.set(false);
        if (fallo !== null) {
          this.errorBusqueda.set(mensajeDeError(fallo).mensaje);
          return;
        }
        const exacto = PATRON_DOCUMENTO_COMPLETO.test(criterio)
          ? (resultados.find((e) => e.numeroDocumento === criterio) ?? null)
          : null;
        if (exacto) {
          this.encontrado.set(exacto);
          return;
        }
        this.resultados.set(resultados);
        this.noEncontrado.set(resultados.length === 0);
      });
  }

  /** El usuario elige a quién matricular entre las coincidencias (D18). */
  protected seleccionar(estudiante: Estudiante): void {
    this.encontrado.set(estudiante);
    this.resultados.set([]);
    this.noEncontrado.set(false);
  }

  protected cambiarFiltroEstado(valor: string): void {
    this.filtroEstado.set(valor as FiltroEstado);
  }

  /**
   * Pasa al alta en un paso conservando lo que el usuario ya escribió. Como el criterio ahora
   * puede ser un nombre, se copia al campo que le corresponde y no siempre al del documento.
   */
  protected registrarEnSuLugar(): void {
    const criterio = this.formBusqueda.getRawValue().criterio.trim();
    this.cargarTiposDocumento();
    this.modo.set('nuevo');
    this.noEncontrado.set(false);
    this.errorBusqueda.set(null);
    this.errorApi.set(null);
    this.resultados.set([]);
    this.formNuevo.patchValue(
      PATRON_DOCUMENTO_COMPLETO.test(criterio)
        ? { numeroDocumento: criterio }
        : { nombreCompleto: criterio },
    );
  }

  /** Vuelve a la búsqueda conservando lo escrito en el alta. */
  protected volverABuscar(): void {
    const { numeroDocumento, nombreCompleto } = this.formNuevo.getRawValue();
    const criterio = numeroDocumento.trim() || nombreCompleto.trim();
    this.modo.set('buscar');
    this.errorApi.set(null);
    this.noEncontrado.set(false);
    // Sin `emitEvent` la escucha del tecleo repetiría esta misma búsqueda 300 ms después.
    this.formBusqueda.patchValue({ criterio }, { emitEvent: false });
    if (this.formBusqueda.valid) {
      this.buscar();
    }
  }

  protected cambiarDeEstudiante(): void {
    this.encontrado.set(null);
    this.noEncontrado.set(false);
    this.errorApi.set(null);
    this.resultados.set([]);
  }

  // ── Matricular ────────────────────────────────────────────────────

  protected guardar(): void {
    this.errorApi.set(null);
    if (this.cargandoCatalogos() || this.errorCatalogos() || this.guardando()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.idEfectivo();
    if (id) {
      this.matricular(id);
      return;
    }
    if (this.modo() === 'nuevo') {
      this.registrarYMatricular();
      return;
    }
    // Modo buscar sin estudiante identificado: el botón ya está deshabilitado, pero si llega aquí
    // se avisa en lugar de enviar una matrícula sin estudiante.
    this.formBusqueda.markAllAsTouched();
    this.noEncontrado.set(false);
    this.errorBusqueda.set('Busca primero al estudiante y elígelo de la lista.');
  }

  /** Matrícula sola: el estudiante ya existe (lo fijó el padre, se encontró, o se acaba de crear). */
  private matricular(estudianteId: string): void {
    const { asignaturaId, semestreId } = this.form.getRawValue();
    this.guardando.set(true);
    this.service
      .matricular({ estudianteId, asignaturaId, semestreId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.guardando.set(false);
          this.cerrarDialogo();
          this.matriculado.emit(
            respuesta.status === 201 ? 'Estudiante matriculado.' : 'Matrícula reactivada.',
          );
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          this.errorApi.set(mensajeDeError(error));
        },
      });
  }

  /**
   * Alta y matrícula como una sola acción del usuario (RF-09a, D14). Son dos peticiones: si la
   * primera funciona, `creado` queda puesto antes de lanzar la segunda, de modo que un fallo de la
   * matrícula se distingue de un fallo del alta y el reintento manda solo la matrícula.
   */
  private registrarYMatricular(): void {
    if (this.formNuevo.invalid) {
      this.formNuevo.markAllAsTouched();
      return;
    }
    // No hace falta resolver el tipo de documento por nombre: a diferencia de
    // `estudiante-form-dialog`, que parte del *nombre* que devuelve el servidor, aquí el selector
    // ya ofrece los ids que sirvió el backend en GET /tipos-documento.
    const valores = this.formNuevo.getRawValue();
    const dto: EstudianteRequest = {
      tipoDocumentoId: valores.tipoDocumentoId,
      numeroDocumento: valores.numeroDocumento,
      nombreCompleto: valores.nombreCompleto.trim(),
      correoInstitucional: valores.correoInstitucional.trim(),
    };
    const { asignaturaId, semestreId } = this.form.getRawValue();

    this.guardando.set(true);
    this.estudiantes
      .registrar(dto)
      .pipe(
        switchMap((estudiante) => {
          // Se recuerda ya: si falla la matrícula, el alta no se repite nunca (D14).
          this.creado.set(estudiante);
          return this.service.matricular({ estudianteId: estudiante.id, asignaturaId, semestreId });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (respuesta) => {
          this.guardando.set(false);
          this.cerrarDialogo();
          this.matriculado.emit(
            respuesta.status === 201
              ? 'Estudiante registrado y matriculado.'
              : 'Estudiante registrado y matrícula reactivada.',
          );
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          const mensaje = mensajeDeError(error);
          const creado = this.creado();
          // El usuario solo ve `mensaje` (RNF-17); el detalle técnico queda en consola.
          registrarErrorTecnico(
            creado ? 'matriculas.matricular-tras-registro' : 'estudiantes.registrar',
            error,
          );
          if (creado) {
            // El alta sí ocurrió. Se dice explícitamente, para que el usuario no crea que no pasó
            // nada y vuelva a registrarlo.
            this.altaParcial.set(
              `${creado.nombreCompleto} quedó registrado, pero la matrícula no se realizó: ` +
                `${mensaje.mensaje} Corrige la asignatura o el semestre y vuelve a intentar la ` +
                'matrícula: el estudiante no se registra de nuevo.',
            );
          } else {
            this.errorApi.set(mensaje);
          }
        },
      });
  }

  protected cancelar(): void {
    this.cerrarDialogo();
    this.cerrado.emit();
  }

  /** Tecla Escape: el navegador cierra el diálogo; avisamos al padre. */
  protected alCancelarNativo(evento: Event): void {
    evento.preventDefault();
    if (!this.guardando()) {
      this.cancelar();
    }
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(false);
    forkJoin({
      asignaturas: this.catalogos.listarAsignaturas().pipe(catchError(() => of(null))),
      semestres: this.catalogos.listarSemestres().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ asignaturas, semestres }) => {
        this.cargandoCatalogos.set(false);
        if (asignaturas === null || semestres === null) {
          this.errorCatalogos.set(true);
          this.asignaturas.set([]);
          this.semestres.set([]);
          return;
        }
        this.asignaturas.set(asignaturas);
        this.semestres.set(semestres);
      });
  }

  /** Solo hace falta en el modo «nuevo»; se pide al entrar en él y una sola vez. */
  private cargarTiposDocumento(): void {
    if (this.cargandoTiposDocumento() || this.tiposDocumento().length > 0) {
      return;
    }
    this.cargandoTiposDocumento.set(true);
    this.tiposDocumentoService
      .listar()
      .pipe(
        catchError(() => of([] as TipoDocumento[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((tipos) => {
        this.tiposDocumento.set(tipos);
        this.cargandoTiposDocumento.set(false);
      });
  }

  private cerrarDialogo(): void {
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open && typeof dialogo.close === 'function') {
      dialogo.close();
    }
  }
}
