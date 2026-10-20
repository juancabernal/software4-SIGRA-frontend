import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Conclusion, ConclusionEstado, FiltrosConclusion } from '../models/conclusion.model';

/** Acceso HTTP a /api/v1/conclusiones. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class ConclusionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/conclusiones`;
  private readonly baseUrlRa = `${environment.apiUrl}/v1/resultados-aprendizaje`;

  /** Solo envía los filtros que tienen valor. */
  listar(filtros: FiltrosConclusion = {}): Observable<Conclusion[]> {
    let params = new HttpParams();
    if (filtros.resultadoAprendizajeId) {
      params = params.set('resultadoAprendizajeId', filtros.resultadoAprendizajeId);
    }
    if (filtros.semestreId) {
      params = params.set('semestreId', filtros.semestreId);
    }
    if (filtros.asignaturaId) {
      params = params.set('asignaturaId', filtros.asignaturaId);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<Conclusion[]>(this.baseUrl, { params });
  }

  /**
   * Estado de solo lectura de un (RA, semestre) para RF-16: no genera ni modifica nada, a
   * diferencia de un POST de generación.
   */
  consultarEstado(resultadoAprendizajeId: string, semestreId: string): Observable<ConclusionEstado> {
    return this.http.get<ConclusionEstado>(
      `${this.baseUrlRa}/${resultadoAprendizajeId}/semestres/${semestreId}/conclusiones/estado`,
    );
  }
}
