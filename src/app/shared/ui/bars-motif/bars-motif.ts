import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Isotipo de SIGRA: tres barras ascendentes con el círculo teal de verificación
 * (especificación visual §4.2). Se usa en el sidebar y en los estados vacíos.
 *
 * Es decorativo: va con `aria-hidden`, nunca aporta el único texto de un control.
 */
@Component({
  selector: 'app-bars-motif',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="8" fill="#1B3A5C" />
      <rect x="5" y="18" width="6" height="9" rx="1.5" fill="white" fill-opacity="0.7" />
      <rect x="13" y="12" width="6" height="15" rx="1.5" fill="white" fill-opacity="0.85" />
      <rect x="21" y="6" width="6" height="21" rx="1.5" fill="white" />
      <circle cx="27" cy="5" r="5" fill="#16B8A0" />
      <path
        d="M24.8 5l1.5 1.5L28.2 4"
        stroke="white"
        stroke-width="1.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class BarsMotif {
  readonly tamano = input(32);
}
