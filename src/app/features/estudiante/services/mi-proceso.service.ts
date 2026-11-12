import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { MiMateria, MiMateriaDetalle } from '../models/mi-proceso.model';

@Injectable({ providedIn: 'root' })
export class MiProcesoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/estudiantes/me`;

  listarMaterias(): Observable<MiMateria[]> {
    return this.http.get<MiMateria[]>(`${this.baseUrl}/materias`);
  }

  obtenerMateria(matriculaId: string): Observable<MiMateriaDetalle> {
    return this.http.get<MiMateriaDetalle>(
      `${this.baseUrl}/materias/${encodeURIComponent(matriculaId)}`,
    );
  }

  obtenerProgreso(): Observable<MiMateriaDetalle[]> {
    return this.http.get<MiMateriaDetalle[]>(`${this.baseUrl}/progreso`);
  }

  listarHistorial(): Observable<MiMateria[]> {
    return this.http.get<MiMateria[]>(`${this.baseUrl}/historial`);
  }
}
