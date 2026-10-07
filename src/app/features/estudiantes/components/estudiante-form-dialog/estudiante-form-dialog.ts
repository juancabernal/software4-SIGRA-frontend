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

import { Estudiante, EstudianteRequest } from '../../models/estudiante.model';
import { TIPOS_DOCUMENTO, idDeTipoDocumento } from '../../models/tipos-documento';
import { MensajeError, mensajeDeError } from '../../services/estudiante-error';
import { EstudianteService } from '../../services/estudiante.service';

/** Mismo patrón que valida el backend (@Pattern en EstudianteRequestDTO). */
export const PATRON_NUMERO_DOCUMENTO = /^\d{6,10}$/;
/** Admite mayúsculas y espacios alrededor; se recortan antes de enviar. */
export const PATRON_CORREO_INSTITUCIONAL = /^\s*[\w.-]+@uco\.net\.co\s*$/i;

type Campo = 'tipoDocumentoId' | 'numeroDocumento' | 'nombreCompleto' | 'correoInstitucional';

/**
 * Diálogo de Registrar / Modificar estudiante (RF-09a). El mismo componente sirve para las dos
 * acciones: si `estudiante` llega con valor, el formulario se precarga para modificar y
 * «Guardar» llama a `modificar`; si es null, llama a `registrar`.
 *
 * En modificación, el documento y el tipo de documento quedan en solo lectura: el backend no
 * permite cambiarlos. El id del tipo de documento se resuelve con `idDeTipoDocumento` a partir
 * del nombre que devuelve el servidor (D3); si ese nombre no está en el catálogo declarado, el
 * formulario avisa y no permite guardar en lugar de enviar un id arbitrario.
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  /** Estudiante a modificar; null (u omitido) para registrar uno nuevo. */
  readonly estudiante = input<Estudiante | null>(null);

  readonly guardado = output<Estudiante>();
  readonly cerrado = output<void>();

  protected readonly tiposDocumento = TIPOS_DOCUMENTO;
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

  protected readonly form = inject(FormBuilder).nonNullable.group({
    tipoDocumentoId: ['', Validators.required],
    numeroDocumento: ['', [Validators.required, Validators.pattern(PATRON_NUMERO_DOCUMENTO)]],
    nombreCompleto: ['', Validators.required],
    correoInstitucional: [
      '',
      [Validators.required, Validators.pattern(PATRON_CORREO_INSTITUCIONAL)],
    ],
  });

  constructor() {
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
    const tipoDocumentoId = idDeTipoDocumento(estudiante.tipoDocumentoNombre);
    if (tipoDocumentoId === undefined) {
      this.errorTipoDocumento.set(
        `El tipo de documento «${estudiante.tipoDocumentoNombre}» no se pudo resolver contra ` +
          'el catálogo declarado. No es posible modificar esta ficha hasta que se corrija.',
      );
      return;
    }
    this.form.patchValue({
      tipoDocumentoId,
      numeroDocumento: estudiante.numeroDocumento,
      nombreCompleto: estudiante.nombreCompleto,
      correoInstitucional: estudiante.correoInstitucional,
    });
    this.form.controls.tipoDocumentoId.disable();
    this.form.controls.numeroDocumento.disable();
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
