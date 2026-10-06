import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';

import { Icono } from '../../ui/icono/icono';

let siguienteId = 0;

/**
 * Panel lateral de solo lectura que entra desde la derecha. Genérico: el cuerpo se proyecta con
 * `ng-content`, así que lo reutilizan todas las pestañas del catálogo.
 *
 * Usa `<dialog>` modal nativo: el navegador atrapa el foco y Esc dispara `cancel`. El padre
 * controla `abierto` y escucha `cerrar` (botón X, Esc o clic en el fondo). Al cerrar, el foco
 * vuelve al elemento que lo abrió.
 *
 * `showModal`/`close` se protegen porque jsdom (pruebas) no los implementa: ahí se usa el
 * atributo `open`.
 */
@Component({
  selector: 'app-panel-lateral',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-lateral.html',
  styleUrl: './panel-lateral.scss',
})
export class PanelLateral {
  readonly abierto = input(false);
  readonly titulo = input.required<string>();
  readonly cerrar = output<void>();

  protected readonly idTitulo = `panel-lateral-titulo-${++siguienteId}`;

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly botonCerrar = viewChild.required<ElementRef<HTMLButtonElement>>('botonCerrar');
  private origenDelFoco: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      untracked(() => (abierto ? this.abrir() : this.cerrarDialogo()));
    });
  }

  protected alCancelarNativo(evento: Event): void {
    evento.preventDefault();
    this.cerrar.emit();
  }

  /** Un clic sobre el propio `<dialog>` (no sobre su contenido) es un clic en el fondo. */
  protected alHacerClic(evento: MouseEvent): void {
    if (evento.target === this.dialogo().nativeElement) {
      this.cerrar.emit();
    }
  }

  private abrir(): void {
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open) {
      return;
    }
    const activo = document.activeElement;
    this.origenDelFoco = activo instanceof HTMLElement ? activo : null;
    if (typeof dialogo.showModal === 'function') {
      dialogo.showModal();
    } else {
      dialogo.setAttribute('open', '');
    }
    this.botonCerrar().nativeElement.focus();
  }

  private cerrarDialogo(): void {
    const dialogo = this.dialogo().nativeElement;
    if (!dialogo.open && !dialogo.hasAttribute('open')) {
      return;
    }
    if (typeof dialogo.close === 'function') {
      dialogo.close();
    } else {
      dialogo.removeAttribute('open');
    }
    this.origenDelFoco?.focus();
    this.origenDelFoco = null;
  }
}
