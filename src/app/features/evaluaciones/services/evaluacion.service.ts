import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { Evaluacion, EvaluacionRequest, EvaluacionesRaResumen } from '../models/evaluacion.model';

/** Acceso HTTP a las evaluaciones (RF-10 / RF-11). Las reglas de negocio las aplica el backend. */
@Injectable({ providedIn: 'root' })
export class EvaluacionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/v1`;

  /** Evaluaciones del RA en el semestre indicado (sin semestre, el backend usa el activo). */
  listarPorResultadoAprendizaje(
    raId: string,
    semestreId?: string,
  ): Observable<EvaluacionesRaResumen> {
    const params = semestreId ? new HttpParams().set('semestreId', semestreId) : new HttpParams();
    return this.http.get<EvaluacionesRaResumen>(this.urlDeResultado(raId), { params });
  }

  /** Se crea en el semestre activo; el semestre no viaja en el cuerpo. */
  crear(raId: string, evaluacion: EvaluacionRequest): Observable<Evaluacion> {
    return this.http.post<Evaluacion>(this.urlDeResultado(raId), evaluacion);
  }

  /** Se envían todos los campos; con calificaciones, fecha y porcentaje deben llegar iguales. */
  modificar(id: string, evaluacion: EvaluacionRequest): Observable<Evaluacion> {
    return this.http.put<Evaluacion>(this.urlDeEvaluacion(id), evaluacion);
  }

  inactivar(id: string): Observable<Evaluacion> {
    return this.http.patch<Evaluacion>(`${this.urlDeEvaluacion(id)}/inactivar`, null);
  }

  reactivar(id: string): Observable<Evaluacion> {
    return this.http.patch<Evaluacion>(`${this.urlDeEvaluacion(id)}/reactivar`, null);
  }

  private urlDeResultado(raId: string): string {
    return `${this.apiUrl}/resultados-aprendizaje/${encodeURIComponent(raId)}/evaluaciones`;
  }

  private urlDeEvaluacion(id: string): string {
    return `${this.apiUrl}/evaluaciones/${encodeURIComponent(id)}`;
  }
}
