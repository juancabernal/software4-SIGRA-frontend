import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AsignaturaOpcion, SemestreOpcion } from '../models/evaluacion.model';

/**
 * Lecturas de otros módulos que necesitan los selectores de la vista de evaluaciones. Vive en este
 * feature para no importar servicios de `asignaturas` ni de `semestres` (mismo criterio que
 * ProgramaOpcionesService y CatalogosMatriculaService).
 */
@Injectable({ providedIn: 'root' })
export class CatalogosEvaluacionService {
  private readonly http = inject(HttpClient);
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

  /** Semestres del más reciente al más antiguo. */
  listarSemestres(): Observable<SemestreOpcion[]> {
    return this.http
      .get<SemestreOpcion[]>(`${this.apiUrl}/semestres`)
      .pipe(map((lista) => [...lista].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))));
  }
}
