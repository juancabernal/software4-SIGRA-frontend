import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChildren } from '@angular/core';

import { SesionService } from '../../../../core/services/sesion';
import { Icono } from '../../../../shared/ui/icono/icono';
import { MatriculasProgramaSemestreTab } from '../matriculas-programa-semestre-tab/matriculas-programa-semestre-tab';
import { RendimientoRaTab } from '../rendimiento-ra-tab/rendimiento-ra-tab';
import { ReportesFacultad } from '../reportes-facultad/reportes-facultad';
import { RiesgoAcademicoTab } from '../riesgo-academico-tab/riesgo-academico-tab';

type IdPestana = 'rendimiento-ra' | 'riesgo-academico' | 'por-facultad' | 'matriculas-programa-semestre';

interface Pestana {
  id: IdPestana;
  etiqueta: string;
  icono: string;
}

export const PESTANAS: readonly Pestana[] = [
  { id: 'rendimiento-ra', etiqueta: 'Rendimiento por RA', icono: 'barras' },
  { id: 'riesgo-academico', etiqueta: 'Riesgo académico', icono: 'advertencia' },
  { id: 'por-facultad', etiqueta: 'Reportes por facultad', icono: 'edificio' },
  { id: 'matriculas-programa-semestre', etiqueta: 'Matrículas por programa', icono: 'personas' },
];

/**
 * Shell del módulo Reportes (0000041): pestañas ARIA como Catálogo / Asignación docente.
 * R1 = rendimiento por RA; R6 = estudiantes con RA no alcanzados; «Reportes por facultad» =
 * comparativo de facultades, programas y materias.
 */
@Component({
  selector: 'app-reportes-page',
  imports: [Icono, MatriculasProgramaSemestreTab, RendimientoRaTab, ReportesFacultad, RiesgoAcademicoTab],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes-page.html',
  styleUrl: './reportes-page.scss',
})
export class ReportesPage {
  private readonly sesion = inject(SesionService);
  protected readonly rol = this.sesion.rol;
  protected readonly pestanas = computed(() =>
    PESTANAS.filter((pestana) => this.rol() === 'admin' || pestana.id !== 'matriculas-programa-semestre'),
  );
  protected readonly activa = signal<IdPestana>('rendimiento-ra');

  private readonly botones = viewChildren<ElementRef<HTMLButtonElement>>('pestana');

  protected seleccionar(id: IdPestana): void {
    this.activa.set(id);
  }

  protected alTeclear(evento: KeyboardEvent, indice: number): void {
    const pestanas = this.pestanas();
    const total = pestanas.length;
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
    this.activa.set(pestanas[destino].id);
    this.botones()[destino]?.nativeElement.focus();
  }
}
