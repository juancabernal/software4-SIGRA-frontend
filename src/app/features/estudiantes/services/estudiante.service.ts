import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Estudiante, EstudianteRequest } from '../models/estudiante.model';
import { AsignaturaDeEstudiante } from '../models/matricula.model';

/** Acceso HTTP a /api/v1/estudiantes. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class EstudianteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/estudiantes`;

  registrar(estudiante: EstudianteRequest): Observable<Estudiante> {
    return this.http.post<Estudiante>(this.baseUrl, estudiante);
  }

  /** Solo envía el parámetro `filtro` cuando trae texto (D8: la búsqueda la resuelve el servidor). */
  listar(filtro?: string): Observable<Estudiante[]> {
    const texto = filtro?.trim();
    const params = texto ? new HttpParams().set('filtro', texto) : undefined;
    return this.http.get<Estudiante[]>(this.baseUrl, { params });
  }

  consultarPorId(id: string): Observable<Estudiante> {
    return this.http.get<Estudiante>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  modificar(id: string, estudiante: EstudianteRequest): Observable<Estudiante> {
    return this.http.put<Estudiante>(`${this.baseUrl}/${encodeURIComponent(id)}`, estudiante);
  }

  /** Inactivación lógica, idempotente: inactivar un estudiante ya inactivo también responde 204. */
  inactivar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  asignaturasDe(id: string): Observable<AsignaturaDeEstudiante[]> {
    return this.http.get<AsignaturaDeEstudiante[]>(
      `${this.baseUrl}/${encodeURIComponent(id)}/asignaturas`,
    );
  }
}
