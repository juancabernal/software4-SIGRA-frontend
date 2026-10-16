import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AsignacionMasivaRequest, ResultadoAsignacionMasiva } from '../models/asignacion-docente.model';

/** Acceso HTTP a /api/v1/asignaciones-docentes. Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class AsignacionDocenteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/asignaciones-docentes`;

  /** Asigna cada profesor a cada asignatura (cartesiano). No falla toda la operación por un par individual. */
  asignarMasivo(request: AsignacionMasivaRequest): Observable<ResultadoAsignacionMasiva> {
    return this.http.post<ResultadoAsignacionMasiva>(this.baseUrl, request);
  }

  /** Eliminación lógica: cambia el estado a INACTIVO. */
  desasignar(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${encodeURIComponent(id)}/desasignar`, null);
  }
}
