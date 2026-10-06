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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ModalCrud } from '../../../../shared/components/modal-crud/modal-crud';
import {
  CODIGO_MAX,
  CODIGO_MIN,
  NOMBRE_MAX,
  PATRON_CODIGO,
  Programa,
} from '../../models/programa.model';
import { ProgramaService } from '../../services/programa.service';

export type ModoFormulario = 'crear' | 'editar';

/** Obligatorio que además rechaza un texto hecho solo de espacios (el backend usa @NotBlank). */
function textoObligatorio(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string;
  return typeof valor === 'string' && valor.trim() ? null : { required: true };
}

/**
 * Registrar o modificar un programa académico (RF-02a, RF-02c). En modo «crear» pide nombre y
 * código. En modo «editar» solo el nombre es editable: el código se muestra bloqueado porque
 * no puede cambiar después de creado.
 *
 * Las validaciones son de experiencia de usuario; el backend vuelve a validarlo todo y su
 * mensaje se muestra en el modal conservando lo escrito.
 */
@Component({
  selector: 'app-programa-form-dialog',
  imports: [ModalCrud, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './programa-form-dialog.html',
  styleUrl: './programa-form-dialog.scss',
})
export class ProgramaFormDialog {
  private readonly service = inject(ProgramaService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  /** Programa a modificar; null para registrar uno nuevo. */
  readonly programa = input<Programa | null>(null);

  readonly guardado = output<Programa>();
  readonly cancelar = output<void>();

  protected readonly procesando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);
  protected readonly modo = computed<ModoFormulario>(() =>
    this.programa() ? 'editar' : 'crear',
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [textoObligatorio, Validators.maxLength(NOMBRE_MAX)]],
    codigo: [
      '',
      [
        textoObligatorio,
        Validators.minLength(CODIGO_MIN),
        Validators.maxLength(CODIGO_MAX),
        Validators.pattern(PATRON_CODIGO),
      ],
    ],
  });

  protected readonly nombreMax = NOMBRE_MAX;
  protected readonly codigoMin = CODIGO_MIN;
  protected readonly codigoMax = CODIGO_MAX;

  constructor() {
    // Cada vez que se abre o cambia el programa, el formulario empieza limpio con sus datos.
    effect(() => {
      const abierto = this.abierto();
      const programa = this.programa();
      untracked(() => {
        if (!abierto) {
          return;
        }
        this.errorApi.set(null);
        this.procesando.set(false);
        this.form.reset({ nombre: programa?.nombre ?? '', codigo: programa?.codigo ?? '' });
        if (programa) {
          this.form.controls.codigo.disable();
        } else {
          this.form.controls.codigo.enable();
        }
      });
    });
  }

  protected enviar(): void {
    if (this.form.invalid || this.procesando()) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombre, codigo } = this.form.getRawValue();
    const actual = this.programa();
    this.procesando.set(true);
    this.errorApi.set(null);

    const peticion =
      actual === null
        ? this.service.crear({ nombre: nombre.trim(), codigo: codigo.trim() })
        : this.service.modificar(actual.id, nombre.trim());

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (programa) => {
        this.procesando.set(false);
        this.guardado.emit(programa);
      },
      error: (error: unknown) => {
        this.procesando.set(false);
        this.errorApi.set(mensajeDeError(error));
      },
    });
  }
}
