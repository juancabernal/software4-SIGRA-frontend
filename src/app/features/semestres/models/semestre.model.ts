/**
 * Modelos del módulo de semestres, alineados con los DTO del backend
 * (co.edu.uco.sigra.semestres.dto). Ruta base: /api/v1/semestres.
 */

/** Estado calculado por el backend a partir de las fechas: ACTIVO solo si hoy está dentro del rango. */
export type EstadoSemestre = 'ACTIVO' | 'INACTIVO';

/** SemestreResponseDTO. Las fechas llegan como texto AAAA-MM-DD. */
export interface Semestre {
  id: string;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoSemestre;
}

/** SemestreRequestDTO (POST /semestres). */
export interface SemestreRequest {
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
}

/** SemestreFechaFinRequestDTO (PATCH /semestres/{codigo}): única modificación permitida. */
export interface SemestreFechaFinRequest {
  fechaFin: string;
}

/** Formato de error común de la API (ErrorResponseBuilder del backend). */
export interface ApiError {
  timestamp?: string;
  status?: number;
  error?: string;
  mensaje?: string;
  detalles?: unknown;
}
