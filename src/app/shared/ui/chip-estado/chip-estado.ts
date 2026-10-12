import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icono } from '../icono/icono';

export type VarianteChip = 'ok' | 'neutro' | 'advertencia' | 'peligro';

/**
 * Etiqueta de estado: ícono + texto + color, para que el color nunca vaya solo (RNF-21).
 * El ícono es decorativo; el texto es el que nombra el estado.
 */
@Component({
  selector: 'app-chip-estado',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chip-estado.html',
  styleUrl: './chip-estado.scss',
})
export class ChipEstado {
  readonly etiqueta = input.required<string>();
  readonly variante = input<VarianteChip>('neutro');
  /** Nombre del ícono en el catálogo de `app-icono`; vacío para no mostrar ícono. */
  readonly icono = input('');
}
