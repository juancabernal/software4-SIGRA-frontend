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
  Validators,
} from '@angular/forms';
import { map } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ModalCrud } from '../../../../shared/components/modal-crud/modal-crud';
import { Icono } from '../../../../shared/ui/icono/icono';
import {
  Asignatura,
  CODIGO_MAX,
  CODIGO_MIN,
  NOMBRE_MAX,
  NOMBRE_MIN,
  PATRON_CODIGO,
  PATRON_NOMBRE_PROHIBIDO,
  ProgramaOpcion,
} from '../../models/asignatura.model';
import { AsignaturaService } from '../../services/asignatura.service';
import { ProgramaOpcionesService } from '../../services/programa-opciones.service';

export type ModoFormulario = 'crear' | 'editar';

export interface ResultadoFormulario {
  asignatura: Asignatura;
  modo: ModoFormulario;
}

export const ERROR_PROGRAMAS =
  'No se pudieron cargar los programas académicos. Cierra e inténtalo de nuevo.';

/** Obligatorio que además rechaza un texto hecho solo de espacios (el backend usa @NotBlank). */
export function textoObligatorio(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string;
  return typeof valor === 'string' && valor.trim() ? null : { required: true };
}

/** Código tal como lo guarda el backend: recortado y en mayúsculas. */
export function normalizarCodigo(valor: string): string {
  return valor.trim().toUpperCase();
}

/** Nombre tal como lo guarda el backend: recortado y con cualquier racha de espacios reducida a uno. */
export function normalizarNombre(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}

/** Longitud y formato del código, evaluados sobre el valor recortado. El vacío lo cubre textoObligatorio. */
export function codigoValido(control: AbstractControl): ValidationErrors | null {
  const codigo = normalizarCodigo((control.value as string) ?? '');
  if (!codigo) {
    return null;
  }
  if (codigo.length < CODIGO_MIN) {
    return { minlength: { requiredLength: CODIGO_MIN, actualLength: codigo.length } };
  }
  if (codigo.length > CODIGO_MAX) {
    return { maxlength: { requiredLength: CODIGO_MAX, actualLength: codigo.length } };
  }
  return PATRON_CODIGO.test(codigo) ? null : { formato: true };
}

/** Longitud y caracteres del nombre, evaluados sobre el valor normalizado. */
export function nombreValido(control: AbstractControl): ValidationErrors | null {
  const nombre = normalizarNombre((control.value as string) ?? '');
  if (!nombre) {
    return null;
  }
  if (nombre.length < NOMBRE_MIN) {
    return { minlength: { requiredLength: NOMBRE_MIN, actualLength: nombre.length } };
  }
  if (nombre.length > NOMBRE_MAX) {
    return { maxlength: { requiredLength: NOMBRE_MAX, actualLength: nombre.length } };
  }
  return PATRON_NOMBRE_PROHIBIDO.test(nombre) ? { caracteres: true } : null;
}

type Campo = 'nombre' | 'codigo' | 'programaId';

/**
 * Registrar o modificar una materia (RF-03a, RF-03c). En modo «crear» pide exactamente nombre,
 * código y programa ACTIVO; la materia nace en BORRADOR. En modo «editar» solo el nombre es
 * editable: código y programa son inmutables y se muestran bloqueados.
 *
 * Las validaciones son de experiencia de usuario; el backend vuelve a validarlo todo y su
 * mensaje se muestra en el modal conservando lo escrito.
 */
@Component({
  selector: 'app-asignatura-form-dialog',
  imports: [Icono, ModalCrud, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asignatura-form-dialog.html',
  styleUrl: './asignatura-form-dialog.scss',
})
export class AsignaturaFormDialog {
  private readonly service = inject(AsignaturaService);
  private readonly programasService = inject(ProgramaOpcionesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  /** Asignatura a modificar; null para registrar una nueva. */
  readonly asignatura = input<Asignatura | null>(null);

  readonly guardado = output<ResultadoFormulario>();
  readonly cancelar = output<void>();

  protected readonly nombreMin = NOMBRE_MIN;
  protected readonly nombreMax = NOMBRE_MAX;
  protected readonly codigoMin = CODIGO_MIN;
  protected readonly codigoMax = CODIGO_MAX;
  protected readonly modo = computed<ModoFormulario>(() =>
    this.asignatura() ? 'editar' : 'crear',
  );

  protected readonly procesando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);
  protected readonly programas = signal<ProgramaOpcion[]>([]);
  protected readonly cargandoProgramas = signal(false);
  protected readonly errorProgramas = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [textoObligatorio, nombreValido]],
    codigo: ['', [textoObligatorio, codigoValido]],
    programaId: ['', Validators.required],
  });

  private readonly formValido = toSignal(
    this.form.statusChanges.pipe(map((estado) => estado === 'VALID')),
    { initialValue: false },
  );

  protected readonly enviarDeshabilitado = computed(
    () =>
      !this.formValido() ||
      (this.modo() === 'crear' && (this.cargandoProgramas() || this.errorProgramas() !== null)),
  );

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      const asignatura = this.asignatura();
      untracked(() => {
        if (abierto) {
          this.preparar(asignatura);
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
    const asignatura = this.asignatura();
    const valores = this.form.getRawValue();
    this.errorApi.set(null);
    this.procesando.set(true);

    const peticion = asignatura
      ? this.service.modificar(asignatura.id, normalizarNombre(valores.nombre))
      : this.service.crear({
          codigo: normalizarCodigo(valores.codigo),
          nombre: normalizarNombre(valores.nombre),
          programaId: valores.programaId,
        });

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (guardada) => {
        this.procesando.set(false);
        this.guardado.emit({ asignatura: guardada, modo: this.modo() });
      },
      error: (error: unknown) => {
        this.procesando.set(false);
        this.errorApi.set(mensajeDeError(error));
        if (!asignatura && error instanceof HttpErrorResponse && error.status === 409) {
          // En el registro, un 409 es un código ya usado: se marca el campo para corregirlo.
          this.form.controls.codigo.setErrors({ duplicado: true });
          this.form.controls.codigo.markAsTouched();
        }
      },
    });
  }

  private preparar(asignatura: Asignatura | null): void {
    this.procesando.set(false);
    this.errorApi.set(null);
    const { codigo, programaId } = this.form.controls;
    if (asignatura) {
      this.form.reset({
        nombre: asignatura.nombre,
        codigo: asignatura.codigo,
        programaId: asignatura.programaId,
      });
      codigo.disable();
      programaId.disable();
    } else {
      this.form.reset();
      codigo.enable();
      programaId.enable();
      this.cargarProgramas();
    }
  }

  private cargarProgramas(): void {
    this.cargandoProgramas.set(true);
    this.errorProgramas.set(null);
    this.form.updateValueAndValidity();
    this.programasService
      .listar('ACTIVO')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (programas) => {
          this.programas.set(programas);
          this.cargandoProgramas.set(false);
        },
        error: () => {
          this.programas.set([]);
          this.cargandoProgramas.set(false);
          this.errorProgramas.set(ERROR_PROGRAMAS);
        },
      });
  }
}
