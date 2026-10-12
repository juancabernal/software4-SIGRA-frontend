import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ProgramaOpcion } from '../models/asignatura.model';

/**
 * Lectura de /api/v1/programas para el selector de programa de asignaturas. Vive en este feature
 * porque solo lo usa el catálogo de materias; el módulo de programas (RF-02) tendrá el suyo.
 */
@Injectable({ providedIn: 'root' })
export class ProgramaOpcionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/programas`;

  listar(estado?: ProgramaOpcion['estado']): Observable<ProgramaOpcion[]> {
    const params = estado ? new HttpParams().set('estado', estado) : new HttpParams();
    return this.http.get<ProgramaOpcion[]>(this.baseUrl, { params });
  }
}
