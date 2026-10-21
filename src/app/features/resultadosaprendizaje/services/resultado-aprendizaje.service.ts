import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  RendimientoAsignatura,
  ResultadoAprendizaje,
  ResultadoAprendizajeActualizarRequest,
  ResultadoAprendizajeCrearRequest,
} from '../models/resultado-aprendizaje.model';

/** Acceso HTTP a los resultados de aprendizaje (RF-06). Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class ResultadoAprendizajeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1`;

  /** Todos los RA de la asignatura (activos e inactivos). */
  listarPorAsignatura(asignaturaId: string): Observable<ResultadoAprendizaje[]> {
    return this.http.get<ResultadoAprendizaje[]>(this.urlDeAsignatura(asignaturaId));
  }

  /**
   * Rendimiento de los RA activos de la asignatura (RF-14). Sin `semestreId` es el del semestre
   * activo; con él, el de ese semestre (p. ej. uno pasado, de solo consulta).
   */
  consultarRendimiento(asignaturaId: string, semestreId?: string): Observable<RendimientoAsignatura> {
    const params = semestreId ? new HttpParams().set('semestreId', semestreId) : undefined;
    return this.http.get<RendimientoAsignatura>(`${this.urlDeAsignatura(asignaturaId)}/rendimiento`, {
      params,
    });
  }

  crear(
    asignaturaId: string,
    resultado: ResultadoAprendizajeCrearRequest,
  ): Observable<ResultadoAprendizaje> {
    return this.http.post<ResultadoAprendizaje>(this.urlDeAsignatura(asignaturaId), resultado);
  }

  /** Solo la descripción es modificable; código y asignatura no cambian. */
  actualizarDescripcion(
    id: string,
    cambio: ResultadoAprendizajeActualizarRequest,
  ): Observable<ResultadoAprendizaje> {
    return this.http.put<ResultadoAprendizaje>(this.urlDeResultado(id), cambio);
  }

  inactivar(id: string): Observable<ResultadoAprendizaje> {
    return this.http.patch<ResultadoAprendizaje>(`${this.urlDeResultado(id)}/inactivar`, null);
  }

  reactivar(id: string): Observable<ResultadoAprendizaje> {
    return this.http.patch<ResultadoAprendizaje>(`${this.urlDeResultado(id)}/reactivar`, null);
  }

  private urlDeAsignatura(asignaturaId: string): string {
    return `${this.apiUrl}/asignaturas/${encodeURIComponent(asignaturaId)}/resultados-aprendizaje`;
  }

  private urlDeResultado(id: string): string {
    return `${this.apiUrl}/resultados-aprendizaje/${encodeURIComponent(id)}`;
  }
}
