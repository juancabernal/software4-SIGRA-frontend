/**
 * Modelos del módulo de acciones de mejora (RF-17), alineados con los DTO del backend
 * (co.edu.uco.sigra.mejoras.dto). Ruta base: /api/v1/acciones-mejora.
 */

export const NOMBRE_ACCION_MAX = 150;
export const DESCRIPCION_ACCION_MAX = 500;

/** AccionMejoraResponseDTO. */
export interface AccionMejora {
  id: string;
  nombre: string;
  descripcion: string;
  fechaPropuesta: string;
  resultadoAprendizajeId: string;
  resultadoAprendizajeCodigo: string;
  asignaturaId: string;
  conclusionOrigenId: string;
  evaluacionGeneradaId: string | null;
  convertida: boolean;
}

/** Cuerpo de POST /conclusiones/{conclusionId}/acciones-mejora. */
export interface RegistroAccionMejora {
  nombre: string;
  descripcion: string;
}

/** Filtros de GET /acciones-mejora; todos opcionales y combinados con AND en el backend. */
export interface FiltrosAccionMejora {
  resultadoAprendizajeId?: string;
  asignaturaId?: string;
  convertida?: boolean;
}
