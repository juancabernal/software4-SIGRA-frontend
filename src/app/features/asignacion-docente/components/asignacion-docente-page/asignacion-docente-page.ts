import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChildren } from '@angular/core';

import { Icono } from '../../../../shared/ui/icono/icono';
import { AsignarTab } from '../asignar-tab/asignar-tab';
import { ConsultarTab } from '../consultar-tab/consultar-tab';

type IdPestana = 'asignar' | 'consultar';

interface Pestana {
  id: IdPestana;
  etiqueta: string;
  icono: string;
}

export const PESTANAS: readonly Pestana[] = [
  { id: 'asignar', etiqueta: 'Asignar', icono: 'mas' },
  { id: 'consultar', etiqueta: 'Consultar y desasignar', icono: 'ojo' },
];

/**
 * Asignación docente (RF-07), con el mismo patrón ARIA de tabs que el Catálogo académico: dos
 * pestañas separadas, una para asignar (elige profesores y luego materias) y otra para consultar
 * las materias de un profesor y desasignarlas.
 */
@Component({
  selector: 'app-asignacion-docente-page',
  imports: [AsignarTab, ConsultarTab, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asignacion-docente-page.html',
  styleUrl: './asignacion-docente-page.scss',
})
export class AsignacionDocentePage {
  protected readonly pestanas = PESTANAS;
  protected readonly activa = signal<IdPestana>('asignar');

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
