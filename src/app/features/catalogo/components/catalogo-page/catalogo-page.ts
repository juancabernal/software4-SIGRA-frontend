import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  signal,
  viewChildren,
} from '@angular/core';

import { MateriasTab } from '../../../asignaturas/components/materias-tab/materias-tab';
import { ProgramasTab } from '../../../programas/components/programas-tab/programas-tab';
import { ProfesoresTab } from '../../../profesores/components/profesores-tab/profesores-tab';
import { Icono } from '../../../../shared/ui/icono/icono';
import { ModuloPendiente } from '../../../../shared/ui/modulo-pendiente/modulo-pendiente';

type IdPestana = 'profesores' | 'programas' | 'materias';

interface Pestana {
  id: IdPestana;
  etiqueta: string;
  icono: string;
}

export const PESTANAS: readonly Pestana[] = [
  { id: 'profesores', etiqueta: 'Profesores', icono: 'personas' },
  { id: 'programas', etiqueta: 'Programas académicos', icono: 'edificio' },
  { id: 'materias', etiqueta: 'Materias', icono: 'libro' },
];

/**
 * Catálogo académico del Administrador con tres pestañas (patrón ARIA de tabs con activación
 * automática: flechas, Inicio y Fin mueven el foco y seleccionan). «Materias» (RF-03) y
 * «Profesores» (RF-01) están implementadas; Programas académicos (RF-02) muestra el módulo
 * pendiente.
 */
@Component({
  selector: 'app-catalogo-page',
  imports: [Icono, MateriasTab, ModuloPendiente, ProgramasTab],
  imports: [Icono, MateriasTab, ProfesoresTab, ModuloPendiente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalogo-page.html',
  styleUrl: './catalogo-page.scss',
})
export class CatalogoPage {
  protected readonly pestanas = PESTANAS;

  // Arranca en «Materias» para no reordenar el punto de entrada actual del equipo.
  // Cuando Programas académicos también esté lista, volver al orden del diseño
  // (Profesores primero).
  protected readonly activa = signal<IdPestana>('materias');

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
