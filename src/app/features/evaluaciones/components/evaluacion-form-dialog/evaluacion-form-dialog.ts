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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { map } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ModalCrud } from '../../../../shared/components/modal-crud/modal-crud';
import { Icono } from '../../../../shared/ui/icono/icono';
import {
  DESCRIPCION_MAX,
  Evaluacion,
  NOMBRE_MAX,
  PATRON_TEXTO_PROHIBIDO,
  PORCENTAJE_MAX,
  SemestreOpcion,
  enCentesimas,
  formatearFecha,
  formatearPorcentaje,
  normalizarTexto,
  tieneMaximoDosDecimales,
} from '../../models/evaluacion.model';
import { EvaluacionService } from '../../services/evaluacion.service';

export type ModoFormularioEvaluacion = 'crear' | 'editar';

export interface ResultadoFormularioEvaluacion {
  evaluacion: Evaluacion;
  modo: ModoFormularioEvaluacion;
}

/** Texto normalizado obligatorio, con longitud máxima y sin < > ni caracteres de control. */
export function validarTexto(maximo: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const texto = normalizarTexto((control.value as string) ?? '');
    if (!texto) {
      return { required: true };
    }
    if (PATRON_TEXTO_PROHIBIDO.test(texto)) {
      return { caracteres: true };
    }
    return texto.length > maximo ? { maxlength: true } : null;
  };
}

type Campo = 'nombre' | 'fechaTentativa' | 'porcentaje' | 'descripcion';

/**
 * Crear (RF-10a / RF-11) o modificar (RF-10b) una evaluación. Se crea siempre en el semestre en
 * curso, así que la fecha tentativa se limita a sus fechas y el porcentaje a lo que queda
 * disponible del RA. Si la evaluación ya tiene calificaciones, la fecha y el porcentaje se
 * muestran bloqueados y se envían sin cambios.
 *
 * Las validaciones son de experiencia de usuario; el backend vuelve a validarlo todo y su mensaje
 * se muestra en el modal conservando lo escrito.
 */
@Component({
  selector: 'app-evaluacion-form-dialog',
  imports: [Icono, ModalCrud, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evaluacion-form-dialog.html',
  styleUrl: './evaluacion-form-dialog.scss',
})
export class EvaluacionFormDialog {
  private readonly service = inject(EvaluacionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly abierto = input(false);
  readonly raId = input.required<string>();
  /** Evaluación a modificar; null para registrar una nueva. */
  readonly evaluacion = input<Evaluacion | null>(null);
  /** Semestre en curso: la fecha tentativa debe quedar dentro de sus fechas. */
  readonly semestre = input.required<SemestreOpcion>();
  /** Porcentaje que queda libre en el RA (sin contar la evaluación que se modifica). */
  readonly porcentajeDisponible = input.required<number>();

  readonly guardado = output<ResultadoFormularioEvaluacion>();
  readonly cancelar = output<void>();

  protected readonly nombreMax = NOMBRE_MAX;
  protected readonly descripcionMax = DESCRIPCION_MAX;
  protected readonly modo = computed<ModoFormularioEvaluacion>(() =>
    this.evaluacion() ? 'editar' : 'crear',
  );
  protected readonly bloqueada = computed(() => this.evaluacion()?.tieneCalificaciones ?? false);

  /** Lo máximo que admite esta evaluación: lo disponible más su propio porcentaje si se edita. */
  protected readonly porcentajeMaximo = computed(() => {
    const libre =
      enCentesimas(this.porcentajeDisponible()) + enCentesimas(this.evaluacion()?.porcentaje ?? 0);
    return Math.min(libre, enCentesimas(PORCENTAJE_MAX)) / 100;
  });

  protected readonly rangoFechas = computed(() => {
    const s = this.semestre();
    return `Entre el ${formatearFecha(s.fechaInicio)} y el ${formatearFecha(s.fechaFin)} (semestre ${s.codigo})`;
  });
  protected readonly textoMaximo = computed(() => formatearPorcentaje(this.porcentajeMaximo()));

  protected readonly procesando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);

  private readonly validarFecha = (control: AbstractControl): ValidationErrors | null => {
    const fecha = control.value as string;
    if (!fecha) {
      return { required: true };
    }
    const s = this.semestre();
    return fecha < s.fechaInicio || fecha > s.fechaFin ? { fueraSemestre: true } : null;
  };

  private readonly validarPorcentaje = (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as number | null;
    if (valor === null || valor === undefined || Number.isNaN(valor)) {
      return { required: true };
    }
    if (valor <= 0 || valor > PORCENTAJE_MAX) {
      return { rango: true };
    }
    if (!tieneMaximoDosDecimales(valor)) {
      return { decimales: true };
    }
    return enCentesimas(valor) > enCentesimas(this.porcentajeMaximo())
      ? { disponible: true }
      : null;
  };

  protected readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: validarTexto(NOMBRE_MAX) }),
    fechaTentativa: new FormControl('', { nonNullable: true, validators: this.validarFecha }),
    porcentaje: new FormControl<number | null>(null, { validators: this.validarPorcentaje }),
    descripcion: new FormControl('', {
      nonNullable: true,
      validators: validarTexto(DESCRIPCION_MAX),
    }),
  });

  private readonly formValido = toSignal(
    this.form.statusChanges.pipe(map((estado) => estado === 'VALID')),
    { initialValue: false },
  );

  protected readonly largoNombre = toSignal(
    this.form.controls.nombre.valueChanges.pipe(map((v) => normalizarTexto(v ?? '').length)),
    { initialValue: 0 },
  );
  protected readonly largoDescripcion = toSignal(
    this.form.controls.descripcion.valueChanges.pipe(map((v) => normalizarTexto(v ?? '').length)),
    { initialValue: 0 },
  );

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      const evaluacion = this.evaluacion();
      untracked(() => {
        if (abierto) {
          this.preparar(evaluacion);
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
    const evaluacion = this.evaluacion();
    const valores = this.form.getRawValue();
    const datos = {
      nombre: normalizarTexto(valores.nombre),
      fechaTentativa: valores.fechaTentativa,
      porcentaje: Number(valores.porcentaje),
      descripcion: normalizarTexto(valores.descripcion),
    };
    this.errorApi.set(null);
    this.procesando.set(true);

    const peticion = evaluacion
      ? this.service.modificar(evaluacion.id, datos)
      : this.service.crear(this.raId(), datos);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (guardada) => {
        this.procesando.set(false);
        this.guardado.emit({ evaluacion: guardada, modo: this.modo() });
      },
      error: (error: unknown) => {
        this.procesando.set(false);
        this.errorApi.set(mensajeDeError(error));
        if (error instanceof HttpErrorResponse && error.status === 409) {
          // Un 409 es un nombre ya usado en este RA y semestre: se marca el campo para corregirlo.
          this.form.controls.nombre.setErrors({ duplicado: true });
          this.form.controls.nombre.markAsTouched();
        }
      },
    });
  }

  private preparar(evaluacion: Evaluacion | null): void {
    this.procesando.set(false);
    this.errorApi.set(null);
    const { fechaTentativa, porcentaje } = this.form.controls;
    fechaTentativa.enable({ emitEvent: false });
    porcentaje.enable({ emitEvent: false });

    if (evaluacion) {
      this.form.reset({
        nombre: evaluacion.nombre,
        fechaTentativa: evaluacion.fechaTentativa,
        porcentaje: evaluacion.porcentaje,
        descripcion: evaluacion.descripcion,
      });
      if (evaluacion.tieneCalificaciones) {
        fechaTentativa.disable();
        porcentaje.disable();
      }
    } else {
      this.form.reset();
    }
  }
}
