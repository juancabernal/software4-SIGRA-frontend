import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { FiltrosAuditoria, PaginaAuditoria } from '../models/auditoria.model';

/** Acceso HTTP al reporte del historial de auditoría (RF-21c). Solo lectura: no existe forma de modificarlo. */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/auditoria`;

  /** `pagina` empieza en 0, como en el backend. Solo envía los filtros que tienen valor. */
  consultar(filtros: FiltrosAuditoria, pagina: number, tamano: number): Observable<PaginaAuditoria> {
    let params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    if (filtros.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    if (filtros.tipoEntidad) {
      params = params.set('tipoEntidad', filtros.tipoEntidad);
    }
    return this.http.get<PaginaAuditoria>(this.baseUrl, { params });
  }
}