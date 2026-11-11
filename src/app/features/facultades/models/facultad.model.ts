/** Estado de una facultad. La inactivación es lógica y no existe reactivación. */
export type EstadoFacultad = 'ACTIVO' | 'INACTIVO';

/** Facultad tal como la devuelve /api/v1/facultades. */
export interface Facultad {
  id: string;
  nombre: string;
  estado: EstadoFacultad;
}

/** Cuerpo de POST y PUT /api/v1/facultades. */
export interface FacultadRequest {
  nombre: string;
}

/** Filtros de la consulta. Solo se envían los que tienen valor. */
export interface FiltrosFacultades {
  nombre?: string;
  estado?: EstadoFacultad;
}

export const NOMBRE_MAX = 150;
