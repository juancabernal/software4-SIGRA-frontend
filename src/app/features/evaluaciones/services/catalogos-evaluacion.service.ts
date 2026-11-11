import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SesionService } from '../../../core/services/sesion';
import { AsignaturaOpcion, SemestreOpcion } from '../models/evaluacion.model';

/**
 * Lecturas de otros módulos que necesitan los selectores de la vista de evaluaciones. Vive en este
 * feature para no importar servicios de `asignaturas` ni de `semestres` (mismo criterio que
 * ProgramaOpcionesService y CatalogosMatriculaService).
 */
@Injectable({ providedIn: 'root' })
export class CatalogosEvaluacionService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);
  private readonly apiUrl = `${environment.apiUrl}/v1`;

  /**
   * Materias ACTIVAS, ordenadas por código: solo en ellas se crean evaluaciones. Mientras no exista
   * la sesión (RF-05) se listan todas; luego se cambiará por «mis asignaturas» del profesor.
   */
  listarAsignaturasActivas(): Observable<AsignaturaOpcion[]> {
    const params = new HttpParams().set('estado', 'ACTIVA');
    return this.http
      .get<AsignaturaOpcion[]>(`${this.apiUrl}/asignaturas`, { params })
      .pipe(map((lista) => [...lista].sort((a, b) => a.codigo.localeCompare(b.codigo))));
  }

  /**
   * Semestres del más reciente al más antiguo. El Profesor solo recibe aquellos en los que tiene
   * asignaturas (Mantis 0000045); el resto de roles, todos.
   */
  listarSemestres(): Observable<SemestreOpcion[]> {
    const url =
      this.sesion.rol() === 'profesor' ? `${this.apiUrl}/semestres/mios` : `${this.apiUrl}/semestres`;
    return this.http
      .get<SemestreOpcion[]>(url)
      .pipe(map((lista) => [...lista].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))));
  }
}
