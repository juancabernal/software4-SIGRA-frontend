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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { Estudiante, EstudianteRequest } from '../../models/estudiante.model';
import { OpcionAsignatura, OpcionSemestre } from '../../models/matricula.model';
import { TIPOS_DOCUMENTO } from '../../models/tipos-documento';
import { validadoresEstudiante } from '../../models/validadores-estudiante';
import { MensajeError, mensajeDeError } from '../../services/estudiante-error';
import { CatalogosMatriculaService } from '../../services/catalogos-matricula.service';
import { EstudianteService } from '../../services/estudiante.service';
import { MatriculaService } from '../../services/matricula.service';

type Campo = 'asignaturaId' | 'semestreId';
type CampoEstudianteNuevo =
  'tipoDocumentoId' | 'numeroDocumento' | 'nombreCompleto' | 'correoInstitucional';

/** Cómo se está indicando al estudiante cuando el padre no lo fija. */
type Modo = 'buscar' | 'nuevo';

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
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './matricula-form-dialog.html',
  styleUrl: './matricula-form-dialog.scss',
})
export class MatriculaFormDialog implements OnInit {
  private readonly catalogos = inject(CatalogosMatriculaService);
  private readonly service = inject(MatriculaService);
  private readonly estudiantes = inject(EstudianteService);
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

  protected readonly tiposDocumento = TIPOS_DOCUMENTO;

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

  protected readonly formBusqueda = this.fb.nonNullable.group({
    numeroDocumento: ['', validadoresEstudiante().numeroDocumento],
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

  constructor() {
    this.cargarCatalogos();
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

  protected mostrarErrorDocumento(): boolean {
    const control = this.formBusqueda.controls.numeroDocumento;
    return control.invalid && (control.touched || control.dirty);
  }

  protected reintentarCatalogos(): void {
    this.cargarCatalogos();
  }

  // ── Identificar al estudiante ─────────────────────────────────────

  /**
   * Busca por documento y se queda **solo** con la coincidencia exacta (D18): el `filtro` del
   * backend es un LIKE sobre nombre o documento, así que puede devolver gente que el usuario no
   * escribió. Preseleccionar a cualquiera de ellos matricularía a otra persona.
   */
  protected buscar(): void {
    this.errorBusqueda.set(null);
    this.noEncontrado.set(false);
    this.errorApi.set(null);
    if (this.formBusqueda.invalid) {
      this.formBusqueda.markAllAsTouched();
      return;
    }
    const documento = this.formBusqueda.getRawValue().numeroDocumento.trim();
    this.buscando.set(true);
    this.estudiantes
      .listar(documento)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultados) => {
          this.buscando.set(false);
          const exacto = resultados.find((e) => e.numeroDocumento === documento) ?? null;
          this.encontrado.set(exacto);
          this.noEncontrado.set(exacto === null);
        },
        error: (error: unknown) => {
          this.buscando.set(false);
          this.errorBusqueda.set(mensajeDeError(error).mensaje);
        },
      });
  }

  /** Pasa al alta en un paso, conservando el documento que el usuario ya escribió. */
  protected registrarEnSuLugar(): void {
    const documento = this.formBusqueda.getRawValue().numeroDocumento.trim();
    this.modo.set('nuevo');
    this.noEncontrado.set(false);
    this.errorBusqueda.set(null);
    this.errorApi.set(null);
    this.formNuevo.patchValue({ numeroDocumento: documento });
  }

  /** Vuelve a buscar por documento, conservando lo escrito en el alta. */
  protected volverABuscar(): void {
    const documento = this.formNuevo.getRawValue().numeroDocumento.trim();
    this.modo.set('buscar');
    this.errorApi.set(null);
    this.noEncontrado.set(false);
    this.formBusqueda.patchValue({ numeroDocumento: documento });
    if (this.formBusqueda.valid) {
      this.buscar();
    }
  }

  protected cambiarDeEstudiante(): void {
    this.encontrado.set(null);
    this.noEncontrado.set(false);
    this.errorApi.set(null);
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
    this.errorBusqueda.set('Busca primero al estudiante por su número de documento.');
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
    // No hace falta resolver el tipo de documento con `idDeTipoDocumento` (D3): a diferencia de
    // `estudiante-form-dialog`, que parte del *nombre* que devuelve el servidor, aquí el selector
    // ya ofrece los ids del propio catálogo `TIPOS_DOCUMENTO`.
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

  private cerrarDialogo(): void {
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open && typeof dialogo.close === 'function') {
      dialogo.close();
    }
  }
}
