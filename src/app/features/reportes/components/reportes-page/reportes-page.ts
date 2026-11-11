import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChildren } from '@angular/core';

import { Icono } from '../../../../shared/ui/icono/icono';
import { RendimientoRaTab } from '../rendimiento-ra-tab/rendimiento-ra-tab';
import { RiesgoAcademicoTab } from '../riesgo-academico-tab/riesgo-academico-tab';

type IdPestana = 'rendimiento-ra' | 'riesgo-academico';

interface Pestana {
  id: IdPestana;
  etiqueta: string;
  icono: string;
}

export const PESTANAS: readonly Pestana[] = [
  { id: 'rendimiento-ra', etiqueta: 'Rendimiento por RA', icono: 'barras' },
  { id: 'riesgo-academico', etiqueta: 'Riesgo académico', icono: 'advertencia' },
];

/**
 * Shell del módulo Reportes (0000041): pestañas ARIA como Catálogo / Asignación docente.
 * R1 = rendimiento por RA; R6 = estudiantes con RA no alcanzados.
 */
@Component({
  selector: 'app-reportes-page',
  imports: [Icono, RendimientoRaTab, RiesgoAcademicoTab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes-page.html',
  styleUrl: './reportes-page.scss',
})
export class ReportesPage {
  protected readonly pestanas = PESTANAS;
  protected readonly activa = signal<IdPestana>('rendimiento-ra');

  private readonly botones = viewChildren<ElementRef<HTMLButtonElement>>('pestana');

  protected seleccionar(id: IdPestana): void {
    this.activa.set(id);
  }

  protected alTeclear(evento: KeyboardEvent, indice: number): void {
    const total = this.pestanas.length;
    let destino: number;
    switch (evento.key) {
      case 'ArrowRight':
        destino = (indice + 1) % total;
        break;
      case 'ArrowLeft':
        destino = (indice - 1 + total) % total;
        break;
      case 'Home':
        destino = 0;
        break;
      case 'End':
        destino = total - 1;
        break;
      default:
        return;
    }
    evento.preventDefault();
    this.activa.set(this.pestanas[destino].id);
    this.botones()[destino]?.nativeElement.focus();
  }
}
