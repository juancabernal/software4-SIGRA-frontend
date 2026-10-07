import { VarianteChip } from '../../../shared/ui/chip-estado/chip-estado';

/**
 * Modelos del módulo de estudiantes, alineados con los DTO del backend
 * (co.edu.uco.sigra.estudiantes.dto). Ruta base: /api/v1/estudiantes.
 */

/** Inactivación lógica: un estudiante INACTIVO sigue apareciendo en el listado. */
export type EstadoEstudiante = 'ACTIVO' | 'INACTIVO';

interface PresentacionEstado {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
}

/**
 * Ícono + texto + color para pintar con `<app-chip-estado>`: el color nunca va solo (RNF-21).
 * Mismo criterio que `PRESENTACION_ESTADO` en `materias-tab.ts`.
 */
export const PRESENTACION_ESTADO_ESTUDIANTE: Readonly<
  Record<EstadoEstudiante, PresentacionEstado>
> = {
  ACTIVO: { etiqueta: 'Activo', variante: 'ok', icono: 'check' },
  INACTIVO: { etiqueta: 'Inactivo', variante: 'neutro', icono: 'prohibido' },
};

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
