import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  Subject,
  catchError,
  map,
  of,
  skip,
  startWith,
  switchMap,
} from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { refrescoAutomatico } from '../../../../core/util/refresco-automatico';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { presentarRendimiento } from '../../../resultadosaprendizaje/components/resultados-aprendizaje-page/resultados-aprendizaje-page';
import { RendimientoAsignatura } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { marcarRefrescoSilencioso } from '../../../resultadosaprendizaje/services/consulta-con-refresco';
import { ResultadoAprendizajeService } from '../../../resultadosaprendizaje/services/resultado-aprendizaje.service';
import { EstadisticasResultadoAprendizaje, RangoNivelLogro } from '../../models/nivel-logro.model';
import { NivelLogroService } from '../../services/nivel-logro.service';
import {
  EstadisticasFiltros,
  FILTROS_ESTADISTICAS_VACIOS,
  FiltrosEstadisticas,
} from '../estadisticas-filtros/estadisticas-filtros';
import { NivelLogroResumen } from '../nivel-logro-resumen/nivel-logro-resumen';

type CargaEstadisticas =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; estadisticas: EstadisticasResultadoAprendizaje }
  | { estado: 'error'; error: MensajeError };

type CargaRendimiento =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; datos: RendimientoAsignatura }
  | { estado: 'error' };

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

const DURACION_AVISO_MS = 6000;

interface SolicitudEstadisticas extends FiltrosEstadisticas {
  silenciosa: boolean;
}

interface ResultadoConsultaEstadisticas {
  carga: CargaEstadisticas;
  silenciosa: boolean;
}

/**
 * «Niveles de logro» (Mantis 0000048): nivel de logro y rendimiento del RA elegido en el semestre
 * elegido. Con materia, RA y semestre elegidos consulta sola (RF-14 / RF-15); «Recalcular» fuerza
 * el cálculo del nivel de logro (en operación normal lo dispara el registro de calificaciones).
 */
@Component({
  selector: 'app-niveles-logro-page',
  imports: [ChipEstado, EstadisticasFiltros, Icono, NivelLogroResumen],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './niveles-logro-page.html',
  styleUrls: ['../estadisticas-comun.scss', './niveles-logro-page.scss'],
})
export class NivelesLogroPage {
  private readonly resultadosService = inject(ResultadoAprendizajeService);
  private readonly nivelLogroService = inject(NivelLogroService);

  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;
  protected readonly aviso = signal<Aviso | null>(null);

  private readonly refresco = refrescoAutomatico();

  protected readonly filtros = signal<FiltrosEstadisticas>(FILTROS_ESTADISTICAS_VACIOS);
  protected readonly puedeConsultar = computed(
    () =>
      this.filtros().asignaturaId !== '' &&
      this.filtros().resultadoAprendizajeId !== '' &&
      this.filtros().semestreId !== '',
  );

  private readonly solicitudConsulta = new Subject<SolicitudEstadisticas>();

  // ── Rendimiento del RA elegido en el semestre elegido ────
  private readonly recargaRendimiento = signal(0);
  private readonly refrescoSilencioso = signal(0);

  private readonly disparoRendimiento = computed(() => ({
    id: this.filtros().asignaturaId,
    raId: this.filtros().resultadoAprendizajeId,
    semestreId: this.filtros().semestreId,
    recarga: this.recargaRendimiento(),
    refresco: this.refrescoSilencioso(),
  }));

  /**
   * Con materia, RA y semestre elegidos se muestra el rendimiento de ese RA, sin pedir «Consultar»:
   * el profesor lo necesita para decidir si atenderlo con una acción de mejora. El backend calcula
   * los RA de la materia; aquí solo se muestra el elegido. Un fallo no afecta al resto de la pantalla.
   */
  private readonly cargaRendimiento = toSignal(
    toObservable(this.disparoRendimiento).pipe(
      marcarRefrescoSilencioso(),
      switchMap(({ id, raId, semestreId, silencioso }) => {
        if (!id || !raId || !semestreId) {
          return of<CargaRendimiento>({ estado: 'inactivo' });
        }
        const consulta = this.resultadosService
          .consultarRendimiento(id, semestreId)
          .pipe(map((datos): CargaRendimiento => ({ estado: 'listo', datos })));
        return silencioso
          ? consulta.pipe(catchError(() => EMPTY))
          : consulta.pipe(
              catchError(() => of<CargaRendimiento>({ estado: 'error' })),
              startWith<CargaRendimiento>({ estado: 'cargando' }),
            );
      }),
    ),
    { initialValue: { estado: 'inactivo' } as CargaRendimiento },
  );

  protected readonly rendimientoCargando = computed(
    () => this.cargaRendimiento().estado === 'cargando',
  );
  protected readonly rendimientoConError = computed(
    () => this.cargaRendimiento().estado === 'error',
  );
  protected readonly filasRendimiento = computed(() => {
    const carga = this.cargaRendimiento();
    const elegido = this.filtros().resultadoAprendizajeId;
    return (carga.estado === 'listo' ? carga.datos.resultados : [])
      .filter((r) => r.resultadoAprendizajeId === elegido)
      .map((r) => ({
        id: r.resultadoAprendizajeId,
        codigo: r.codigo,
        presentacion: presentarRendimiento(r),
      }));
  });

  // ── Nivel de logro y estadísticas (RF-14, RF-15) ──────────────────────
  protected readonly cargaEstadisticas = signal<CargaEstadisticas>({ estado: 'inactivo' });
  protected readonly recalculando = signal(false);
  /** Catálogo de rangos; si falla, la distribución se muestra igual, sin la leyenda de rangos. */
  protected readonly rangos = signal<RangoNivelLogro[]>([]);

  protected readonly estadisticas = computed(() => {
    const carga = this.cargaEstadisticas();
    return carga.estado === 'listo' ? carga.estadisticas : null;
  });
  protected readonly errorEstadisticas = computed(() => {
    const carga = this.cargaEstadisticas();
    return carga.estado === 'error' ? carga.error : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizadorAviso));
    this.cargarCatalogoNiveles();

    this.solicitudConsulta
      .pipe(
        switchMap(
          ({
            asignaturaId,
            resultadoAprendizajeId,
            semestreId,
            silenciosa,
          }): Observable<ResultadoConsultaEstadisticas> => {
            if (!asignaturaId || !resultadoAprendizajeId || !semestreId) {
              return EMPTY;
            }
            const carga = this.nivelLogroService
              .consultarEstadisticas(resultadoAprendizajeId, semestreId)
              .pipe(
                map((estadisticas): ResultadoConsultaEstadisticas => ({
                  carga: { estado: 'listo', estadisticas },
                  silenciosa,
                })),
                catchError((error: unknown): Observable<ResultadoConsultaEstadisticas> =>
                  silenciosa
                    ? EMPTY
                    : of({
                        carga: { estado: 'error', error: mensajeDeError(error) },
                        silenciosa,
                      }),
                ),
              );
            return silenciosa
              ? carga
              : carga.pipe(
                  startWith<ResultadoConsultaEstadisticas>({
                    carga: { estado: 'cargando' },
                    silenciosa,
                  }),
                );
          },
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ carga }) => this.cargaEstadisticas.set(carga));

    toObservable(this.filtros)
      .pipe(takeUntilDestroyed())
      .subscribe((filtros) => this.emitirConsulta(filtros));

    toObservable(this.refresco)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => {
        this.refrescoSilencioso.update((n) => n + 1);
        this.refrescarEstadisticasEnSegundoPlano();
      });
  }

  /** Vuelve a consultar el nivel de logro sin mostrar "cargando" ni borrar lo que ya hay en pantalla. */
  private refrescarEstadisticasEnSegundoPlano(): void {
    if (
      !this.puedeConsultar() ||
      this.cargaEstadisticas().estado !== 'listo' ||
      this.recalculando()
    ) {
      return;
    }
    this.emitirConsulta(this.filtros(), true);
  }

  private cargarCatalogoNiveles(): void {
    this.nivelLogroService.consultarCatalogo().subscribe({
      next: (rangos) => this.rangos.set(rangos),
      error: () => {
        // sin catálogo solo se pierde la leyenda de rangos; la distribución se muestra igual
      },
    });
  }

  private emitirConsulta(filtros: FiltrosEstadisticas, silenciosa = false): void {
    this.solicitudConsulta.next({ ...filtros, silenciosa });
  }

  /** Al cambiar la selección se descarta lo consultado, para no mostrar datos de otro RA. */
  protected alCambiarFiltros(filtros: FiltrosEstadisticas): void {
    this.cargaEstadisticas.set({ estado: 'inactivo' });
    this.filtros.set(filtros);
  }

  /** Vuelve a consultar el nivel de logro y el rendimiento del RA elegido. */
  protected consultar(): void {
    if (!this.puedeConsultar()) {
      return;
    }
    this.emitirConsulta(this.filtros());
    this.recargaRendimiento.update((n) => n + 1);
  }

  protected consultarEstadisticas(): void {
    if (!this.puedeConsultar()) {
      return;
    }
    this.emitirConsulta(this.filtros());
  }

  /**
   * Fuerza el recálculo del nivel de logro. La respuesta puede haber generado o cambiado la
   * conclusión (RF-16); se avisa aquí y la ve la página «Conclusiones».
   */
  protected recalcular(): void {
    if (!this.puedeConsultar() || this.recalculando()) {
      return;
    }
    this.recalculando.set(true);
    const { resultadoAprendizajeId, semestreId } = this.filtros();
    this.nivelLogroService.recalcular(resultadoAprendizajeId, semestreId).subscribe({
      next: (respuesta) => {
        this.recalculando.set(false);
        if (this.puedeConsultar()) {
          this.emitirConsulta(this.filtros());
        }
        this.recargaRendimiento.update((n) => n + 1);
        this.mostrarAviso(
          respuesta.conclusion?.generada
            ? 'Nivel de logro recalculado. Se generó una conclusión de desempeño insuficiente.'
            : 'Nivel de logro recalculado correctamente.',
        );
      },
      error: (error: unknown) => {
        this.recalculando.set(false);
        this.mostrarAviso(mensajeDeError(error).mensaje, 'error');
      },
    });
  }

  private mostrarAviso(texto: string, tono: Aviso['tono'] = 'ok'): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set({ texto, tono });
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }

  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }
}
