import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Paginador } from '../../../../shared/ui/paginador/paginador';
import {
  ETIQUETA_ACCION,
  ETIQUETA_ENTIDAD,
  FiltrosAuditoria,
  PaginaAuditoria,
  RegistroAuditoria,
  TIPOS_ENTIDAD,
  TipoEntidadAuditoria,
} from '../../models/auditoria.model';
import { AuditoriaService } from '../../services/auditoria.service';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; pagina: PaginaAuditoria }
  | { estado: 'error'; error: MensajeError };

const TAMANO_INICIAL = 10;

/**
 * Reporte del historial de auditoría para el ADMINISTRADOR (RF-21c): todos los eventos con fecha y
 * hora, acción, entidad afectada, usuario y detalle, del más reciente al más antiguo. Se filtra por
 * rango de fechas y tipo de entidad, y la paginación la hace el backend para no cargar todo el
 * historial (RNF de rendimiento). Es solo lectura: el historial no se puede modificar ni borrar.
 */
@Component({
  selector: 'app-historial-auditoria-page',
  imports: [Icono, Paginador],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial-auditoria-page.html',
  styleUrl: './historial-auditoria-page.scss',
})
export class HistorialAuditoriaPage {
  private readonly service = inject(AuditoriaService);

  protected readonly tiposEntidad = TIPOS_ENTIDAD;
  protected readonly etiquetaEntidad = ETIQUETA_ENTIDAD;
  protected readonly etiquetaAccion = ETIQUETA_ACCION;

  // ── Filtros en edición (se aplican con el botón) ─────────────────────
  protected readonly desdeEditado = signal('');
  protected readonly hastaEditado = signal('');
  protected readonly tipoEditado = signal<TipoEntidadAuditoria | ''>('');
  protected readonly errorFiltro = signal<string | null>(null);

  // ── Consulta vigente ─────────────────────────────────────────────────
  private readonly filtros = signal<FiltrosAuditoria>({});
  /** Página del paginador, empezando en 1; al backend se envía restando 1. */
  protected readonly pagina = signal(1);
  protected readonly tamano = signal(TAMANO_INICIAL);
  private readonly recarga = signal(0);

  private readonly consulta = computed(() => ({
    filtros: this.filtros(),
    pagina: this.pagina(),
    tamano: this.tamano(),
    recarga: this.recarga(),
  }));

  private readonly carga = toSignal(
    toObservable(this.consulta).pipe(
      switchMap(({ filtros, pagina, tamano }) =>
        this.service.consultar(filtros, pagina - 1, tamano).pipe(
          map((resultado): Carga => ({ estado: 'listo', pagina: resultado })),
          catchError((error: unknown) => of<Carga>({ estado: 'error', error: mensajeDeError(error) })),
          startWith<Carga>({ estado: 'cargando' }),
        ),
      ),
    ),
    { initialValue: { estado: 'cargando' } as Carga },
  );

  protected readonly estado = computed(() => this.carga().estado);
  protected readonly error = computed(() => {
    const carga = this.carga();
    return carga.estado === 'error' ? carga.error : null;
  });
  protected readonly resultado = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.pagina : null;
  });
  protected readonly registros = computed<RegistroAuditoria[]>(() => this.resultado()?.contenido ?? []);
  protected readonly total = computed(() => this.resultado()?.totalElementos ?? 0);
  protected readonly hayFiltros = computed(() => {
    const f = this.filtros();
    return !!(f.desde || f.hasta || f.tipoEntidad);
  });

  protected alCambiarDesde(evento: Event): void {
    this.desdeEditado.set((evento.target as HTMLInputElement).value);
  }

  protected alCambiarHasta(evento: Event): void {
    this.hastaEditado.set((evento.target as HTMLInputElement).value);
  }

  protected alCambiarTipo(evento: Event): void {
    this.tipoEditado.set((evento.target as HTMLSelectElement).value as TipoEntidadAuditoria | '');
  }

  protected aplicarFiltros(): void {
    const desde = this.desdeEditado();
    const hasta = this.hastaEditado();
    // Las fechas AAAA-MM-DD se comparan bien como texto. El backend valida lo mismo (400).
    if (desde && hasta && desde > hasta) {
      this.errorFiltro.set('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }
    this.errorFiltro.set(null);
    this.filtros.set({
      desde: desde || undefined,
      hasta: hasta || undefined,
      tipoEntidad: this.tipoEditado() || undefined,
    });
    this.pagina.set(1);
  }

  protected limpiarFiltros(): void {
    this.desdeEditado.set('');
    this.hastaEditado.set('');
    this.tipoEditado.set('');
    this.errorFiltro.set(null);
    this.filtros.set({});
    this.pagina.set(1);
  }

  protected reintentar(): void {
    this.recarga.update((n) => n + 1);
  }

  protected alCambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  protected alCambiarTamano(tamano: number): void {
    this.tamano.set(tamano);
    this.pagina.set(1);
  }

  /** «2026-10-20T14:35:12.123» → «20/10/2026 14:35:12». */
  protected formatearFechaHora(fechaHora: string): string {
    const [fecha, hora = ''] = fechaHora.split('T');
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio} ${hora.slice(0, 8)}`.trim();
  }

  /** Los UUID se muestran abreviados; el completo queda en el title de la celda. */
  protected abreviar(id: string | null): string {
    return id ? id.slice(0, 8) : '—';
  }
}