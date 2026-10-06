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

let siguienteId = 0;

/**
 * Confirmación de una acción con `<dialog>` modal nativo. El padre controla `abierto` y decide
 * qué hacer con `confirmar` y `cancelar`; mientras `procesando` es verdadero ambos botones quedan
 * deshabilitados y Esc no cierra. El foco inicial va a «Cancelar», la opción segura.
 *
 * `showModal`/`close` se protegen porque jsdom (pruebas) no los implementa.
 */
@Component({
  selector: 'app-dialogo-confirmacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dialogo-confirmacion.html',
  styleUrl: './dialogo-confirmacion.scss',
})
export class DialogoConfirmacion {
  readonly abierto = input(false);
  readonly titulo = input.required<string>();
  readonly descripcion = input('');
  readonly etiquetaConfirmar = input('Confirmar');
  readonly etiquetaCancelar = input('Cancelar');
  readonly tono = input<'peligro' | 'normal'>('normal');
  readonly procesando = input(false);
  /** Mensaje de error para mostrar dentro del diálogo; null si no hay error. */
  readonly error = input<string | null>(null);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  private readonly id = ++siguienteId;
  protected readonly idTitulo = `dialogo-confirmacion-titulo-${this.id}`;
  protected readonly idDescripcion = `dialogo-confirmacion-descripcion-${this.id}`;

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly botonCancelar =
    viewChild.required<ElementRef<HTMLButtonElement>>('botonCancelar');
  private origenDelFoco: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const abierto = this.abierto();
      untracked(() => (abierto ? this.abrir() : this.cerrarDialogo()));
    });
  }

  protected alCancelar(): void {
    if (!this.procesando()) {
      this.cancelar.emit();
    }
  }

  protected alConfirmar(): void {
    if (!this.procesando()) {
      this.confirmar.emit();
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
    this.botonCancelar().nativeElement.focus();
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
