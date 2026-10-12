import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AsignaturaProfesor,
  EstadoRegistro,
  Profesor,
  ProfesorRequest,
} from '../models/profesor.model';


@Injectable({ providedIn: 'root' })
export class ProfesorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/profesores`;

  /** GET /profesores?filtro=... — único filtro que acepta el backend: texto libre. */
  listar(filtro?: string): Observable<Profesor[]> {
    const texto = filtro?.trim();
    const params = texto ? new HttpParams().set('filtro', texto) : new HttpParams();
    return this.http.get<Profesor[]>(this.baseUrl, { params });
  }

  /** GET /profesores/{id}/asignaturas?estado=... */
  consultarAsignaturas(id: string, estado?: EstadoRegistro): Observable<AsignaturaProfesor[]> {
    const params = estado ? new HttpParams().set('estado', estado) : new HttpParams();
    return this.http.get<AsignaturaProfesor[]>(
      `${this.baseUrl}/${encodeURIComponent(id)}/asignaturas`,
      { params },
    );
  }

  /** POST /profesores → 201 con el profesor creado. */
  registrar(dto: ProfesorRequest): Observable<Profesor> {
    return this.http.post<Profesor>(this.baseUrl, dto);
  }

  /** PUT /profesores/{id} → 200 con el profesor modificado. */
  modificar(id: string, dto: ProfesorRequest): Observable<Profesor> {
    return this.http.put<Profesor>(`${this.baseUrl}/${encodeURIComponent(id)}`, dto);
  }

  /** DELETE /profesores/{id} → 204 sin cuerpo: el llamador actualiza el estado localmente. */
  inactivar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
