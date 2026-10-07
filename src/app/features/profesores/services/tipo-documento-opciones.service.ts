import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { TipoDocumentoOpcion } from '../models/profesor.model';

@Injectable({ providedIn: 'root' })
export class TipoDocumentoOpcionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/tipos-documento`;

  listar(): Observable<TipoDocumentoOpcion[]> {
    return this.http.get<TipoDocumentoOpcion[]>(this.baseUrl);
  }
}
