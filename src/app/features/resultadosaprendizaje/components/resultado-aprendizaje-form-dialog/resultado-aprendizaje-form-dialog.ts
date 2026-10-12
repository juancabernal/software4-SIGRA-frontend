import { HttpErrorResponse } from '@angular/common/http';
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
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { map } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ModalCrud } from '../../../../shared/components/modal-crud/modal-crud';
import { Icono } from '../../../../shared/ui/icono/icono';
import {
  CODIGO_MAX,
  DESCRIPCION_MAX,
  DESCRIPCION_MIN,
  PATRON_CODIGO,
  PATRON_DESCRIPCION_PROHIBIDO,
  ResultadoAprendizaje,
  normalizarCodigo,
  normalizarDescripcion,
} from '../../models/resultado-aprendizaje.model';
import { ResultadoAprendizajeService } from '../../services/resultado-aprendizaje.service';

export type ModoFormularioRa = 'crear' | 'editar';

export interface ResultadoFormularioRa {
  resultado: ResultadoAprendizaje;
  modo: ModoFormularioRa;
}

/** Código normalizado (recortado, en mayúsculas): obligatorio, máximo 10 y formato RA-01. */
export function validarCodigo(control: AbstractControl): ValidationErrors | null {
  const codigo = normalizarCodigo((control.value as string) ?? '');
  if (!codigo) {
    return { required: true };
  }
  if (codigo.length > CODIGO_MAX) {
    return { maxlength: true };
  }
  return PATRON_CODIGO.test(codigo) ? null : { pattern: true };
}

/** Descripción normalizada: obligatoria, entre 10 y 100 caracteres y sin < > ni caracteres de control. */
export function validarDescripcion(control: AbstractControl): ValidationErrors | null {
  const descripcion = normalizarDescripcion((control.value as string) ?? '');
  if (!descripcion) {
    return { required: true };
  }
  if (PATRON_DESCRIPCION_PROHIBIDO.test(descripcion)) {
    return { caracteres: true };
  }
  if (descripcion.length < DESCRIPCION_MIN) {
    return { minlength: true };
  }
  return descripcion.length > DESCRIPCION_MAX ? { maxlength: true } : null;
}

type Campo = 'codigo' | 'descripcion';

/**
 * Registrar un RA (RF-06a) o modificar su descripción (RF-06c). En «editar» el código es
 * inmutable y se muestra bloqueado. Solo se abre en modo «editar» para RA ACTIVOS.
 *
 * Las validaciones son de experiencia de usuario; el backend vuelve a validarlo todo y su
 * mensaje se muestra en el modal conservando lo escrito.
 */
@Component({
  selector: 'app-resultado-aprendizaje-form-dialog',
  imports: [Icono, ModalCrud, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resultado-aprendizaje-form-dialog.html',
  styleUrl: './resultado-aprendizaje-form-dialog.scss',
})
export class ResultadoAprendizajeFormDialog {
  private readonly service = inject(ResultadoAprendizajeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  readonly asignaturaId = input.required<string>();
  /** RA a modificar; null para registrar uno nuevo. */
  readonly resultado = input<ResultadoAprendizaje | null>(null);

  readonly guardado = output<ResultadoFormularioRa>();
  readonly cancelar = output<void>();

  protected readonly codigoMax = CODIGO_MAX;
  protected readonly descripcionMin = DESCRIPCION_MIN;
  protected readonly descripcionMax = DESCRIPCION_MAX;
  protected readonly modo = computed<ModoFormularioRa>(() =>
    this.resultado() ? 'editar' : 'crear',
  );

  protected readonly procesando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    codigo: ['', validarCodigo],
    descripcion: ['', validarDescripcion],
  });

  private readonly formValido = toSignal(
    this.form.statusChanges.pipe(map((estado) => estado === 'VALID')),
    { initialValue: false },
  );

  /** Caracteres de la descripción ya normalizada (lo que se guardará), para el contador. */
  protected readonly largoDescripcion = toSignal(
    this.form.controls.descripcion.valueChanges.pipe(
      map((valor) => normalizarDescripcion(valor ?? '').length),
    ),
    { initialValue: 0 },
  );

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      const resultado = this.resultado();
      untracked(() => {
        if (abierto) {
          this.preparar(resultado);
        }
      });
    });
  }

  protected enviarDeshabilitado(): boolean {
    return !this.formValido();
  }

  protected mostrarError(campo: Campo): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected alIntentarEnviarInvalido(): void {
    this.form.markAllAsTouched();
  }

  protected enviar(): void {
    const resultado = this.resultado();
    const { codigo, descripcion } = this.form.getRawValue();
    this.errorApi.set(null);
    this.procesando.set(true);

    const peticion = resultado
      ? this.service.actualizarDescripcion(resultado.id, {
          descripcion: normalizarDescripcion(descripcion),
        })
      : this.service.crear(this.asignaturaId(), {
          codigo: normalizarCodigo(codigo),
          descripcion: normalizarDescripcion(descripcion),
        });

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (guardado) => {
        this.procesando.set(false);
        this.guardado.emit({ resultado: guardado, modo: this.modo() });
      },
      error: (error: unknown) => {
        this.procesando.set(false);
        this.errorApi.set(mensajeDeError(error));
        if (!resultado && error instanceof HttpErrorResponse && error.status === 409) {
          // En el registro, un 409 es un código ya usado en la materia: se marca el campo.
          this.form.controls.codigo.setErrors({ duplicado: true });
          this.form.controls.codigo.markAsTouched();
        }
      },
    });
  }

  private preparar(resultado: ResultadoAprendizaje | null): void {
    this.procesando.set(false);
    this.errorApi.set(null);
    const { codigo } = this.form.controls;
    if (resultado) {
      this.form.reset({ codigo: resultado.codigo, descripcion: resultado.descripcion });
      codigo.disable();
    } else {
      this.form.reset();
      codigo.enable();
    }
  }
}
