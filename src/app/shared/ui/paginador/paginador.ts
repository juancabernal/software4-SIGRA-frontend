import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Tamaños de página que ofrece el selector; 10 es el valor por defecto. */
export const TAMANOS_PAGINA = [5, 10, 25, 50] as const;

/**
 * Paginador genérico: navega entre páginas y deja elegir cuántos registros ver por página.
 * No pagina nada por sí mismo: solo presenta los controles sobre los valores que recibe y
 * emite la intención del usuario; quien lo usa decide cómo recortar su lista.
 */
@Component({
  selector: 'app-paginador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paginador.html',
  styleUrl: './paginador.scss',
})
export class Paginador {
  readonly total = input.required<number>();
  readonly pagina = input.required<number>();
  readonly tamanoPagina = input.required<number>();

  readonly cambioPagina = output<number>();
  readonly cambioTamano = output<number>();

  protected readonly tamanos = TAMANOS_PAGINA;
  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.tamanoPagina())),
  );

  protected anterior(): void {
    // El botón usa aria-disabled (no disabled) para poder recibir foco; por eso se bloquea aquí.
    if (this.pagina() <= 1) {
      return;
    }
    this.cambioPagina.emit(this.pagina() - 1);
  }

  protected siguiente(): void {
    if (this.pagina() >= this.totalPaginas()) {
      return;
    }
    this.cambioPagina.emit(this.pagina() + 1);
  }

  protected alCambiarTamano(evento: Event): void {
    this.cambioTamano.emit(Number((evento.target as HTMLSelectElement).value));
  }
}
