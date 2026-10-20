import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Los 4 niveles de logro del backend (NivelLogro) más los dos estados en que un estudiante aún no
 * tiene nivel: con 1 o 2 calificaciones (SIN_DATOS) o sin ninguna (SIN_EVALUAR).
 */
export type NivelBadge = 'BAJO' | 'MEDIO' | 'ALTO' | 'SOBRESALIENTE' | 'SIN_DATOS' | 'SIN_EVALUAR';

interface Apariencia {
  etiqueta: string;
  trazo: string;
}

/**
 * Cada nivel lleva su propio trazo (flecha abajo, línea, flecha arriba, estrella) para que se
 * distinga sin depender del color. Se dibujan aquí, como en `features/semestres/`, para no agregar
 * entradas al catálogo compartido de `app-icono`.
 */
const APARIENCIA: Readonly<Record<NivelBadge, Apariencia>> = {
  BAJO: { etiqueta: 'Bajo', trazo: 'M12 5v14M6 13l6 6 6-6' },
  MEDIO: { etiqueta: 'Medio', trazo: 'M5 12h14' },
  ALTO: { etiqueta: 'Alto', trazo: 'M12 19V5M6 11l6-6 6 6' },
  SOBRESALIENTE: {
    etiqueta: 'Sobresaliente',
    trazo: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  },
  SIN_DATOS: {
    etiqueta: 'Sin datos suficientes',
    trazo: 'M12 7v5l3.5 2M3.5 12a8.5 8.5 0 1017 0 8.5 8.5 0 00-17 0',
  },
  SIN_EVALUAR: {
    etiqueta: 'Sin evaluar',
    trazo: 'M12 21a9 9 0 100-18 9 9 0 000 18M8 12h8',
  },
};

/**
 * Badge de nivel de logro (RF-14): color + texto + ícono, para que el color nunca vaya solo
 * (RNF-21). El ícono es decorativo; el texto es el que nombra el nivel.
 */
@Component({
  selector: 'app-badge-nivel-logro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badge-nivel-logro.html',
  styleUrl: './badge-nivel-logro.scss',
})
export class BadgeNivelLogro {
  readonly nivel = input.required<NivelBadge>();
  /** Texto alternativo; por omisión, el nombre del nivel. */
  readonly etiqueta = input('');

  protected readonly apariencia = computed(() => APARIENCIA[this.nivel()]);
  protected readonly texto = computed(() => this.etiqueta() || this.apariencia().etiqueta);
  protected readonly clase = computed(
    () => 'badge badge--' + this.nivel().toLowerCase().replace('_', '-'),
  );
}
