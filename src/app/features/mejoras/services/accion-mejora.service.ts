import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AccionMejora,
  FiltrosAccionMejora,
  RegistroAccionMejora,
} from '../models/accion-mejora.model';

/** Acceso HTTP a /api/v1/acciones-mejora. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class AccionMejoraService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/acciones-mejora`;
  private readonly conclusionesUrl = `${environment.apiUrl}/v1/conclusiones`;

  registrar(conclusionId: string, datos: RegistroAccionMejora): Observable<AccionMejora> {
    return this.http.post<AccionMejora>(
      `${this.conclusionesUrl}/${conclusionId}/acciones-mejora`,
      datos,
    );
  }

  /** Solo envía los filtros que tienen valor. */
  listar(filtros: FiltrosAccionMejora = {}): Observable<AccionMejora[]> {
    let params = new HttpParams();
    if (filtros.resultadoAprendizajeId) {
      params = params.set('resultadoAprendizajeId', filtros.resultadoAprendizajeId);
    }
    if (filtros.asignaturaId) {
      params = params.set('asignaturaId', filtros.asignaturaId);
    }
    if (filtros.convertida !== undefined) {
      params = params.set('convertida', filtros.convertida);
    }
    return this.http.get<AccionMejora[]>(this.baseUrl, { params });
  }

  obtener(id: string): Observable<AccionMejora> {
    return this.http.get<AccionMejora>(`${this.baseUrl}/${id}`);
  }
}
