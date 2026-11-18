import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  FiltrosTrazabilidadUso,
  TrazabilidadUsoProfesor,
  TrazabilidadUsoReporte,
} from '../models/trazabilidad-uso.model';

@Injectable({ providedIn: 'root' })
export class TrazabilidadUsoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/v1/reportes/trazabilidad-uso`;

  /** Administrador: actividad agregada por tipo de usuario. */
  consultarGeneral(filtros: FiltrosTrazabilidadUso = {}): Observable<TrazabilidadUsoReporte> {
    return this.http.get<TrazabilidadUsoReporte>(this.url, { params: parametros(filtros, true) });
  }

  /** Profesor: su actividad y la de los estudiantes de sus asignaturas. El rol no aplica. */
  consultarProfesor(filtros: FiltrosTrazabilidadUso = {}): Observable<TrazabilidadUsoProfesor> {
    return this.http.get<TrazabilidadUsoProfesor>(`${this.url}/profesor`, {
      params: parametros(filtros, false),
    });
  }
}

function parametros(filtros: FiltrosTrazabilidadUso, conRol: boolean): HttpParams {
  let params = new HttpParams();
  if (filtros.semestreId) {
    params = params.set('semestreId', filtros.semestreId);
  }
  if (filtros.desde) {
    params = params.set('desde', filtros.desde);
  }
  if (filtros.hasta) {
    params = params.set('hasta', filtros.hasta);
  }
  if (conRol && filtros.rol) {
    params = params.set('rol', filtros.rol);
  }
  return params;
}
