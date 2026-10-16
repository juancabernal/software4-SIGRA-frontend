import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Calificacion,
  CalificacionModificarRequest,
  CalificacionRequest,
  EventoHistorialCalificacion,
  PlanillaCalificaciones,
} from '../models/calificacion.model';

/** Acceso HTTP a las calificaciones (RF-12 / RF-13). Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class CalificacionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1`;

  planilla(evaluacionId: string): Observable<PlanillaCalificaciones> {
    return this.http.get<PlanillaCalificaciones>(this.urlDePlanilla(evaluacionId));
  }

  registrar(evaluacionId: string, calificacion: CalificacionRequest): Observable<Calificacion> {
    return this.http.post<Calificacion>(this.urlDePlanilla(evaluacionId), calificacion);
  }

  modificar(id: string, cambio: CalificacionModificarRequest): Observable<Calificacion> {
    return this.http.put<Calificacion>(this.urlDeCalificacion(id), cambio);
  }

  historial(id: string): Observable<EventoHistorialCalificacion[]> {
    return this.http.get<EventoHistorialCalificacion[]>(`${this.urlDeCalificacion(id)}/historial`);
  }

  private urlDePlanilla(evaluacionId: string): string {
    return `${this.apiUrl}/evaluaciones/${encodeURIComponent(evaluacionId)}/calificaciones`;
  }

  private urlDeCalificacion(id: string): string {
    return `${this.apiUrl}/calificaciones/${encodeURIComponent(id)}`;
  }
}