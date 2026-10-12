import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

let siguienteId = 0;

/**
 * Confirmación de una acción con `<dialog>` modal nativo. El padre controla `abierto` y decide
 * qué hacer con `confirmar` y `cancelar`; mientras `procesando` es verdadero ambos botones quedan
 * deshabilitados y Esc no cierra. El foco inicial va a «Cancelar», la opción segura.
 *
 * Con `gestoRequerido` la confirmación se refuerza: aparece una casilla con ese texto y el botón de
 * confirmar queda deshabilitado hasta marcarla, para que una acción con consecuencias no se
 * dispare de un solo clic. El componente no sabe nada del dominio: recibe un texto y emite
 * `confirmar`. Sin ese input se comporta exactamente como antes.
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
  /**
   * Texto de la casilla que el usuario debe marcar antes de poder confirmar. Vacío o ausente
   * (lo normal) = confirmación de un solo paso, igual que antes.
   */
  readonly gestoRequerido = input('');

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  /** Si la casilla del gesto está marcada. Se reinicia cada vez que el diálogo se abre. */
  protected readonly gestoAceptado = signal(false);

  /** El botón de confirmar está bloqueado mientras falte el gesto, o mientras se procesa. */
  protected readonly confirmarBloqueado = computed(
    () => this.procesando() || (!!this.gestoRequerido() && !this.gestoAceptado()),
  );

  private readonly id = ++siguienteId;
  protected readonly idTitulo = `dialogo-confirmacion-titulo-${this.id}`;
  protected readonly idDescripcion = `dialogo-confirmacion-descripcion-${this.id}`;
  protected readonly idGesto = `dialogo-confirmacion-gesto-${this.id}`;

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
    if (!this.confirmarBloqueado()) {
      this.confirmar.emit();
    }
  }

  protected alCambiarGesto(evento: Event): void {
    this.gestoAceptado.set((evento.target as HTMLInputElement).checked);
  }

  protected alCancelarNativo(evento: Event): void {
    evento.preventDefault();
    this.alCancelar();
  }

  private abrir(): void {
    // Cada apertura parte de cero: un gesto aceptado antes no se hereda en la siguiente acción.
    this.gestoAceptado.set(false);
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
