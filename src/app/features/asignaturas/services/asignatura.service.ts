import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Asignatura, AsignaturaRequest, FiltrosAsignaturas } from '../models/asignatura.model';

/** Acceso HTTP a /api/v1/asignaturas. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class AsignaturaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/asignaturas`;

  /** Solo envía los filtros que tienen valor; el texto va recortado. */
  listar(filtros: FiltrosAsignaturas = {}): Observable<Asignatura[]> {
    let params = new HttpParams();
    const texto = filtros.texto?.trim();
    if (texto) {
      params = params.set('texto', texto);
    }
    if (filtros.programaId) {
      params = params.set('programaId', filtros.programaId);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros.raMin !== undefined) {
      params = params.set('raMin', filtros.raMin);
    }
    if (filtros.raMax !== undefined) {
      params = params.set('raMax', filtros.raMax);
    }
    return this.http.get<Asignatura[]>(this.baseUrl, { params });
  }

  obtener(id: string): Observable<Asignatura> {
    return this.http.get<Asignatura>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  crear(asignatura: AsignaturaRequest): Observable<Asignatura> {
    return this.http.post<Asignatura>(this.baseUrl, asignatura);
  }

  /** Solo el nombre es modificable: código y programa son inmutables (RF-03c). */
  modificar(id: string, nombre: string): Observable<Asignatura> {
    return this.http.put<Asignatura>(`${this.baseUrl}/${encodeURIComponent(id)}`, { nombre });
  }

  activar(id: string): Observable<Asignatura> {
    return this.http.patch<Asignatura>(`${this.baseUrl}/${encodeURIComponent(id)}/activar`, null);
  }

  inactivar(id: string): Observable<Asignatura> {
    return this.http.patch<Asignatura>(`${this.baseUrl}/${encodeURIComponent(id)}/inactivar`, null);
  }
}
