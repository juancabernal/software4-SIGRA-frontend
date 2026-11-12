import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { SesionService } from '../../../core/services/sesion';
import { OpcionAsignatura, OpcionSemestre } from '../models/matricula.model';

interface AsignaturaCatalogoDTO {
  id: string;
  nombre: string;
  estado: OpcionAsignatura['estado'];
  facultadId: string;
  facultadNombre: string;
}

interface SemestreCatalogoDTO {
  id: string;
  codigo: string;
  estado: OpcionSemestre['estado'];
}

/**
 * Lectura de solo catálogo para poblar los dos selectores del formulario de matrícula (D5). No
 * importa nada de `features/asignaturas` ni de `features/semestres`: lee los mismos endpoints y se
 * queda solo con los tres campos que necesita cada selector.
 */
@Injectable({ providedIn: 'root' })
export class CatalogosMatriculaService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionService);

  /** El backend filtra por semestre y facultad; solo se envían los que tienen valor. */
  listarAsignaturas(semestreId?: string, facultadId?: string): Observable<OpcionAsignatura[]> {
    let params = new HttpParams();
    if (semestreId) params = params.set('semestreId', semestreId);
    if (facultadId) params = params.set('facultadId', facultadId);
    return this.http
      .get<AsignaturaCatalogoDTO[]>(`${environment.apiUrl}/v1/asignaturas`, { params })
      .pipe(
        map((asignaturas) =>
          asignaturas.map(({ id, nombre, estado, facultadId, facultadNombre }) => ({
            id,
            nombre,
            estado,
            facultadId,
            facultadNombre,
          })),
        ),
      );
  }

  listarSemestres(): Observable<OpcionSemestre[]> {
    return this.http
      .get<SemestreCatalogoDTO[]>(`${environment.apiUrl}/v1/semestres${this.sesion.rol() === 'profesor' ? '/mios' : ''}`)
      .pipe(
        map((semestres) => semestres.map(({ id, codigo, estado }) => ({ id, codigo, estado }))),
      );
  }
}
