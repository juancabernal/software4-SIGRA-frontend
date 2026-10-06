import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { Semestre } from '../../models/semestre.model';
import { hoyIso } from '../../models/semestre-fechas';
import { MensajeError, mensajeDeError } from '../../services/semestre-error';
import { SemestreService } from '../../services/semestre.service';
import { SemestreIcono } from '../semestre-icono/semestre-icono';

/** Mismo patrón que valida el backend: AAAA-1 o AAAA-2. */
export const PATRON_CODIGO = /^\d{4}-[12]$/;

/**
 * Validación de experiencia de usuario: la fecha de fin debe ser posterior a la de inicio.
 * El backend vuelve a validarlo junto con el resto de reglas (año del código, fechas
 * pasadas y cruces con otros semestres), y la vista muestra su mensaje.
 */
export function finPosteriorAInicio(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('fechaInicio')?.value as string;
  const fin = grupo.get('fechaFin')?.value as string;
  return inicio && fin && fin <= inicio ? { finNoPosterior: true } : null;
}

@Component({
  selector: 'app-semestre-form-dialog',
  imports: [ReactiveFormsModule, SemestreIcono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './semestre-form-dialog.html',
  styleUrl: './semestre-form-dialog.scss',
})
export class SemestreFormDialog {
  private readonly service = inject(SemestreService);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  readonly guardado = output<Semestre>();
  readonly cerrado = output<void>();

  protected readonly hoy = hoyIso();
  protected readonly guardando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      codigo: ['', [Validators.required, Validators.pattern(PATRON_CODIGO)]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
    },
    { validators: finPosteriorAInicio },
  );

  constructor() {
    afterNextRender(() => {
      const dialogo = this.dialogo().nativeElement;
      if (typeof dialogo.showModal === 'function' && !dialogo.open) {
        dialogo.showModal();
      }
    });
  }

  protected mostrarError(campo: 'codigo' | 'fechaInicio' | 'fechaFin'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected mostrarErrorRango(): boolean {
    const fin = this.form.controls.fechaFin;
    return this.form.hasError('finNoPosterior') && (fin.touched || fin.dirty);
  }

  protected guardar(): void {
    this.errorApi.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.service.crear(this.form.getRawValue()).subscribe({
      next: (semestre) => {
        this.guardando.set(false);
        this.cerrarDialogo();
        this.guardado.emit(semestre);
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
