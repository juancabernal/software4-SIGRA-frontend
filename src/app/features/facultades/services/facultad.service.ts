import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Facultad,
  FacultadRequest,
  FiltrosFacultades,
} from '../models/facultad.model';

/** Acceso HTTP a /api/v1/facultades. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class FacultadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/facultades`;

  listar(filtros: FiltrosFacultades = {}): Observable<Facultad[]> {
    let params = new HttpParams();
    const nombre = filtros.nombre?.trim();
    if (nombre) {
      params = params.set('nombre', nombre);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<Facultad[]>(this.baseUrl, { params });
  }

  consultar(id: string): Observable<Facultad> {
    return this.http.get<Facultad>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  crear(facultad: FacultadRequest): Observable<Facultad> {
    return this.http.post<Facultad>(this.baseUrl, facultad);
  }

  modificar(id: string, nombre: string): Observable<Facultad> {
    return this.http.put<Facultad>(`${this.baseUrl}/${encodeURIComponent(id)}`, { nombre });
  }

  inactivar(id: string): Observable<Facultad> {
    return this.http.patch<Facultad>(
      `${this.baseUrl}/${encodeURIComponent(id)}/inactivar`,
      null,
    );
  }
}
