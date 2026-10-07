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
  listarGestionables(): Observable<AsignaturaOpcion[]> {
    return forkJoin(ESTADOS_GESTIONABLES.map((estado) => this.listarPorEstado(estado))).pipe(
      map((listas) => listas.flat().sort((a, b) => a.codigo.localeCompare(b.codigo))),
    );
  }

  private listarPorEstado(estado: EstadoAsignaturaOpcion): Observable<AsignaturaOpcion[]> {
    const params = new HttpParams().set('estado', estado);
    return this.http.get<AsignaturaOpcion[]>(this.baseUrl, { params });
  }
}
