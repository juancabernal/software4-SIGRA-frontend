import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { FiltrosRendimientoRa, RendimientoRaReporte } from '../models/rendimiento-ra.model';
import { FiltrosRiesgoAcademico, RiesgoAcademicoReporte } from '../models/riesgo-academico.model';

/** Acceso HTTP a /api/v1/reportes. El alcance por rol lo aplica el backend. */
@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/reportes`;

  /** Solo envía los filtros que tienen valor. */
  rendimientoRa(filtros: FiltrosRendimientoRa = {}): Observable<RendimientoRaReporte> {
    let params = new HttpParams();
    if (filtros.semestreId) {
      params = params.set('semestreId', filtros.semestreId);
    }
    if (filtros.facultadId) {
      params = params.set('facultadId', filtros.facultadId);
    }
    if (filtros.programaId) {
      params = params.set('programaId', filtros.programaId);
    }
    if (filtros.asignaturaId) {
      params = params.set('asignaturaId', filtros.asignaturaId);
    }
    return this.http.get<RendimientoRaReporte>(`${this.baseUrl}/rendimiento-ra`, { params });
  }

  /** R6: estudiantes con RA no alcanzados. */
  riesgoAcademico(filtros: FiltrosRiesgoAcademico = {}): Observable<RiesgoAcademicoReporte> {
    let params = new HttpParams();
    if (filtros.semestreId) {
      params = params.set('semestreId', filtros.semestreId);
    }
    if (filtros.facultadId) {
      params = params.set('facultadId', filtros.facultadId);
    }
    if (filtros.programaId) {
      params = params.set('programaId', filtros.programaId);
    }
    if (filtros.asignaturaId) {
      params = params.set('asignaturaId', filtros.asignaturaId);
    }
    if (filtros.minRaNoAlcanzados != null && filtros.minRaNoAlcanzados >= 1) {
      params = params.set('minRaNoAlcanzados', String(filtros.minRaNoAlcanzados));
    }
    return this.http.get<RiesgoAcademicoReporte>(`${this.baseUrl}/riesgo-academico`, { params });
  }
}
