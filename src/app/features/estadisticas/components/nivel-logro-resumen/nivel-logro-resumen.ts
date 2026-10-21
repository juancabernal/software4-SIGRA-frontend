import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { BadgeNivelLogro } from '../../../../shared/ui/badge-nivel-logro/badge-nivel-logro';
import { Icono } from '../../../../shared/ui/icono/icono';
import {
  describirRango,
  formatearFechaCalculo,
  formatearNota,
  formatearPorcentaje,
  intervaloRango,
} from '../../models/nivel-logro-formato';
import {
  DistribucionNivelLogro,
  EstadisticasResultadoAprendizaje,
  NIVELES_LOGRO,
  NivelLogro,
  RangoNivelLogro,
} from '../../models/nivel-logro.model';

/**
 * Qué se muestra en lugar de la distribución cuando nadie tiene nivel calculado. Los textos
 * «Sin evaluar» y «sin datos suficientes para calcular» son los de la especificación (RF-14, RF-15).
 */
type Situacion = 'sin-calcular' | 'sin-estudiantes' | 'sin-evaluar' | 'sin-datos' | 'con-evaluados';

/**
 * RF-14 / RF-15: resumen del nivel de logro de un RA en un semestre — totales, promedio y
 * distribución por los 4 niveles. Solo presenta: la carga y el recálculo los coordina la página
 * de estadísticas, que también muestra la conclusión de RF-16 debajo.
 */
@Component({
  selector: 'app-nivel-logro-resumen',
  imports: [BadgeNivelLogro, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nivel-logro-resumen.html',
  styleUrl: './nivel-logro-resumen.scss',
})
export class NivelLogroResumen {
  readonly estadisticas = input.required<EstadisticasResultadoAprendizaje>();
  /** Catálogo de niveles; vacío si no cargó (la distribución se muestra igual, sin rangos). */
  readonly rangos = input<readonly RangoNivelLogro[]>([]);
  readonly recalculando = input(false);
  /** Pide forzar el cálculo; lo ofrece cuando el RA nunca se ha calculado. */
  readonly recalcular = output<void>();

  protected readonly formatearNota = formatearNota;
  protected readonly formatearPorcentaje = formatearPorcentaje;
  protected readonly formatearFechaCalculo = formatearFechaCalculo;
  protected readonly describirRango = describirRango;
  protected readonly intervaloRango = intervaloRango;

  protected readonly situacion = computed<Situacion>(() => {
    const e = this.estadisticas();
    if (e.fechaCalculo == null) {
      return 'sin-calcular';
    }
    if (e.evaluados > 0) {
      return 'con-evaluados';
    }
    if (e.totalEstudiantes === 0) {
      return 'sin-estudiantes';
    }
    return e.sinDatosSuficientes > 0 ? 'sin-datos' : 'sin-evaluar';
  });

  /** Siempre los 4 niveles en orden, aunque el backend omitiera alguno. */
  protected readonly distribucion = computed<DistribucionNivelLogro[]>(() => {
    const lista = this.estadisticas().distribucion ?? [];
    return NIVELES_LOGRO.map(
      (nivel) => lista.find((d) => d.nivel === nivel) ?? { nivel, cantidad: 0, porcentaje: 0 },
    );
  });

  protected rangoDe(nivel: NivelLogro): RangoNivelLogro | null {
    return this.rangos().find((r) => r.nivel === nivel) ?? null;
  }

  /** Ancho de la barra: el porcentaje sobre los evaluados, acotado a 0 – 100. */
  protected anchoBarra(porcentaje: number): number {
    return Math.min(100, Math.max(0, porcentaje));
  }

  protected pedirRecalculo(): void {
    if (!this.recalculando()) {
      this.recalcular.emit();
    }
  }
}
