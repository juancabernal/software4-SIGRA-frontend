import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { DialogoConfirmacion } from '../../../../shared/components/dialogo-confirmacion/dialogo-confirmacion';
import { ChipEstado, VarianteChip } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import {
  AsignaturaOpcion,
  EstadoAsignaturaOpcion,
  EstadoResultadoAprendizaje,
  MAX_RA_ACTIVOS,
  MIN_RA_ACTIVOS,
  ResultadoAprendizaje,
} from '../../models/resultado-aprendizaje.model';
import { AsignaturaOpcionesService } from '../../services/asignatura-opciones.service';
import { ResultadoAprendizajeService } from '../../services/resultado-aprendizaje.service';
import {
  ResultadoAprendizajeFormDialog,
  ResultadoFormularioRa,
} from '../resultado-aprendizaje-form-dialog/resultado-aprendizaje-form-dialog';

interface Presentacion {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
}

/** Ícono + texto + color: el color nunca va solo (RNF-21). */
export const PRESENTACION_ASIGNATURA: Readonly<Record<EstadoAsignaturaOpcion, Presentacion>> = {
  BORRADOR: { etiqueta: 'Borrador', variante: 'neutro', icono: 'documento-borrador' },
  ACTIVA: { etiqueta: 'Activa', variante: 'ok', icono: 'check' },
  INACTIVA: { etiqueta: 'Inactiva', variante: 'neutro', icono: 'prohibido' },
};

export const PRESENTACION_RA: Readonly<Record<EstadoResultadoAprendizaje, Presentacion>> = {
  ACTIVO: { etiqueta: 'Activo', variante: 'ok', icono: 'check' },
  INACTIVO: { etiqueta: 'Inactivo', variante: 'neutro', icono: 'prohibido' },
};

/** Situación de los RA activos frente al rango permitido. */
export interface IndicadorRango {
  texto: string;
  variante: VarianteChip;
  icono: string;
}

export function indicadorRango(activos: number): IndicadorRango {
  if (activos < MIN_RA_ACTIVOS) {
    const faltan = MIN_RA_ACTIVOS - activos;
    return {
      texto: `Falta${faltan === 1 ? '' : 'n'} ${faltan} para el mínimo (${MIN_RA_ACTIVOS})`,
      variante: 'advertencia',
      icono: 'advertencia',
    };
  }
  if (activos < MAX_RA_ACTIVOS) {
    return { texto: 'Dentro del rango', variante: 'ok', icono: 'check' };
  }
  return { texto: 'Máximo alcanzado', variante: 'neutro', icono: 'check' };
}

/** Por qué una acción no está disponible; se muestra en el tooltip del botón. */
export const MOTIVO_MAXIMO = `Ya hay ${MAX_RA_ACTIVOS} RA activos: inactiva uno antes de agregar otro.`;
export const MOTIVO_MINIMO = `La materia está activa: debe conservar al menos ${MIN_RA_ACTIVOS} RA activos.`;

type Confirmacion = { tipo: 'inactivar' | 'reactivar'; ra: ResultadoAprendizaje };

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

const DURACION_AVISO_MS = 6000;

type CargaResultados =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; lista: ResultadoAprendizaje[] }
  | { estado: 'error'; error: MensajeError };

/**
 * RF-06: gestión de los RA de una materia. Se elige una materia en BORRADOR o ACTIVA (en BORRADOR
 * se cargan los RA que exige su activación) y se listan sus RA para registrarlos, modificar su
 * descripción, inactivarlos o reactivarlos.
 *
 * Los botones reflejan las reglas del backend (máximo 7 activos; mínimo 5 si la materia está
 * ACTIVA) para no ofrecer acciones que fallarían, pero quien decide es el backend y su mensaje
 * se muestra siempre.
 *
 * Los RA se consultan con `switchMap` sobre la materia elegida: si se cambia de materia antes de
 * que llegue la respuesta, la anterior se descarta. Las reglas las aplica el backend.
 */
@Component({
  selector: 'app-resultados-aprendizaje-page',
  imports: [ChipEstado, DialogoConfirmacion, Icono, ResultadoAprendizajeFormDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resultados-aprendizaje-page.html',
  styleUrl: './resultados-aprendizaje-page.scss',
})
export class ResultadosAprendizajePage {
  private readonly asignaturasService = inject(AsignaturaOpcionesService);
  private readonly resultadosService = inject(ResultadoAprendizajeService);

  protected readonly presentacionAsignatura = PRESENTACION_ASIGNATURA;
  protected readonly presentacionRa = PRESENTACION_RA;
  protected readonly maxActivos = MAX_RA_ACTIVOS;
  protected readonly motivoMaximo = MOTIVO_MAXIMO;
  protected readonly motivoMinimo = MOTIVO_MINIMO;
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  // ── Materias del selector ───────────────────────────────────────────
  protected readonly cargandoAsignaturas = signal(true);
  protected readonly errorAsignaturas = signal<MensajeError | null>(null);
  protected readonly asignaturas = signal<AsignaturaOpcion[]>([]);
  protected readonly asignaturaId = signal('');

  protected readonly asignatura = computed(
    () => this.asignaturas().find((a) => a.id === this.asignaturaId()) ?? null,
  );

  // ── RA de la materia elegida ────────────────────────────────────────
  /** Se incrementa para volver a consultar los RA de la misma materia. */
  private readonly recarga = signal(0);

  private readonly carga = toSignal(
    toObservable(computed(() => ({ id: this.asignaturaId(), recarga: this.recarga() }))).pipe(
      switchMap(({ id }) => {
        if (!id) {
          return of<CargaResultados>({ estado: 'inactivo' });
        }
        return this.resultadosService.listarPorAsignatura(id).pipe(
          map((lista): CargaResultados => ({ estado: 'listo', lista })),
          catchError((error: unknown) =>
            of<CargaResultados>({ estado: 'error', error: mensajeDeError(error) }),
          ),
          startWith<CargaResultados>({ estado: 'cargando' }),
        );
      }),
    ),
    { initialValue: { estado: 'inactivo' } as CargaResultados },
  );

  protected readonly cargandoResultados = computed(() => this.carga().estado === 'cargando');
  protected readonly errorResultados = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error : null;
  });
  protected readonly resultados = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.lista : [];
  });

  /** Se cuenta sobre la lista de RA y no con `cantidadRa`, para que refleje cada cambio. */
  protected readonly activos = computed(
    () => this.resultados().filter((ra) => ra.estado === 'ACTIVO').length,
  );
  protected readonly indicador = computed(() => indicadorRango(this.activos()));

  // ── Reglas reflejadas en los botones ────────────────────────────────
  /** Registrar y reactivar suman un RA activo: no se permite pasar del máximo. */
  protected readonly puedeAgregarActivo = computed(() => this.activos() < MAX_RA_ACTIVOS);
  /** En una materia ACTIVA no se puede quedar por debajo del mínimo; en BORRADOR sí. */
  protected readonly puedeInactivar = computed(
    () => this.asignatura()?.estado !== 'ACTIVA' || this.activos() > MIN_RA_ACTIVOS,
  );

  // ── Diálogos y avisos ───────────────────────────────────────────────
  protected readonly formAbierto = signal(false);
  protected readonly raEnEdicion = signal<ResultadoAprendizaje | null>(null);
  protected readonly confirmacion = signal<Confirmacion | null>(null);
  protected readonly procesandoConfirmacion = signal(false);
  protected readonly errorConfirmacion = signal<string | null>(null);
  protected readonly aviso = signal<Aviso | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizadorAviso));
    this.cargarAsignaturas();
  }

  protected cargarAsignaturas(): void {
    this.cargandoAsignaturas.set(true);
    this.errorAsignaturas.set(null);
    this.asignaturasService.listarGestionables().subscribe({
      next: (asignaturas) => {
        this.asignaturas.set(asignaturas);
        // Si la materia elegida ya no está (p. ej. se inactivó), se limpia la selección.
        if (!asignaturas.some((a) => a.id === this.asignaturaId())) {
          this.asignaturaId.set('');
        }
        this.cargandoAsignaturas.set(false);
      },
      error: (error: unknown) => {
        this.errorAsignaturas.set(mensajeDeError(error));
        this.cargandoAsignaturas.set(false);
      },
    });
  }

  protected alCambiarAsignatura(evento: Event): void {
    this.asignaturaId.set((evento.target as HTMLSelectElement).value);
  }

  protected recargarResultados(): void {
    this.recarga.update((n) => n + 1);
  }

  // ── Registrar y modificar ───────────────────────────────────────────
  protected abrirRegistro(): void {
    if (!this.puedeAgregarActivo()) {
      return;
    }
    this.raEnEdicion.set(null);
    this.formAbierto.set(true);
  }

  protected abrirEdicion(ra: ResultadoAprendizaje): void {
    if (ra.estado !== 'ACTIVO') {
      return;
    }
    this.raEnEdicion.set(ra);
    this.formAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.formAbierto.set(false);
  }

  protected alGuardar({ resultado, modo }: ResultadoFormularioRa): void {
    this.formAbierto.set(false);
    this.mostrarAviso(
      modo === 'crear'
        ? `RA ${resultado.codigo} registrado.`
        : `Descripción de ${resultado.codigo} actualizada.`,
    );
    this.recargarResultados();
  }

  // ── Inactivar y reactivar ───────────────────────────────────────────
  protected pedirInactivar(ra: ResultadoAprendizaje): void {
    if (this.puedeInactivar()) {
      this.abrirConfirmacion({ tipo: 'inactivar', ra });
    }
  }

  protected pedirReactivar(ra: ResultadoAprendizaje): void {
    if (this.puedeAgregarActivo()) {
      this.abrirConfirmacion({ tipo: 'reactivar', ra });
    }
  }

  protected cancelarConfirmacion(): void {
    this.confirmacion.set(null);
  }

  protected confirmar(): void {
    const confirmacion = this.confirmacion();
    if (!confirmacion) {
      return;
    }
    const { tipo, ra } = confirmacion;
    this.procesandoConfirmacion.set(true);
    this.errorConfirmacion.set(null);

    const peticion =
      tipo === 'inactivar'
        ? this.resultadosService.inactivar(ra.id)
        : this.resultadosService.reactivar(ra.id);

    peticion.subscribe({
      next: () => {
        this.procesandoConfirmacion.set(false);
        this.confirmacion.set(null);
        this.mostrarAviso(`RA ${ra.codigo} ${tipo === 'inactivar' ? 'inactivado' : 'reactivado'}.`);
        this.recargarResultados();
      },
      error: (error: unknown) => {
        this.procesandoConfirmacion.set(false);
        this.errorConfirmacion.set(mensajeDeError(error).mensaje);
      },
    });
  }

  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  private abrirConfirmacion(confirmacion: Confirmacion): void {
    this.errorConfirmacion.set(null);
    this.confirmacion.set(confirmacion);
  }

  private mostrarAviso(texto: string, tono: Aviso['tono'] = 'ok'): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set({ texto, tono });
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }
}
