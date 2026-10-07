import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { OpcionAsignatura, OpcionSemestre } from '../models/matricula.model';

interface AsignaturaCatalogoDTO {
  id: string;
  nombre: string;
  estado: OpcionAsignatura['estado'];
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

  listarAsignaturas(): Observable<OpcionAsignatura[]> {
    return this.http
      .get<AsignaturaCatalogoDTO[]>(`${environment.apiUrl}/v1/asignaturas`)
      .pipe(
        map((asignaturas) => asignaturas.map(({ id, nombre, estado }) => ({ id, nombre, estado }))),
      );
  }

  listarSemestres(): Observable<OpcionSemestre[]> {
    return this.http
      .get<SemestreCatalogoDTO[]>(`${environment.apiUrl}/v1/semestres`)
      .pipe(
        map((semestres) => semestres.map(({ id, codigo, estado }) => ({ id, codigo, estado }))),
      );
  }
}
