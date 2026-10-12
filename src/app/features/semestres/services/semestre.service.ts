import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Semestre, SemestreFechaFinRequest, SemestreRequest } from '../models/semestre.model';

/** Acceso HTTP a /api/v1/semestres. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class SemestreService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/semestres`;

  listar(): Observable<Semestre[]> {
    return this.http.get<Semestre[]>(this.baseUrl);
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
