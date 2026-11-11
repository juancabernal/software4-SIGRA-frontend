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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ModalCrud } from '../../../../shared/components/modal-crud/modal-crud';
import { textoObligatorio } from '../../../asignaturas/components/asignatura-form-dialog/asignatura-form-dialog';
import { Facultad, NOMBRE_MAX } from '../../models/facultad.model';
import { FacultadService } from '../../services/facultad.service';

@Component({
  selector: 'app-facultad-form-dialog',
  imports: [ModalCrud, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './facultad-form-dialog.html',
  styleUrl: './facultad-form-dialog.scss',
})
export class FacultadFormDialog {
  private readonly service = inject(FacultadService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  readonly facultad = input<Facultad | null>(null);
  readonly guardado = output<Facultad>();
  readonly cancelar = output<void>();

  protected readonly procesando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);
  protected readonly modo = computed(() => (this.facultad() ? 'editar' : 'crear'));
  protected readonly nombreMax = NOMBRE_MAX;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [textoObligatorio, Validators.maxLength(NOMBRE_MAX)]],
  });

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      const facultad = this.facultad();
      untracked(() => {
        if (!abierto) {
          return;
        }
        this.errorApi.set(null);
        this.procesando.set(false);
        this.form.reset({ nombre: facultad?.nombre ?? '' });
      });
    });
  }

  protected enviar(): void {
    if (this.form.invalid || this.procesando()) {
      this.form.markAllAsTouched();
      return;
    }
    const nombre = this.form.controls.nombre.value.trim();
    const actual = this.facultad();
    this.procesando.set(true);
    this.errorApi.set(null);

    const peticion =
      actual === null
        ? this.service.crear({ nombre })
        : this.service.modificar(actual.id, nombre);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (facultad) => {
        this.procesando.set(false);
        this.guardado.emit(facultad);
      },
      error: (error: unknown) => {
        this.procesando.set(false);
        this.errorApi.set(mensajeDeError(error));
      },
    });
  }
}
