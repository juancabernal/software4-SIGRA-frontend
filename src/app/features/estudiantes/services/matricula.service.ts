import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { EstudianteMatriculado, Matricula, MatriculaRequest } from '../models/matricula.model';

/** Acceso HTTP a /api/v1/matriculas. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class MatriculaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/matriculas`;

  /**
   * `observe: 'response'` (D4): el código HTTP —201 crea, 200 reactiva— es la única señal de cuál
   * de los dos casos ocurrió, porque el cuerpo es idéntico en ambos.
   */
  matricular(matricula: MatriculaRequest): Observable<HttpResponse<Matricula>> {
    return this.http.post<Matricula>(this.baseUrl, matricula, { observe: 'response' });
  }

  desvincular(matriculaId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(matriculaId)}`);
  }

  /** `asignaturaId` y `semestreId` son obligatorios; `incluirInactivas` solo se envía cuando es true. */
  listarMatriculados(
    asignaturaId: string,
    semestreId: string,
    incluirInactivas = false,
  ): Observable<EstudianteMatriculado[]> {
    let params = new HttpParams().set('asignaturaId', asignaturaId).set('semestreId', semestreId);
    if (incluirInactivas) {
      params = params.set('incluirInactivas', true);
    }
    return this.http.get<EstudianteMatriculado[]>(this.baseUrl, { params });
  }
}
