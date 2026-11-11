/** Estado de un programa académico (RF-02). Nunca se borra: se inactiva. */
export type EstadoPrograma = 'ACTIVO' | 'INACTIVO';

/** Programa tal como lo devuelve /api/v1/programas. */
export interface Programa {
  id: string;
  codigo: string;
  nombre: string;
  facultadId: string;
  facultadNombre: string;
  estado: EstadoPrograma;
}

/** Cuerpo de POST /api/v1/programas. El código no puede cambiar después de creado. */
export interface ProgramaRequest {
  nombre: string;
  codigo: string;
  facultadId: string;
}

/**
 * Cuerpo de PUT /api/v1/programas/{id}. Sin `facultadId`, o con la misma que ya tiene, el programa
 * conserva su facultad aunque esté inactiva; una facultad distinta debe existir y estar activa.
 */
export interface ProgramaModificacionRequest {
  nombre: string;
  facultadId?: string;
}

/** Filtros de la consulta. Solo se envían los que tienen valor. */
export interface FiltrosProgramas {
  nombre?: string;
  codigo?: string;
  facultadId?: string;
  estado?: EstadoPrograma;
}

/**
 * Facultad a la que el backend movió los programas que existían antes de asociarlos a facultades.
 * El administrador debe reasignarlos editándolos.
 */
export const FACULTAD_SIN_ASIGNAR_ID = '00000000-0000-4000-fa00-000000000001';

/** Reglas de RF-02, espejo de las validaciones del backend. */
export const NOMBRE_MAX = 100;
export const CODIGO_MIN = 4;
export const CODIGO_MAX = 10;
export const PATRON_CODIGO = /^[A-Za-z0-9-]+$/;
