/**
 * Modelos del módulo de resultados de aprendizaje (RF-06), alineados con los DTO del backend
 * (co.edu.uco.sigra.resultadosaprendizaje.dto). Rutas: /api/v1/asignaturas/{id}/resultados-aprendizaje
 * y /api/v1/resultados-aprendizaje/{id}.
 */

/** EstadoRegistro del backend. */
export type EstadoResultadoAprendizaje = 'ACTIVO' | 'INACTIVO';

/** ResultadoAprendizajeResponseDTO. */
export interface ResultadoAprendizaje {
  id: string;
  asignaturaId: string;
  codigo: string;
  descripcion: string;
  estado: EstadoResultadoAprendizaje;
}

/** ResultadoAprendizajeCrearRequestDTO. La asignatura viaja en la URL, no en el cuerpo. */
export interface ResultadoAprendizajeCrearRequest {
  codigo: string;
  descripcion: string;
}

/** ResultadoAprendizajeActualizarRequestDTO: solo la descripción es modificable. */
export interface ResultadoAprendizajeActualizarRequest {
  descripcion: string;
}

/** Ciclo de vida de la asignatura según el backend (EstadoAsignatura). */
export type EstadoAsignaturaOpcion = 'BORRADOR' | 'ACTIVA' | 'INACTIVA';

/**
 * AsignaturaResponseDTO, solo con lo que necesita el selector de esta vista.
 * `cantidadRa` cuenta únicamente los RA ACTIVOS.
 */
export interface AsignaturaOpcion {
  id: string;
  codigo: string;
  nombre: string;
  estado: EstadoAsignaturaOpcion;
  cantidadRa: number;
}

/** Estados de asignatura en los que se gestionan RA: en BORRADOR se cargan para poder activarla. */
export const ESTADOS_GESTIONABLES: readonly EstadoAsignaturaOpcion[] = ['BORRADOR', 'ACTIVA'];

/** Mismas reglas que valida el backend en los DTO (longitudes del MER). */
export const CODIGO_MAX = 10;
export const DESCRIPCION_MAX = 500;
/** Sin espacios internos (mismo patrón del backend); se guarda recortado y en mayúsculas. */
export const PATRON_CODIGO = /^\s*\S+\s*$/;

/** Rango de RA activos por asignatura. */
export const MIN_RA_ACTIVOS = 5;
export const MAX_RA_ACTIVOS = 7;
