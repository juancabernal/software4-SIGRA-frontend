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

const CAMPO_ENFOCABLE =
  'input:not([type="hidden"]):not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly]):not([disabled])';

/**
 * Modal genérico para registrar o modificar: título, botón cerrar, campos proyectados dentro de un
 * `<form>`, botón principal y «Cancelar». Usa `<dialog>` modal nativo; el padre controla `abierto`.
 *
 * Con `enviarDeshabilitado` (formulario inválido) o `procesando`, el botón principal queda con
 * `aria-disabled` — sigue enfocable — y no emite `enviar`. Si se intenta enviar así (y no está
 * procesando), emite `envioBloqueado` para que el formulario muestre sus errores.
 *
 * `showModal`/`close` se protegen porque jsdom (pruebas) no los implementa.
 */
@Component({
  selector: 'app-modal-crud',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal-crud.html',
  styleUrl: './modal-crud.scss',
})
export class ModalCrud {
  readonly abierto = input(false);
  readonly titulo = input.required<string>();
  readonly etiquetaEnviar = input('Guardar');
  readonly procesando = input(false);
  /** Mensaje del backend para la región de alerta; null si no hay error. */
  readonly error = input<string | null>(null);
  /** Detalles del error (por ejemplo, validaciones por campo) que acompañan al mensaje. */
  readonly detalles = input<string[]>([]);
  readonly enviarDeshabilitado = input(false);

  readonly enviar = output<void>();
  readonly cancelar = output<void>();
  readonly envioBloqueado = output<void>();

  protected readonly idTitulo = `modal-crud-titulo-${++siguienteId}`;

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly formulario = viewChild.required<ElementRef<HTMLFormElement>>('formulario');
  private origenDelFoco: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      untracked(() => (abierto ? this.abrir() : this.cerrarDialogo()));
    });
  }

  protected bloqueado(): boolean {
    return this.enviarDeshabilitado() || this.procesando();
  }

  protected alEnviar(evento: Event): void {
    evento.preventDefault();
    if (this.procesando()) {
      return;
    }
    if (this.enviarDeshabilitado()) {
      this.envioBloqueado.emit();
      return;
    }
    this.enviar.emit();
  }

  protected alCancelar(): void {
    if (!this.procesando()) {
      this.cancelar.emit();
    }
  }

  protected alCancelarNativo(evento: Event): void {
    evento.preventDefault();
    this.alCancelar();
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
    this.formulario().nativeElement.querySelector<HTMLElement>(CAMPO_ENFOCABLE)?.focus();
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
