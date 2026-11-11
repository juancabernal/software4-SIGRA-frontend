import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  FiltrosSemestres,
  Semestre,
  SemestreFechaFinRequest,
  SemestreRequest,
} from '../models/semestre.model';

/** Acceso HTTP a /api/v1/semestres. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class SemestreService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/semestres`;

  /** Solo envía los filtros que tienen valor; el código va recortado. */
  listar(filtros: FiltrosSemestres = {}): Observable<Semestre[]> {
    let params = new HttpParams();
    const codigo = filtros.codigo?.trim();
    if (codigo) {
      params = params.set('codigo', codigo);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<Semestre[]>(this.baseUrl, { params });
  }

  consultarPorCodigo(codigo: string): Observable<Semestre> {
    return this.http.get<Semestre>(`${this.baseUrl}/${encodeURIComponent(codigo)}`);
  }

  crear(semestre: SemestreRequest): Observable<Semestre> {
    return this.http.post<Semestre>(this.baseUrl, semestre);
  }

  extenderFechaFin(codigo: string, cambio: SemestreFechaFinRequest): Observable<Semestre> {
    return this.http.patch<Semestre>(`${this.baseUrl}/${encodeURIComponent(codigo)}`, cambio);
  }
}
