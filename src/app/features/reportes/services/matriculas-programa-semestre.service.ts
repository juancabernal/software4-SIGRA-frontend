import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  FiltrosMatriculasProgramaSemestre,
  MatriculasProgramaSemestreReporte,
} from '../models/matriculas-programa-semestre.model';

@Injectable({ providedIn: 'root' })
export class MatriculasProgramaSemestreService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/v1/reportes/matriculas-programa-semestre`;

  listar(
    filtros: FiltrosMatriculasProgramaSemestre = {},
  ): Observable<MatriculasProgramaSemestreReporte> {
    let params = new HttpParams();
    if (filtros.semestreId) {
      params = params.set('semestreId', filtros.semestreId);
    }
    if (filtros.programaId) {
      params = params.set('programaId', filtros.programaId);
    }
    if (filtros.facultadId) {
      params = params.set('facultadId', filtros.facultadId);
    }
    return this.http.get<MatriculasProgramaSemestreReporte>(this.url, { params });
  }
}
