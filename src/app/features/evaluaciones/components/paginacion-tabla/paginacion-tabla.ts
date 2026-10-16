import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

let siguienteId = 0;

/**
 * Pie de tabla paginada: rango mostrado, filas por página y navegación. No guarda estado: el padre
 * tiene la página y el tamaño, y los recibe de vuelta por `cambioPagina` y `cambioTamano`.
 */
@Component({
  selector: 'app-paginacion-tabla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paginacion-tabla.html',
  styleUrl: './paginacion-tabla.scss',
})
export class PaginacionTabla {
  readonly total = input.required<number>();
  readonly pagina = input.required<number>();
  readonly tamano = input.required<number>();
  readonly tamanos = input<readonly number[]>([5, 10, 15]);
  /** Nombre de lo que se lista, para el rango y la etiqueta de la navegación («evaluaciones»). */
  readonly elementos = input('registros');

  readonly cambioPagina = output<number>();
  readonly cambioTamano = output<number>();

  protected readonly idTamano = `paginacion-tamano-${++siguienteId}`;

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.tamano())),
  );

  protected readonly rango = computed(() => {
    const total = this.total();
    if (total === 0) {
      return `0 ${this.elementos()}`;
    }
    const desde = (this.pagina() - 1) * this.tamano() + 1;
    const hasta = Math.min(desde + this.tamano() - 1, total);
    return `Mostrando ${desde}–${hasta} de ${total} ${this.elementos()}`;
  });

  protected anterior(): void {
    if (this.pagina() > 1) {
      this.cambioPagina.emit(this.pagina() - 1);
    }
  }

  protected siguiente(): void {
    if (this.pagina() < this.totalPaginas()) {
      this.cambioPagina.emit(this.pagina() + 1);
    }
  }

  protected alCambiarTamano(evento: Event): void {
    this.cambioTamano.emit(Number((evento.target as HTMLSelectElement).value));
  }
}
