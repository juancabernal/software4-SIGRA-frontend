import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AccionesMejoraReporte, FiltrosAccionesMejora } from '../models/acciones-mejora.model';

@Injectable({ providedIn: 'root' })
export class AccionesMejoraReporteService {
  private readonly http = inject(HttpClient);

  listar(filtros: FiltrosAccionesMejora = {}) {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return this.http.get<AccionesMejoraReporte>(`${environment.apiUrl}/v1/reportes/acciones-mejora`, { params });
  }
}
