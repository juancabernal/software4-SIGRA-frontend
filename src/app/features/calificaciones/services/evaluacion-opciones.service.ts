import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { EvaluacionOpcion } from '../models/calificacion.model';

@Injectable({ providedIn: 'root' })
export class EvaluacionOpcionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/calificaciones/evaluaciones`;

  listar(resultadoAprendizajeId: string, semestreId: string): Observable<EvaluacionOpcion[]> {
    const params = new HttpParams()
      .set('resultadoAprendizajeId', resultadoAprendizajeId)
      .set('semestreId', semestreId);
    return this.http.get<EvaluacionOpcion[]>(this.baseUrl, { params });
  }
}