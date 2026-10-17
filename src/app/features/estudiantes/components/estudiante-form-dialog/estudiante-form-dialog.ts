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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { Estudiante, EstudianteRequest } from '../../models/estudiante.model';
import { TipoDocumento, mismoNombreDeTipo } from '../../models/tipos-documento';
import { CampoEstudiante, validadoresEstudiante } from '../../models/validadores-estudiante';
import {
  MensajeError,
  mensajeDeError,
  registrarErrorTecnico,
} from '../../services/estudiante-error';
import { EstudianteService } from '../../services/estudiante.service';
import { TipoDocumentoOpcionesService } from '../../services/tipo-documento-opciones.service';

// Los patrones del borde viven en `models/validadores-estudiante.ts`: los comparte con el modo
// «estudiante nuevo» de `matricula-form-dialog`, para no duplicar las expresiones (D14).
type Campo = CampoEstudiante;

/**
 * Diálogo de Registrar / Modificar estudiante (RF-09a). El mismo componente sirve para las dos
 * acciones: si `estudiante` llega con valor, el formulario se precarga para modificar y
 * «Guardar» llama a `modificar`; si es null, llama a `registrar`.
 *
 * El catálogo de tipos de documento se pide a `GET /tipos-documento`: son los del ambiente al
 * que esté conectada la aplicación, no una lista escrita en el código.
 *
 * En modificación, el documento y el tipo de documento quedan en solo lectura: el backend no
 * permite cambiarlos. Como la respuesta del estudiante trae el *nombre* del tipo y nunca su id
 * (D3), el id se resuelve buscando ese nombre dentro del catálogo recibido; si no aparece, el
 * formulario avisa y no permite guardar, en lugar de enviar un id arbitrario.
 */
@Component({
  selector: 'app-estudiante-form-dialog',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estudiante-form-dialog.html',
  styleUrl: './estudiante-form-dialog.scss',
})
export class EstudianteFormDialog implements OnInit {
  private readonly service = inject(EstudianteService);
  private readonly tiposDocumentoService = inject(TipoDocumentoOpcionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  /** Estudiante a modificar; null (u omitido) para registrar uno nuevo. */
  readonly estudiante = input<Estudiante | null>(null);

  readonly guardado = output<Estudiante>();
  readonly cerrado = output<void>();

  protected readonly tiposDocumento = signal<TipoDocumento[]>([]);
  protected readonly cargandoTiposDocumento = signal(true);
  protected readonly esModificar = computed(() => this.estudiante() !== null);
  protected readonly titulo = computed(() =>
    this.esModificar() ? 'Modificar estudiante' : 'Registrar estudiante',
  );
  protected readonly etiquetaGuardar = computed(() => {
    if (this.guardando()) {
      return this.esModificar() ? 'Guardando…' : 'Registrando…';
    }
    return this.esModificar() ? 'Guardar cambios' : 'Registrar estudiante';
  });

  protected readonly guardando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);
  /** D3: distinto de null solo cuando el tipo de documento del estudiante no resuelve a ningún id. */
  protected readonly errorTipoDocumento = signal<string | null>(null);

  private readonly validadores = validadoresEstudiante();
  protected readonly form = inject(FormBuilder).nonNullable.group({
    tipoDocumentoId: ['', this.validadores.tipoDocumentoId],
    numeroDocumento: ['', this.validadores.numeroDocumento],
    nombreCompleto: ['', this.validadores.nombreCompleto],
    correoInstitucional: ['', this.validadores.correoInstitucional],
  });

  constructor() {
    this.tiposDocumentoService
      .listar()
      .pipe(
        catchError(() => of([] as TipoDocumento[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((tipos) => {
        this.tiposDocumento.set(tipos);
        this.cargandoTiposDocumento.set(false);
        this.resolverTipoDelEstudiante();
      });

    afterNextRender(() => {
      const dialogo = this.dialogo().nativeElement;
      if (typeof dialogo.showModal === 'function' && !dialogo.open) {
        dialogo.showModal();
      }
    });
  }

  ngOnInit(): void {
    const estudiante = this.estudiante();
    if (!estudiante) {
      return;
    }
    // El tipo de documento se completa aparte: depende del catálogo, que llega del servidor.
    this.form.patchValue({
      numeroDocumento: estudiante.numeroDocumento,
      nombreCompleto: estudiante.nombreCompleto,
      correoInstitucional: estudiante.correoInstitucional,
    });
    this.form.controls.numeroDocumento.disable();
  }

  /**
   * Modificación: traduce el nombre del tipo que devolvió el servidor al id que exige el `PUT`.
   * Se ejecuta cuando el catálogo ya está, no antes.
   */
  private resolverTipoDelEstudiante(): void {
    const estudiante = this.estudiante();
    if (!estudiante) {
      return;
    }
    if (this.tiposDocumento().length === 0) {
      this.errorTipoDocumento.set(
        'No se pudo cargar el catálogo de tipos de documento. Cierra el formulario y ' +
          'vuelve a intentarlo.',
      );
      return;
    }
    const tipo = this.tiposDocumento().find((t) =>
      mismoNombreDeTipo(t.nombre, estudiante.tipoDocumentoNombre),
    );
    if (!tipo) {
      this.errorTipoDocumento.set(
        `El tipo de documento «${estudiante.tipoDocumentoNombre}» no figura en el catálogo del ` +
          'servidor. No es posible modificar esta ficha hasta que se corrija.',
      );
      return;
    }
    this.form.patchValue({ tipoDocumentoId: tipo.id });
    this.form.controls.tipoDocumentoId.disable();
  }

  protected mostrarError(campo: Campo): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected guardar(): void {
    this.errorApi.set(null);
    if (this.errorTipoDocumento()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);

    const valores = this.form.getRawValue();
    const dto: EstudianteRequest = {
      tipoDocumentoId: valores.tipoDocumentoId,
      numeroDocumento: valores.numeroDocumento,
      nombreCompleto: valores.nombreCompleto.trim(),
      correoInstitucional: valores.correoInstitucional.trim(),
    };

    const estudiante = this.estudiante();
    const peticion = estudiante
      ? this.service.modificar(estudiante.id, dto)
      : this.service.registrar(dto);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resultado) => {
        this.guardando.set(false);
        this.cerrarDialogo();
        this.guardado.emit(resultado);
      },
      error: (error: unknown) => {
        this.guardando.set(false);
        // El usuario solo ve el mensaje amigable (RNF-17); el detalle técnico queda en consola.
        registrarErrorTecnico(
          estudiante ? 'estudiantes.modificar' : 'estudiantes.registrar',
          error,
        );
        this.errorApi.set(mensajeDeError(error));
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

  private cerrarDialogo(): void {
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open && typeof dialogo.close === 'function') {
      dialogo.close();
    }
  }
}
