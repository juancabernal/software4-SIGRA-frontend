/** Estado de un programa académico (RF-02). Nunca se borra: se inactiva. */
export type EstadoPrograma = 'ACTIVO' | 'INACTIVO';

/** Programa tal como lo devuelve /api/v1/programas. */
export interface Programa {
  id: string;
  codigo: string;
  nombre: string;
  estado: EstadoPrograma;
}

/** Cuerpo de POST /api/v1/programas. El código no puede cambiar después de creado. */
export interface ProgramaRequest {
  nombre: string;
  codigo: string;
}

/** Filtros de la consulta. Solo se envían los que tienen valor. */
export interface FiltrosProgramas {
  nombre?: string;
  codigo?: string;
  estado?: EstadoPrograma;
}

/** Reglas de RF-02, espejo de las validaciones del backend. */
export const NOMBRE_MAX = 100;
export const CODIGO_MIN = 4;
export const CODIGO_MAX = 10;
export const PATRON_CODIGO = /^[A-Za-z0-9-]+$/;
