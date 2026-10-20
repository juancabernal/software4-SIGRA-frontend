import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  EstadisticasResultadoAprendizaje,
  RangoNivelLogro,
  RecalculoEstadisticas,
} from '../models/nivel-logro.model';

/**
 * Acceso HTTP a nivel de logro y estadísticas (RF-14, RF-15). El cálculo, el umbral de 3
 * calificaciones y el alcance por asignación docente los aplica el backend.
 */
@Injectable({ providedIn: 'root' })
export class NivelLogroService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1`;

  private urlEstadisticas(resultadoAprendizajeId: string, semestreId: string): string {
    return `${this.baseUrl}/resultados-aprendizaje/${resultadoAprendizajeId}/semestres/${semestreId}/estadisticas`;
  }

  /** Resultado del último recálculo; de solo lectura. */
  consultarEstadisticas(
    resultadoAprendizajeId: string,
    semestreId: string,
  ): Observable<EstadisticasResultadoAprendizaje> {
    return this.http.get<EstadisticasResultadoAprendizaje>(
      this.urlEstadisticas(resultadoAprendizajeId, semestreId),
    );
  }

  /** Fuerza el recálculo (idempotente) y dispara la conclusión automática de RF-16. */
  recalcular(
    resultadoAprendizajeId: string,
    semestreId: string,
  ): Observable<RecalculoEstadisticas> {
    return this.http.post<RecalculoEstadisticas>(
      `${this.urlEstadisticas(resultadoAprendizajeId, semestreId)}/recalculo`,
      null,
    );
  }

  /** Los 4 rangos del catálogo, en orden ascendente. */
  consultarCatalogo(): Observable<RangoNivelLogro[]> {
    return this.http.get<RangoNivelLogro[]>(`${this.baseUrl}/niveles-logro`);
  }
}
