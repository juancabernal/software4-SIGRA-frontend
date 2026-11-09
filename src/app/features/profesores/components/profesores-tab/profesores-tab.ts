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
import { AsignaturaProfesor, Profesor } from '../../models/profesor.model';
import { ProfesorService } from '../../services/profesor.service';
import { ProfesorFormDialog } from '../profesor-form-dialog/profesor-form-dialog';

interface PresentacionEstado {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
}

/** Ícono + texto + color para cada estado: el color nunca va solo (RNF-21). */
const PRESENTACION_ESTADO: Readonly<Record<string, PresentacionEstado>> = {
  ACTIVO: { etiqueta: 'Activo', variante: 'ok', icono: 'check' },
  INACTIVO: { etiqueta: 'Inactivo', variante: 'neutro', icono: 'prohibido' },
};

const TOOLTIP_INACTIVAR = 'No se puede inactivar: el profesor tiene asignaturas activas asociadas';

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

type ResultadoCarga = { lista: Profesor[] } | { error: MensajeError };
type Dialogo = { tipo: 'registrar' } | { tipo: 'modificar'; profesor: Profesor } | null;

const RETARDO_BUSQUEDA_MS = 300;
const DURACION_AVISO_MS = 6000;

/**
 * Pestaña «Profesores» del Catálogo académico (RF-01): listado con búsqueda, registrar,
 * modificar, consultar (con sus asignaturas asociadas) e inactivar. Calcada al patrón de
 * «Materias» (listado/filtros/panel/confirmación) y al diálogo con Reactive Forms de «Semestres»,
 * ya que Profesores sí tiene las 4 operaciones completas.
 */
@Component({
  selector: 'app-profesores-tab',
  imports: [ChipEstado, DialogoConfirmacion, Icono, PanelLateral, ProfesorFormDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profesores-tab.html',
  styleUrl: './profesores-tab.scss',
})
export class ProfesoresTab {
  private readonly service = inject(ProfesorService);
  private readonly destroyRef = inject(DestroyRef);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  protected readonly presentacion = PRESENTACION_ESTADO;
  protected readonly tooltipInactivar = TOOLTIP_INACTIVAR;

  // ── Filtro ────────────────────────────────────────────────────────
  protected readonly texto = signal('');
  private readonly recargas = signal(0);

  /** El buscador espera 300 ms sin teclear antes de consultar (único filtro del backend). */
  private readonly textoAplicado = toSignal(
    toObservable(this.texto).pipe(
      debounceTime(RETARDO_BUSQUEDA_MS),
      map((texto) => texto.trim()),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );

  protected readonly hayFiltros = computed(() => !!this.textoAplicado());

  // ── Datos y estado de la vista ────────────────────────────────────
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly profesores = signal<Profesor[]>([]);
  protected readonly aviso = signal<Aviso | null>(null);

  protected readonly dialogo = signal<Dialogo>(null);

  protected readonly consultado = signal<Profesor | null>(null);
  protected readonly asignaturasConsultado = signal<AsignaturaProfesor[]>([]);
  protected readonly cargandoAsignaturas = signal(false);
  protected readonly errorAsignaturas = signal<MensajeError | null>(null);

  protected readonly aInactivar = signal<Profesor | null>(null);
  protected readonly inactivando = signal(false);
  protected readonly errorInactivar = signal<string | null>(null);

  protected readonly tituloInactivar = computed(() => {
    const profesor = this.aInactivar();
    return profesor ? `¿Inactivar a «${profesor.nombreCompleto}»?` : '';
  });

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizadorAviso));

    const consulta = computed(() => ({ filtro: this.textoAplicado(), recarga: this.recargas() }));
    toObservable(consulta)
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.errorCarga.set(null);
        }),
        switchMap(({ filtro }) =>
          this.service.listar(filtro).pipe(
            map((lista): ResultadoCarga => ({ lista })),
            catchError((error: unknown) => of<ResultadoCarga>({ error: mensajeDeError(error) })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        if ('lista' in resultado) {
          this.profesores.set(resultado.lista);
        } else {
          this.errorCarga.set(resultado.error);
        }
        this.cargando.set(false);
      });
  }

  // ── Filtro ────────────────────────────────────────────────────────
  protected alEscribir(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
  }

  protected limpiarFiltros(): void {
    this.texto.set('');
  }

  protected recargar(): void {
    this.recargas.update((n) => n + 1);
  }

  // ── Registrar / Modificar ────────────────────────────────────────
  protected abrirRegistro(): void {
    this.dialogo.set({ tipo: 'registrar' });
  }

  protected abrirModificacion(profesor: Profesor): void {
    this.dialogo.set({ tipo: 'modificar', profesor });
  }

  protected cerrarDialogoFormulario(): void {
    this.dialogo.set(null);
  }

  protected alGuardar(profesor: Profesor): void {
    const eraModificar = this.dialogo()?.tipo === 'modificar';
    this.dialogo.set(null);
    this.mostrarAviso({
      texto: eraModificar
        ? `Profesor modificado: ${profesor.nombreCompleto}.`
        : `Profesor registrado: ${profesor.nombreCompleto}.`,
      tono: 'ok',
    });
    if (this.consultado()?.id === profesor.id) {
      this.consultado.set(profesor);
    }
    this.recargar();
  }

  // ── Consultar ─────────────────────────────────────────────────────
  protected consultar(profesor: Profesor): void {
    this.consultado.set(profesor);
    this.asignaturasConsultado.set([]);
    this.errorAsignaturas.set(null);
    this.cargandoAsignaturas.set(true);
    this.service
      .consultarAsignaturas(profesor.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (asignaturas) => {
          this.asignaturasConsultado.set(asignaturas);
          this.cargandoAsignaturas.set(false);
        },
        error: (error: unknown) => {
          this.errorAsignaturas.set(mensajeDeError(error));
          this.cargandoAsignaturas.set(false);
        },
      });
  }

  protected cerrarConsulta(): void {
    this.consultado.set(null);
  }

  // ── Inactivar ─────────────────────────────────────────────────────
  protected pedirInactivar(profesor: Profesor): void {
    if (profesor.tieneAsignacionesActivas) {
      return;
    }
    this.errorInactivar.set(null);
    this.aInactivar.set(profesor);
  }

  protected cancelarInactivar(): void {
    this.aInactivar.set(null);
    this.errorInactivar.set(null);
  }

  protected confirmarInactivar(): void {
    const profesor = this.aInactivar();
    if (!profesor || this.inactivando()) {
      return;
    }
    this.inactivando.set(true);
    this.errorInactivar.set(null);
    this.service
      .inactivar(profesor.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.inactivando.set(false);
          this.aInactivar.set(null);
          // El DELETE no devuelve cuerpo: se actualiza el estado localmente y se recarga
          // para confirmar contra el backend (igual que el resto del catálogo tras un error).
          this.reemplazar({ ...profesor, estado: 'INACTIVO' });
          this.mostrarAviso({
            texto: `Profesor inactivado: ${profesor.nombreCompleto}.`,
            tono: 'ok',
          });
          this.recargar();
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

  private reemplazar(actualizado: Profesor): void {
    this.profesores.update((lista) =>
      lista.map((p) => (p.id === actualizado.id ? actualizado : p)),
    );
    if (this.consultado()?.id === actualizado.id) {
      this.consultado.set(actualizado);
    }
  }
}
