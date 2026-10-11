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

/** Filas por página de la tabla de RA. */
export const RA_POR_PAGINA = 5;

export interface ProgramaFiltro {
  id: string;
  nombre: string;
}

/** Texto en minúsculas y sin tildes, para buscar sin importar mayúsculas ni acentos. */
export function paraBuscar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

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
 * Las materias se filtran por programa y por texto (código o nombre) en el navegador, sobre la
 * lista ya cargada: es un filtro de presentación, no de seguridad. La tabla de RA se pagina en el
 * navegador porque la lista de una materia es corta y ya llega completa.
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

  // ── Filtros del selector ────────────────────────────────────────────
  protected readonly programaFiltro = signal('');
  protected readonly textoFiltro = signal('');

  /** Programas que tienen materias gestionables, sin repetir y ordenados por nombre. */
  protected readonly programas = computed<ProgramaFiltro[]>(() => {
    const porId = new Map<string, string>();
    for (const a of this.asignaturas()) {
      porId.set(a.programaId, a.programaNombre);
    }
    return Array.from(porId, ([id, nombre]) => ({ id, nombre })).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es'),
    );
  });

  protected readonly hayFiltros = computed(
    () => this.programaFiltro() !== '' || paraBuscar(this.textoFiltro()) !== '',
  );

  /**
   * Materias que cumplen los filtros. La materia elegida se conserva aunque no los cumpla, para
   * que filtrar no cambie de materia sin que el usuario lo pida.
   */
  protected readonly asignaturasFiltradas = computed(() => {
    const programa = this.programaFiltro();
    const texto = paraBuscar(this.textoFiltro());
    return this.asignaturas().filter(
      (a) =>
        a.id === this.asignaturaId() ||
        ((!programa || a.programaId === programa) &&
          (!texto || paraBuscar(`${a.codigo} ${a.nombre}`).includes(texto))),
    );
  });

  /** Materias que cumplen los filtros, sin contar la elegida. */
  protected readonly coincidencias = computed(
    () => this.asignaturasFiltradas().filter((a) => a.id !== this.asignaturaId()).length,
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

  // ── Paginación de la tabla ──────────────────────────────────────────
  private readonly pagina = signal(1);
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.resultados().length / RA_POR_PAGINA)),
  );
  /** Si la lista se acorta (p. ej. tras recargar), la página se ajusta a la última que exista. */
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly resultadosPagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * RA_POR_PAGINA;
    return this.resultados().slice(inicio, inicio + RA_POR_PAGINA);
  });
  protected readonly rangoPagina = computed(() => {
    const total = this.resultados().length;
    const desde = (this.paginaActual() - 1) * RA_POR_PAGINA + 1;
    const hasta = Math.min(desde + RA_POR_PAGINA - 1, total);
    return `Mostrando ${desde}–${hasta} de ${total} RA`;
  });

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
    this.pagina.set(1);
  }

  protected alCambiarPrograma(evento: Event): void {
    this.programaFiltro.set((evento.target as HTMLSelectElement).value);
  }

  protected alEscribir(evento: Event): void {
    this.textoFiltro.set((evento.target as HTMLInputElement).value);
  }

  protected limpiarFiltros(): void {
    this.programaFiltro.set('');
    this.textoFiltro.set('');
  }

  protected paginaAnterior(): void {
    this.pagina.set(Math.max(1, this.paginaActual() - 1));
  }

  protected paginaSiguiente(): void {
    this.pagina.set(Math.min(this.totalPaginas(), this.paginaActual() + 1));
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
