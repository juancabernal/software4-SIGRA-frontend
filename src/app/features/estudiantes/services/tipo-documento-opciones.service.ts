import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { TipoDocumento } from '../models/tipos-documento';

/** Catálogo de tipos de documento del backend (TipoDocumentoResponseDTO). */
@Injectable({ providedIn: 'root' })
export class TipoDocumentoOpcionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/tipos-documento`;

  listar(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(this.baseUrl);
  }
}
