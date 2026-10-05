import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Catálogo de íconos de trazo del shell y los menús.
 *
 * La especificación visual nombra íconos de `lucide` (§3.8). Aquí se dibujan a mano con el mismo
 * significado para no agregar una dependencia al bundle (RNF-08): el proyecto ya resuelve así sus
 * íconos en `features/semestres/`.
 *
 * Siempre decorativos: el texto del ítem de menú es el que nombra la acción (RNF-21).
 */
const TRAZOS: Readonly<Record<string, string>> = {
  libro:
    'M4 5.5A1.5 1.5 0 015.5 4H10a2 2 0 012 2v13a2 2 0 00-2-2H4zM20 5.5A1.5 1.5 0 0018.5 4H14a2 2 0 00-2 2v13a2 2 0 012-2h6z',
  personas:
    'M16 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18.5V20M13 7.5a3 3 0 11-6 0 3 3 0 016 0M17 4.3a3 3 0 010 5.9M21 20v-1.5a3.5 3.5 0 00-2.6-3.4',
  lista: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  documento: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h4',
  barras: 'M4 20V10M10 20V4M16 20v-7M22 20H3',
  reloj: 'M12 7v5l3.5 2M3.5 12a8.5 8.5 0 1017 0 8.5 8.5 0 00-17 0M3.5 12H2m1.5 0l-1.4-1.6',
  calendario:
    'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1M4 10h16M8.5 3v4M15.5 3v4',
  marcador: 'M5 4.5A1.5 1.5 0 016.5 3h11A1.5 1.5 0 0119 4.5V21l-7-4-7 4z M9 8h6',
  'usuario-ok':
    'M14.5 20v-1.5a3.5 3.5 0 00-3.5-3.5H7a3.5 3.5 0 00-3.5 3.5V20M12.5 7.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0M16.5 12.5l2 2 4-4.5',
  birrete:
    'M2.5 8.5L12 4.5l9.5 4-9.5 4zM6.5 11v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5M20.5 9.5V15',
  torta: 'M12 3.5v8.5h8.5A8.5 8.5 0 0012 3.5M11 21a8.5 8.5 0 01-1-16.9V14h9.9A8.5 8.5 0 0111 21',
  campana: 'M18 9a6 6 0 10-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9M10 19a2.2 2.2 0 004 0',
  cerrar: 'M6 6l12 12M18 6L6 18',
  llave:
    'M14.5 10.5a4 4 0 10-5.3 3.8L3 20.5V22h3l1.5-1.5h2V18.5h1.8l1.5-1.5v-2.2a4 4 0 001.7-4.3M16.5 7.5h.01',
};

@Component({
  selector: 'app-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        [attr.d]="trazo()"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
    }
  `,
})
export class Icono {
  readonly nombre = input.required<string>();
  readonly tamano = input(18);

  protected readonly trazo = computed(() => TRAZOS[this.nombre()] ?? TRAZOS['lista']);
}
