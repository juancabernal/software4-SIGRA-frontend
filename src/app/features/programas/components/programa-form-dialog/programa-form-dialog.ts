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
import { Subscription } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ModalCrud } from '../../../../shared/components/modal-crud/modal-crud';
import { textoObligatorio } from '../../../asignaturas/components/asignatura-form-dialog/asignatura-form-dialog';
import { Facultad } from '../../../facultades/models/facultad.model';
import { FacultadService } from '../../../facultades/services/facultad.service';
import {
  CODIGO_MAX,
  CODIGO_MIN,
  FACULTAD_SIN_ASIGNAR_ID,
  NOMBRE_MAX,
  PATRON_CODIGO,
  Programa,
} from '../../models/programa.model';
import { ProgramaService } from '../../services/programa.service';

export type ModoFormulario = 'crear' | 'editar';

interface OpcionFacultad {
  id: string;
  etiqueta: string;
}

/**
 * Registrar o modificar un programa académico (RF-02a, RF-02c). En modo «crear» pide nombre,
 * código y facultad activa. En modo «editar» se modifican el nombre y la facultad: el código se
 * muestra bloqueado porque no puede cambiar después de creado.
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
  private readonly facultadService = inject(FacultadService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private cargaFacultades: Subscription | undefined;

  readonly abierto = input(false);
  /** Programa a modificar; null para registrar uno nuevo. */
  readonly programa = input<Programa | null>(null);

  readonly guardado = output<Programa>();
  readonly cancelar = output<void>();

  protected readonly procesando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);
  protected readonly facultades = signal<Facultad[]>([]);
  protected readonly cargandoFacultades = signal(false);
  protected readonly errorFacultades = signal<string | null>(null);

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
    facultadId: ['', [Validators.required]],
  });
  private readonly formularioValido = signal(this.form.valid);

  protected readonly modo = computed<ModoFormulario>(() =>
    this.programa() ? 'editar' : 'crear',
  );

  /**
   * Facultades elegibles: las activas, sin «Facultad sin asignar» (no es una facultad real). Al
   * editar se agrega la facultad actual del programa si no está entre ellas, marcada como inactiva,
   * para que el programa pueda conservarla.
   */
  protected readonly opcionesFacultad = computed<OpcionFacultad[]>(() => {
    const opciones: OpcionFacultad[] = this.facultades()
      .filter((f) => f.id !== FACULTAD_SIN_ASIGNAR_ID)
      .map((f) => ({ id: f.id, etiqueta: f.nombre }));
    const programa = this.programa();
    if (programa && !opciones.some((o) => o.id === programa.facultadId)) {
      // Solo se sabe que está inactiva si la lista de activas llegó bien y no la incluye.
      const inactiva =
        programa.facultadId !== FACULTAD_SIN_ASIGNAR_ID &&
        !this.cargandoFacultades() &&
        this.errorFacultades() === null;
      opciones.unshift({
        id: programa.facultadId,
        etiqueta: inactiva ? `${programa.facultadNombre} (inactiva)` : programa.facultadNombre,
      });
    }
    return opciones;
  });

  /** El programa que se edita sigue en «Facultad sin asignar» y debe reasignarse. */
  protected readonly sinFacultadAsignada = computed(
    () => this.programa()?.facultadId === FACULTAD_SIN_ASIGNAR_ID,
  );

  /** Al crear hace falta al menos una facultad activa; al editar basta con la actual. */
  protected readonly sinFacultadesElegibles = computed(
    () =>
      this.modo() === 'crear' &&
      !this.cargandoFacultades() &&
      this.errorFacultades() === null &&
      this.opcionesFacultad().length === 0,
  );

  protected readonly enviarDeshabilitado = computed(
    () =>
      !this.formularioValido() ||
      this.cargandoFacultades() ||
      (this.modo() === 'crear' &&
        (this.errorFacultades() !== null || this.opcionesFacultad().length === 0)),
  );

  protected readonly nombreMax = NOMBRE_MAX;
  protected readonly codigoMin = CODIGO_MIN;
  protected readonly codigoMax = CODIGO_MAX;

  constructor() {
    this.form.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.formularioValido.set(this.form.valid));

    // Cada vez que se abre o cambia el programa, el formulario empieza limpio con sus datos.
    effect(() => {
      const abierto = this.abierto();
      const programa = this.programa();
      untracked(() => {
        if (!abierto) {
          this.cargaFacultades?.unsubscribe();
          return;
        }
        this.errorApi.set(null);
        this.procesando.set(false);
        this.form.reset({
          nombre: programa?.nombre ?? '',
          codigo: programa?.codigo ?? '',
          facultadId: programa?.facultadId ?? '',
        });
        if (programa) {
          this.form.controls.codigo.disable();
        } else {
          this.form.controls.codigo.enable();
        }
        this.cargarFacultades();
      });
    });
    this.destroyRef.onDestroy(() => this.cargaFacultades?.unsubscribe());
  }

  protected mostrarErrores(): void {
    this.form.markAllAsTouched();
  }

  private cargarFacultades(): void {
    this.cargaFacultades?.unsubscribe();
    this.facultades.set([]);
    this.cargandoFacultades.set(true);
    this.errorFacultades.set(null);
    this.cargaFacultades = this.facultadService.listar({ estado: 'ACTIVO' }).subscribe({
      next: (facultades) => {
        this.facultades.set(facultades);
        this.cargandoFacultades.set(false);
      },
      error: (error: unknown) => {
        this.errorFacultades.set(mensajeDeError(error).mensaje);
        this.cargandoFacultades.set(false);
      },
    });
  }

  protected enviar(): void {
    if (this.form.invalid || this.procesando()) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombre, codigo, facultadId } = this.form.getRawValue();
    const actual = this.programa();
    this.procesando.set(true);
    this.errorApi.set(null);

    const peticion =
      actual === null
        ? this.service.crear({
            nombre: nombre.trim(),
            codigo: codigo.trim(),
            facultadId,
          })
        : this.service.modificar(actual.id, nombre.trim(), facultadId);

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
