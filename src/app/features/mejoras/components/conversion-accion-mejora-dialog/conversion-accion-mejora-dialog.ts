import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { map } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ModalCrud } from '../../../../shared/components/modal-crud/modal-crud';
import { AccionMejora } from '../../models/accion-mejora.model';
import { AccionMejoraService } from '../../services/accion-mejora.service';

/** El 0 no cuenta como porcentaje válido; Validators.min(0) sí lo aceptaría. */
function mayorQueCero(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as number | null;
  return typeof valor === 'number' && valor > 0 ? null : { mayorQueCero: true };
}

/** Rechaza más de 2 decimales sin restringir el formato numérico en sí. */
function maximoDosDecimales(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as number | null;
  if (typeof valor !== 'number') {
    return null;
  }
  const decimales = valor.toString().split('.')[1]?.length ?? 0;
  return decimales <= 2 ? null : { maximoDosDecimales: true };
}

/**
 * Convertir una acción de mejora en evaluación (RF-18): pide el porcentaje de la evaluación y
 * llama a POST /acciones-mejora/{id}/conversion. Un 400 (supera el 100% del RA en el semestre) o
 * un 409 (ya convertida) son errores de negocio esperados del backend, no fallos de la app.
 */
@Component({
  selector: 'app-conversion-accion-mejora-dialog',
  imports: [ModalCrud, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conversion-accion-mejora-dialog.html',
  styleUrl: './conversion-accion-mejora-dialog.scss',
})
export class ConversionAccionMejoraDialog {
  private readonly service = inject(AccionMejoraService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  readonly accion = input<AccionMejora | null>(null);

  readonly convertida = output<AccionMejora>();
  readonly cancelar = output<void>();

  protected readonly procesando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);

  protected readonly form = new FormGroup({
    fechaTentativa: new FormControl<string | null>(null, [Validators.required]),
    porcentaje: new FormControl<number | null>(null, [
      Validators.required,
      mayorQueCero,
      Validators.max(100),
      maximoDosDecimales,
    ]),
  });

  private readonly formValido = toSignal(
    this.form.statusChanges.pipe(map((estado) => estado === 'VALID')),
    { initialValue: false },
  );

  protected readonly enviarDeshabilitado = computed(() => !this.formValido());

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      untracked(() => {
        if (abierto) {
          this.preparar();
        }
      });
    });
  }

  protected mostrarErrorFecha(): boolean {
    const control = this.form.controls.fechaTentativa;
    return control.invalid && (control.touched || control.dirty);
  }

  protected mostrarErrorPorcentaje(): boolean {
    const control = this.form.controls.porcentaje;
    return control.invalid && (control.touched || control.dirty);
  }

  protected alIntentarEnviarInvalido(): void {
    this.form.markAllAsTouched();
  }

  protected enviar(): void {
    const accion = this.accion();
    const { fechaTentativa, porcentaje } = this.form.getRawValue();
    if (!accion || fechaTentativa == null || porcentaje == null) {
      return;
    }
    this.errorApi.set(null);
    this.procesando.set(true);

    this.service
      .convertir(accion.id, { fechaTentativa, porcentaje })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (accionConvertida) => {
          this.procesando.set(false);
          this.convertida.emit(accionConvertida);
        },
        error: (error: unknown) => {
          this.procesando.set(false);
          this.errorApi.set(mensajeDeError(error));
        },
      });
  }

  private preparar(): void {
    this.procesando.set(false);
    this.errorApi.set(null);
    this.form.reset();
  }
}
