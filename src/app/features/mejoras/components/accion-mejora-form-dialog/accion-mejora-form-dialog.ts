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
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { map } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ModalCrud } from '../../../../shared/components/modal-crud/modal-crud';
import { Conclusion } from '../../../estadisticas/models/conclusion.model';
import { AccionMejora, DESCRIPCION_ACCION_MAX, NOMBRE_ACCION_MAX } from '../../models/accion-mejora.model';
import { AccionMejoraService } from '../../services/accion-mejora.service';

/** Obligatorio que además rechaza un texto hecho solo de espacios (el backend usa @NotBlank). */
export function textoObligatorio(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string;
  return typeof valor === 'string' && valor.trim() ? null : { required: true };
}

/** Longitud evaluada sobre el valor recortado. El vacío lo cubre textoObligatorio. */
function longitudMaxima(maximo: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = ((control.value as string) ?? '').trim();
    return valor.length > maximo ? { maxlength: { requiredLength: maximo, actualLength: valor.length } } : null;
  };
}

type Campo = 'nombre' | 'descripcion';

/**
 * Registrar una acción de mejora sobre una conclusión VIGENTE (RF-17). Se abre desde la pantalla
 * de estadísticas una vez detectada la conclusión; al guardar, el backend marca la conclusión
 * como ATENDIDA.
 */
@Component({
  selector: 'app-accion-mejora-form-dialog',
  imports: [ModalCrud, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './accion-mejora-form-dialog.html',
  styleUrl: './accion-mejora-form-dialog.scss',
})
export class AccionMejoraFormDialog {
  private readonly service = inject(AccionMejoraService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  readonly conclusion = input<Conclusion | null>(null);

  readonly guardado = output<AccionMejora>();
  readonly cancelar = output<void>();

  protected readonly nombreMax = NOMBRE_ACCION_MAX;
  protected readonly descripcionMax = DESCRIPCION_ACCION_MAX;

  protected readonly procesando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [textoObligatorio, longitudMaxima(NOMBRE_ACCION_MAX)]],
    descripcion: ['', [textoObligatorio, longitudMaxima(DESCRIPCION_ACCION_MAX)]],
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

  protected mostrarError(campo: Campo): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected alIntentarEnviarInvalido(): void {
    this.form.markAllAsTouched();
  }

  protected enviar(): void {
    const conclusion = this.conclusion();
    if (!conclusion) {
      return;
    }
    const valores = this.form.getRawValue();
    this.errorApi.set(null);
    this.procesando.set(true);

    this.service
      .registrar(conclusion.id, {
        nombre: valores.nombre.trim(),
        descripcion: valores.descripcion.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (accion) => {
          this.procesando.set(false);
          this.guardado.emit(accion);
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
