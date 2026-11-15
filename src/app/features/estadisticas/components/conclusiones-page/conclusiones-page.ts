import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, map, of, skip, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { refrescoAutomatico } from '../../../../core/util/refresco-automatico';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { AccionMejoraFormDialog } from '../../../mejoras/components/accion-mejora-form-dialog/accion-mejora-form-dialog';
import { Conclusion, ConclusionEstado } from '../../models/conclusion.model';
import { ConclusionService } from '../../services/conclusion.service';
import {
  EstadisticasFiltros,
  FILTROS_ESTADISTICAS_VACIOS,
  FiltrosEstadisticas,
} from '../estadisticas-filtros/estadisticas-filtros';

type CargaConclusion =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; resultado: ConclusionEstado }
  | { estado: 'error'; error: MensajeError };

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

const DURACION_AVISO_MS = 6000;

interface SolicitudConclusion extends FiltrosEstadisticas {
  silenciosa: boolean;
}

interface ResultadoConsultaConclusion {
  carga: CargaConclusion;
  silenciosa: boolean;
}

/**
 * «Conclusiones» (Mantis 0000048): el estado de la conclusión (RF-16) del RA y el semestre elegidos:
 * Vigente (desempeño insuficiente sin atender), Atendida (ya tiene acción de mejora), Satisfactorio
 * o datos insuficientes. Desde una conclusión vigente se registra la acción de mejora (RF-17).
 * Consulta sola al completar los filtros.
 */
@Component({
  selector: 'app-conclusiones-page',
  imports: [AccionMejoraFormDialog, ChipEstado, EstadisticasFiltros, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conclusiones-page.html',
  styleUrls: ['../estadisticas-comun.scss', './conclusiones-page.scss'],
})
export class ConclusionesPage {
  private readonly conclusionService = inject(ConclusionService);

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

  private readonly solicitudConsulta = new Subject<SolicitudConclusion>();
  protected readonly consulta = signal<CargaConclusion>({ estado: 'inactivo' });

  protected readonly dialogoAbierto = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizadorAviso));

    this.solicitudConsulta
      .pipe(
        switchMap(
          ({
            asignaturaId,
            resultadoAprendizajeId,
            semestreId,
            silenciosa,
          }): Observable<ResultadoConsultaConclusion> => {
            if (!asignaturaId || !resultadoAprendizajeId || !semestreId) {
              return EMPTY;
            }
            const carga = this.conclusionService
              .consultarEstado(resultadoAprendizajeId, semestreId)
              .pipe(
                map((resultado): ResultadoConsultaConclusion => ({
                  carga: { estado: 'listo', resultado },
                  silenciosa,
                })),
                catchError((error: unknown): Observable<ResultadoConsultaConclusion> =>
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
                  startWith<ResultadoConsultaConclusion>({
                    carga: { estado: 'cargando' },
                    silenciosa,
                  }),
                );
          },
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ carga }) => this.consulta.set(carga));

    toObservable(this.filtros)
      .pipe(takeUntilDestroyed())
      .subscribe((filtros) => this.emitirConsulta(filtros));

    toObservable(this.refresco)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => {
        if (this.dialogoAbierto()) {
          return;
        }
        this.refrescarConclusionEnSegundoPlano();
      });
  }

  /** Vuelve a consultar el estado sin mostrar "cargando" ni borrar lo que ya hay en pantalla. */
  private refrescarConclusionEnSegundoPlano(): void {
    if (
      !this.puedeConsultar() ||
      this.consulta().estado === 'inactivo' ||
      this.consulta().estado === 'cargando'
    ) {
      return;
    }
    this.emitirConsulta(this.filtros(), true);
  }

  private emitirConsulta(filtros: FiltrosEstadisticas, silenciosa = false): void {
    this.solicitudConsulta.next({ ...filtros, silenciosa });
  }

  /** Al cambiar la selección se descarta lo consultado, para no mostrar datos de otro RA. */
  protected alCambiarFiltros(filtros: FiltrosEstadisticas): void {
    this.consulta.set({ estado: 'inactivo' });
    this.filtros.set(filtros);
  }

  protected consultar(): void {
    if (!this.puedeConsultar()) {
      return;
    }
    this.emitirConsulta(this.filtros());
  }

  protected consultaEstado(): CargaConclusion['estado'] {
    return this.consulta().estado;
  }

  protected consultaError(): MensajeError | null {
    const consulta = this.consulta();
    return consulta.estado === 'error' ? consulta.error : null;
  }

  /** Resultado completo de RF-16 (estado + conclusión + cifras), cuando la consulta ya respondió. */
  protected consultaResultado(): ConclusionEstado | null {
    const consulta = this.consulta();
    return consulta.estado === 'listo' ? consulta.resultado : null;
  }

  protected consultaConclusion(): Conclusion | null {
    const consulta = this.consulta();
    return consulta.estado === 'listo' ? consulta.resultado.conclusion : null;
  }

  protected crearAccionDeMejora(): void {
    this.dialogoAbierto.set(true);
  }

  protected alGuardarAccionMejora(): void {
    this.dialogoAbierto.set(false);
    this.mostrarAviso('Acción de mejora registrada correctamente.');
    this.consultar();
  }

  protected alCancelarAccionMejora(): void {
    this.dialogoAbierto.set(false);
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

  /** Cantidad de estudiantes en nivel Bajo o Medio (por debajo del nivel esperado). */
  protected debajoDelNivel(conclusion: Conclusion): number {
    return (conclusion.enNivelBajo ?? 0) + (conclusion.enNivelMedio ?? 0);
  }

  /** Redacta la comparación con el semestre anterior, o indica que es la primera conclusión del RA. */
  protected comparacionSemestreAnterior(conclusion: Conclusion): string {
    const anterior = conclusion.porcentajeSemestreAnterior;
    if (anterior == null) {
      return 'Es la primera vez que este RA genera una conclusión.';
    }
    const actual = conclusion.porcentajeInsuficiente;
    const semestre = conclusion.semestreAnteriorCodigo ?? '';
    if (actual > anterior) {
      return `Empeoró frente al semestre ${semestre} (${anterior}%).`;
    }
    if (actual < anterior) {
      return `Mejoró frente al semestre ${semestre} (${anterior}%), pero sigue por encima del umbral.`;
    }
    return `Se mantiene igual que en el semestre ${semestre} (${anterior}%).`;
  }
}
