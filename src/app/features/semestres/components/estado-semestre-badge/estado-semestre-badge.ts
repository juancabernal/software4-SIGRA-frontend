import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EstadoSemestre } from '../../models/semestre.model';

/**
 * Badge de estado del semestre. Combina color, ícono y texto para no depender
 * solo del color (RNF-21). El estado lo calcula el backend.
 */
@Component({
  selector: 'app-estado-semestre-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class.badge--activo]="activo()">
      @if (activo()) {
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Activo
      } @else {
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M4.5 11.5l7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        Inactivo
      }
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      border: 1px solid var(--sem-na-line, #e2e8f0);
      background: var(--sem-na-bg, #f8fafc);
      color: var(--sem-na, #475569);
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }
    .badge--activo {
      border-color: var(--sem-ok-line, #a7f3d0);
      background: var(--sem-ok-bg, #ecfdf5);
      color: var(--sem-ok, #047857);
    }
  `,
})
export class EstadoSemestreBadge {
  readonly estado = input.required<EstadoSemestre>();
  protected readonly activo = computed(() => this.estado() === 'ACTIVO');
}
