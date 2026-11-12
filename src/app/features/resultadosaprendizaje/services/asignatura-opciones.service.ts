import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AsignaturaOpcion,
  ESTADOS_GESTIONABLES,
  EstadoAsignaturaOpcion,
} from '../models/resultado-aprendizaje.model';

/**
 * Lectura de /api/v1/asignaturas para el selector de la vista de RA. Vive en este feature para no
 * importar desde `features/asignaturas` (mismo criterio que ProgramaOpcionesService).
 */
@Injectable({ providedIn: 'root' })
export class AsignaturaOpcionesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/asignaturas`;

  /**
   * Asignaturas en BORRADOR y ACTIVA. El filtro `estado` del backend admite un solo valor, así que
   * se hace una petición por estado y se unen los resultados, ordenados por código.
   */
  listarGestionables(facultadId?: string): Observable<AsignaturaOpcion[]> {
    return forkJoin(
      ESTADOS_GESTIONABLES.map((estado) => this.listarPorEstado(estado, facultadId)),
    ).pipe(map((listas) => listas.flat().sort((a, b) => a.codigo.localeCompare(b.codigo))));
  }

  /** Con `facultadId`, el backend devuelve solo las materias de esa facultad. */
  private listarPorEstado(
    estado: EstadoAsignaturaOpcion,
    facultadId?: string,
  ): Observable<AsignaturaOpcion[]> {
    let params = new HttpParams().set('estado', estado);
    if (facultadId) params = params.set('facultadId', facultadId);
    return this.http.get<AsignaturaOpcion[]>(this.baseUrl, { params });
  }
}
