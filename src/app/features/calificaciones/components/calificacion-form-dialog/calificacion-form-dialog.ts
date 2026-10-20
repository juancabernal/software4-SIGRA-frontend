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
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { map } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ModalCrud } from '../../../../shared/components/modal-crud/modal-crud';
import {
  Calificacion,
  EventoHistorialCalificacion,
  FilaPlanilla,
  NOTA_MAXIMA,
  NOTA_MINIMA,
  OBSERVACION_MAX,
  OBSERVACION_MIN,
} from '../../models/calificacion.model';
import { CalificacionService } from '../../services/calificacion.service';

/** Como el backend (@Digits fraction = 1): 4, 4.5 sí; 4.25 no. */
export function unDecimal(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as number | null;
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return null;
  }
  return /^-?\d+(\.\d)?$/.test(String(valor)) ? null : { decimales: true };
}

/** Longitud sobre el texto recortado, como lo normaliza el backend antes de validar. */
export function observacionValida(control: AbstractControl): ValidationErrors | null {
  const texto = ((control.value as string) ?? '').trim();
  if (!texto) {
    return { required: true };
  }
  if (/[<>]/.test(texto)) {
    return { caracteres: true };
  }
  if (texto.length < OBSERVACION_MIN || texto.length > OBSERVACION_MAX) {
    return { longitud: { actual: texto.length } };
  }
  return null;
}

type Campo = 'nota' | 'observacion';

/**
 * Registrar o modificar la nota de un estudiante en una evaluación (RF-12 / RF-13). Si la fila ya
 * tiene calificación, el diálogo modifica y muestra el historial de cambios de esa nota.
 */
@Component({
  selector: 'app-calificacion-form-dialog',
  imports: [ModalCrud, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calificacion-form-dialog.html',
  styleUrl: './calificacion-form-dialog.scss',
})
export class CalificacionFormDialog {
  private readonly service = inject(CalificacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  readonly evaluacionId = input('');
  readonly fila = input<FilaPlanilla | null>(null);

  readonly guardado = output<Calificacion>();
  readonly cancelar = output<void>();

  protected readonly notaMin = NOTA_MINIMA;
  protected readonly notaMax = NOTA_MAXIMA;
  protected readonly observacionMin = OBSERVACION_MIN;
  protected readonly observacionMax = OBSERVACION_MAX;

  protected readonly esModificacion = computed(() => !!this.fila()?.calificacionId);
  protected readonly titulo = computed(() => (this.esModificacion() ? 'Modificar nota' : 'Registrar nota'));

  protected readonly procesando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);
  protected readonly historial = signal<EventoHistorialCalificacion[]>([]);
  protected readonly cargandoHistorial = signal(false);

  protected readonly form = inject(FormBuilder).group({
    nota: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(NOTA_MINIMA),
      Validators.max(NOTA_MAXIMA),
      unDecimal,
    ]),
    observacion: new FormControl('', { nonNullable: true, validators: [observacionValida] }),
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

  protected largoObservacion(): number {
    return this.form.controls.observacion.value.trim().length;
  }

  protected alIntentarEnviarInvalido(): void {
    this.form.markAllAsTouched();
  }

  protected enviar(): void {
    const fila = this.fila();
    const valores = this.form.getRawValue();
    if (!fila || valores.nota === null) {
      return;
    }
    const nota = Number(valores.nota);
    const observacion = valores.observacion.trim();
    this.errorApi.set(null);
    this.procesando.set(true);

    const peticion = fila.calificacionId
      ? this.service.modificar(fila.calificacionId, { nota, observacion })
      : this.service.registrar(this.evaluacionId(), { matriculaId: fila.matriculaId, nota, observacion });

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (calificacion) => {
        this.procesando.set(false);
        this.guardado.emit(calificacion);
      },
      error: (error: unknown) => {
        this.procesando.set(false);
        this.errorApi.set(mensajeDeError(error));
      },
    });
  }

  protected formatearFecha(fechaHora: string): string {
    const [fecha, hora = ''] = fechaHora.split('T');
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio} ${hora.slice(0, 5)}`.trim();
  }

  private preparar(): void {
    const fila = this.fila();
    this.procesando.set(false);
    this.errorApi.set(null);
    this.historial.set([]);
    this.form.reset({ nota: fila?.nota ?? null, observacion: fila?.observacion ?? '' });

    if (fila?.calificacionId) {
      this.cargandoHistorial.set(true);
      this.service
        .historial(fila.calificacionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (eventos) => {
            this.historial.set(eventos);
            this.cargandoHistorial.set(false);
          },
          // El historial es informativo: si falla, el formulario sigue disponible.
          error: () => this.cargandoHistorial.set(false),
        });
    }
  }
}