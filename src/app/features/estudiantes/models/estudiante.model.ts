/**
 * Modelos del módulo de estudiantes, alineados con los DTO del backend
 * (co.edu.uco.sigra.estudiantes.dto). Ruta base: /api/v1/estudiantes.
 */

/** Inactivación lógica: un estudiante INACTIVO sigue apareciendo en el listado. */
export type EstadoEstudiante = 'ACTIVO' | 'INACTIVO';

/** EstudianteRequestDTO (POST y PUT). El documento no se puede modificar tras el registro. */
export interface EstudianteRequest {
  tipoDocumentoId: string;
  numeroDocumento: string;
  nombreCompleto: string;
  correoInstitucional: string;
}

/**
 * EstudianteResponseDTO. No extiende `EstudianteRequest` a propósito (D2): la respuesta trae
 * `tipoDocumentoNombre`, nunca `tipoDocumentoId`. Declararla como extensión de la petición
 * mentiría sobre un campo que nunca llega y dejaría pasar un pre-llenado del formulario de
 * modificación que falla en ejecución.
 */
export interface Estudiante {
  id: string;
  tipoDocumentoNombre: string;
  numeroDocumento: string;
  nombreCompleto: string;
  correoInstitucional: string;
  estado: EstadoEstudiante;
}

/** Formato de error común de la API (ErrorResponseBuilder del backend). */
export interface ApiError {
  timestamp?: string;
  status?: number;
  error?: string;
  mensaje?: string;
  detalles?: unknown;
}
