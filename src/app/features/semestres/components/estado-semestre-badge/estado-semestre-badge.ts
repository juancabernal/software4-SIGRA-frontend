import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EstadoSemestre } from '../../models/semestre.model';
import { SemestreIcono } from '../semestre-icono/semestre-icono';

/**
 * Badge de estado del semestre: píldora con fondo pastel, texto semántico e ícono
 * lineal. Combina color, ícono y texto para no depender solo del color (RNF-21).
 * El estado lo calcula el backend.
 */
@Component({
  selector: 'app-estado-semestre-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SemestreIcono],
  template: `
    <span class="badge" [class.badge--activo]="activo()">
      @if (activo()) {
        <app-semestre-icono nombre="circle-check" [tamano]="13" />
        Activo
      } @else {
        <app-semestre-icono nombre="circle-minus" [tamano]="13" />
        Inactivo
      }
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.2rem 0.625rem;
      border-radius: 999px;
      background: var(--sem-neutral-bg, #f1f5f9);
      color: var(--sem-muted, #64748b);
      font-family: var(--sem-font-titulo, Manrope, system-ui, sans-serif);
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }
    .badge--activo {
      background: var(--sem-ok-bg, #e6f8f6);
      color: var(--sem-ok, #16b8a0);
    }
  `,
})
export class EstadoSemestreBadge {
  readonly estado = input.required<EstadoSemestre>();
  protected readonly activo = computed(() => this.estado() === 'ACTIVO');
}
