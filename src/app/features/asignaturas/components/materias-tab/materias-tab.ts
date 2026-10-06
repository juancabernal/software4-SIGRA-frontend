import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { DialogoConfirmacion } from '../../../../shared/components/dialogo-confirmacion/dialogo-confirmacion';
import { PanelLateral } from '../../../../shared/components/panel-lateral/panel-lateral';
import { ChipEstado, VarianteChip } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import {
  Asignatura,
  EstadoAsignatura,
  FiltrosAsignaturas,
  MAX_RA,
  MIN_RA,
  ProgramaOpcion,
  puedeActivarse,
} from '../../models/asignatura.model';
import { AsignaturaService } from '../../services/asignatura.service';
import {
  AsignaturaFormDialog,
  ResultadoFormulario,
} from '../asignatura-form-dialog/asignatura-form-dialog';
import { ProgramaOpcionesService } from '../../services/programa-opciones.service';

/** Opciones del selector «Cantidad de RA» (RF-03b) y su equivalencia en raMin/raMax. */
export const RANGOS_RA = [
  { valor: 'todas', etiqueta: 'Todas las cantidades de RA' },
  { valor: 'sin', etiqueta: 'Sin RA', raMin: 0, raMax: 0 },
  { valor: 'menos5', etiqueta: 'Menos de 5', raMin: 0, raMax: MIN_RA - 1 },
  { valor: 'de5a7', etiqueta: 'De 5 a 7', raMin: MIN_RA, raMax: MAX_RA },
  { valor: 'mas7', etiqueta: 'Más de 7', raMin: MAX_RA + 1 },
] as const;

type RangoRa = (typeof RANGOS_RA)[number]['valor'];

interface PresentacionEstado {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
}

/** Ícono + texto + color para cada estado: el color nunca va solo (RNF-21). */
export const PRESENTACION_ESTADO: Readonly<Record<EstadoAsignatura, PresentacionEstado>> = {
  BORRADOR: { etiqueta: 'Borrador', variante: 'neutro', icono: 'documento-borrador' },
  ACTIVA: { etiqueta: 'Activa', variante: 'ok', icono: 'check' },
  INACTIVA: { etiqueta: 'Inactiva', variante: 'neutro', icono: 'prohibido' },
};

export const TOOLTIP_ACTIVAR = `Requiere entre ${MIN_RA} y ${MAX_RA} RA asociados`;

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

type ResultadoCarga = { lista: Asignatura[] } | { error: MensajeError };

const RETARDO_BUSQUEDA_MS = 300;
const DURACION_AVISO_MS = 6000;

/**
 * Pestaña «Materias» del Catálogo académico (RF-03a a RF-03d): listado con búsqueda y filtros,
 * registro y modificación en un modal, consulta en panel lateral, y activar, inactivar y
 * reactivar. Reactivar una INACTIVA es una decisión del equipo de asignaturas (el SRS 3.2.3d solo
 * define Borrador → Activa): el backend restaura los RA inactivados con ella.
 *
 * Cada cambio de filtro dispara una consulta nueva y `switchMap` cancela la anterior, para que
 * una respuesta lenta no pise a una más reciente. La autorización real la hace el backend.
 */
@Component({
  selector: 'app-materias-tab',
  imports: [AsignaturaFormDialog, ChipEstado, DialogoConfirmacion, Icono, PanelLateral],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './materias-tab.html',
  styleUrl: './materias-tab.scss',
})
export class MateriasTab {
  private readonly service = inject(AsignaturaService);
  private readonly programasService = inject(ProgramaOpcionesService);
  private readonly destroyRef = inject(DestroyRef);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  protected readonly rangos = RANGOS_RA;
  protected readonly presentacion = PRESENTACION_ESTADO;
  protected readonly tooltipActivar = TOOLTIP_ACTIVAR;
  protected readonly puedeActivarse = puedeActivarse;

  // ── Filtros ───────────────────────────────────────────────────────
  protected readonly texto = signal('');
  protected readonly programaId = signal('');
  protected readonly rango = signal<RangoRa>('todas');
  private readonly recargas = signal(0);

  /** El buscador espera 300 ms sin teclear antes de consultar; los selectores aplican ya. */
  private readonly textoAplicado = toSignal(
    toObservable(this.texto).pipe(
      debounceTime(RETARDO_BUSQUEDA_MS),
      map((texto) => texto.trim()),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );

  private readonly filtros = computed<FiltrosAsignaturas>(() => {
    const rango = RANGOS_RA.find((r) => r.valor === this.rango());
    return {
      texto: this.textoAplicado() || undefined,
      programaId: this.programaId() || undefined,
      raMin: rango && 'raMin' in rango ? rango.raMin : undefined,
      raMax: rango && 'raMax' in rango ? rango.raMax : undefined,
    };
  });

  protected readonly hayFiltros = computed(
    () => !!this.textoAplicado() || !!this.programaId() || this.rango() !== 'todas',
  );

  // ── Datos y estado de la vista ────────────────────────────────────
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly asignaturas = signal<Asignatura[]>([]);
  protected readonly programas = signal<ProgramaOpcion[]>([]);
  protected readonly aviso = signal<Aviso | null>(null);

  protected readonly activandoId = signal<string | null>(null);
  protected readonly consultada = signal<Asignatura | null>(null);
  protected readonly aInactivar = signal<Asignatura | null>(null);
  protected readonly inactivando = signal(false);
  protected readonly errorInactivar = signal<string | null>(null);

  protected readonly formularioAbierto = signal(false);
  /** Materia en edición; null cuando el formulario registra una nueva. */
  protected readonly enEdicion = signal<Asignatura | null>(null);

  protected readonly tituloInactivar = computed(() => {
    const asignatura = this.aInactivar();
    return asignatura ? `¿Inactivar «${asignatura.nombre}»?` : '';
  });

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizadorAviso));

    // Si el listado de programas falla, el filtro degrada a solo «Todos».
    this.programasService
      .listar()
      .pipe(
        catchError(() => of([] as ProgramaOpcion[])),
        takeUntilDestroyed(),
      )
      .subscribe((programas) => this.programas.set(programas));

    const consulta = computed(() => ({ filtros: this.filtros(), recarga: this.recargas() }));
    toObservable(consulta)
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.errorCarga.set(null);
        }),
        switchMap(({ filtros }) =>
          this.service.listar(filtros).pipe(
            map((lista): ResultadoCarga => ({ lista })),
            catchError((error: unknown) => of<ResultadoCarga>({ error: mensajeDeError(error) })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        if ('lista' in resultado) {
          this.asignaturas.set(resultado.lista);
        } else {
          this.errorCarga.set(resultado.error);
        }
        this.cargando.set(false);
      });
  }

  // ── Filtros ───────────────────────────────────────────────────────
  protected alEscribir(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
  }

  protected alCambiarPrograma(evento: Event): void {
    this.programaId.set((evento.target as HTMLSelectElement).value);
  }

  protected alCambiarRango(evento: Event): void {
    this.rango.set((evento.target as HTMLSelectElement).value as RangoRa);
  }

  protected limpiarFiltros(): void {
    this.texto.set('');
    this.programaId.set('');
    this.rango.set('todas');
  }

  protected recargar(): void {
    this.recargas.update((n) => n + 1);
  }

  // ── Registrar y modificar ─────────────────────────────────────────
  protected abrirRegistro(): void {
    this.enEdicion.set(null);
    this.formularioAbierto.set(true);
  }

  protected abrirEdicion(asignatura: Asignatura): void {
    this.enEdicion.set(asignatura);
    this.formularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  protected alGuardar({ asignatura, modo }: ResultadoFormulario): void {
    this.formularioAbierto.set(false);
    this.mostrarAviso({
      texto:
        modo === 'crear'
          ? `Materia registrada: ${asignatura.nombre}. Queda en estado Borrador.`
          : `Materia actualizada: ${asignatura.nombre}.`,
      tono: 'ok',
    });
    this.recargar();
  }

  // ── Consultar ─────────────────────────────────────────────────────
  protected consultar(asignatura: Asignatura): void {
    this.consultada.set(asignatura);
  }

  protected cerrarConsulta(): void {
    this.consultada.set(null);
  }

  // ── Activar ───────────────────────────────────────────────────────
  protected activar(asignatura: Asignatura): void {
    // El botón usa aria-disabled (no disabled) para poder recibir foco y mostrar el motivo:
    // por eso la acción se bloquea aquí, también para Enter.
    if (!puedeActivarse(asignatura) || this.activandoId()) {
      return;
    }
    this.activandoId.set(asignatura.id);
    this.service
      .activar(asignatura.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizada) => {
          this.activandoId.set(null);
          this.reemplazar(actualizada);
          this.mostrarAviso({ texto: `Materia activada: ${actualizada.nombre}.`, tono: 'ok' });
        },
        error: (error: unknown) => {
          this.activandoId.set(null);
          this.mostrarAviso({ texto: mensajeDeError(error).mensaje, tono: 'error' });
          this.recargar();
        },
      });
  }

  // ── Reactivar (INACTIVA → ACTIVA) ──────────────────────────────────
  /** Siempre habilitado: el backend restaura los RA y valida el rango de 5 a 7. */
  protected reactivar(asignatura: Asignatura): void {
    if (this.activandoId()) {
      return;
    }
    this.activandoId.set(asignatura.id);
    this.service
      .activar(asignatura.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizada) => {
          this.activandoId.set(null);
          this.reemplazar(actualizada);
          this.mostrarAviso({
            texto: `Materia reactivada: ${actualizada.nombre}. Se restauraron sus RA.`,
            tono: 'ok',
          });
        },
        error: (error: unknown) => {
          this.activandoId.set(null);
          this.mostrarAviso({ texto: mensajeDeError(error).mensaje, tono: 'error' });
          this.recargar();
        },
      });
  }

  // ── Inactivar ─────────────────────────────────────────────────────
  protected pedirInactivar(asignatura: Asignatura): void {
    this.errorInactivar.set(null);
    this.aInactivar.set(asignatura);
  }

  protected cancelarInactivar(): void {
    this.aInactivar.set(null);
    this.errorInactivar.set(null);
  }

  protected confirmarInactivar(): void {
    const asignatura = this.aInactivar();
    if (!asignatura || this.inactivando()) {
      return;
    }
    this.inactivando.set(true);
    this.errorInactivar.set(null);
    this.service
      .inactivar(asignatura.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (actualizada) => {
          this.inactivando.set(false);
          this.aInactivar.set(null);
          this.reemplazar(actualizada);
          this.mostrarAviso({ texto: `Materia inactivada: ${actualizada.nombre}.`, tono: 'ok' });
        },
        error: (error: unknown) => {
          this.inactivando.set(false);
          this.errorInactivar.set(mensajeDeError(error).mensaje);
          this.recargar();
        },
      });
  }

  // ── Avisos ────────────────────────────────────────────────────────
  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  private mostrarAviso(aviso: Aviso): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(aviso);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }

  private reemplazar(actualizada: Asignatura): void {
    this.asignaturas.update((lista) =>
      lista.map((a) => (a.id === actualizada.id ? actualizada : a)),
    );
    if (this.consultada()?.id === actualizada.id) {
      this.consultada.set(actualizada);
    }
  }
}
