import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Íconos del módulo de semestres. */
export type NombreIconoSemestre =
  | 'plus'
  | 'check'
  | 'x'
  | 'calendar'
  | 'circle-check'
  | 'circle-minus'
  | 'circle-alert'
  | 'rotate-ccw';

/**
 * Íconos lineales del módulo de semestres, con la geometría exacta de Lucide
 * (viewBox 24, trazo 2, extremos redondeados), tal como pide la guía visual.
 *
 * Se dibujan en la plantilla, sin dependencia nueva: Lucide React no aplica a Angular
 * y `lucide-angular` agregaría un paquete solo para ocho íconos (RNF-08).
 * Siempre decorativos: el significado lo da el texto que los acompaña (RNF-21).
 */
@Component({
  selector: 'app-semestre-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="tamano()"
      [attr.height]="tamano()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (nombre()) {
        @case ('plus') {
          <svg:path d="M5 12h14" />
          <svg:path d="M12 5v14" />
        }
        @case ('check') {
          <svg:path d="M20 6 9 17l-5-5" />
        }
        @case ('x') {
          <svg:path d="M18 6 6 18" />
          <svg:path d="m6 6 12 12" />
        }
        @case ('calendar') {
          <svg:path d="M8 2v4" />
          <svg:path d="M16 2v4" />
          <svg:rect width="18" height="18" x="3" y="4" rx="2" />
          <svg:path d="M3 10h18" />
        }
        @case ('circle-check') {
          <svg:circle cx="12" cy="12" r="10" />
          <svg:path d="m9 12 2 2 4-4" />
        }
        @case ('circle-minus') {
          <svg:circle cx="12" cy="12" r="10" />
          <svg:path d="M8 12h8" />
        }
        @case ('circle-alert') {
          <svg:circle cx="12" cy="12" r="10" />
          <svg:line x1="12" x2="12" y1="8" y2="12" />
          <svg:line x1="12" x2="12.01" y1="16" y2="16" />
        }
        @case ('rotate-ccw') {
          <svg:path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <svg:path d="M3 3v5h5" />
        }
      }
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
export class SemestreIcono {
  readonly nombre = input.required<NombreIconoSemestre>();
  readonly tamano = input(16);
}
