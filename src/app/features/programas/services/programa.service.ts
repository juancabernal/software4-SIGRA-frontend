import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { FiltrosProgramas, Programa, ProgramaRequest } from '../models/programa.model';

/** Acceso HTTP a /api/v1/programas. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class ProgramaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/programas`;

  /** Solo envía los filtros que tienen valor; el texto va recortado. */
  listar(filtros: FiltrosProgramas = {}): Observable<Programa[]> {
    let params = new HttpParams();
    const nombre = filtros.nombre?.trim();
    const codigo = filtros.codigo?.trim();
    if (nombre) {
      params = params.set('nombre', nombre);
    }
    if (codigo) {
      params = params.set('codigo', codigo);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<Programa[]>(this.baseUrl, { params });
  }

  crear(programa: ProgramaRequest): Observable<Programa> {
    return this.http.post<Programa>(this.baseUrl, programa);
  }

  /** Solo el nombre es modificable: el código es inmutable (RF-02c). */
  modificar(id: string, nombre: string): Observable<Programa> {
    return this.http.put<Programa>(`${this.baseUrl}/${encodeURIComponent(id)}`, { nombre });
  }

  inactivar(id: string): Observable<Programa> {
    return this.http.patch<Programa>(`${this.baseUrl}/${encodeURIComponent(id)}/inactivar`, null);
  }
}
