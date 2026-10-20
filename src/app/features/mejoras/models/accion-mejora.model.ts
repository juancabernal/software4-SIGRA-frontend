/**
 * Modelos del módulo de acciones de mejora (RF-17), alineados con los DTO del backend
 * (co.edu.uco.sigra.mejoras.dto). Ruta base: /api/v1/acciones-mejora.
 */

export const NOMBRE_ACCION_MAX = 30;
export const DESCRIPCION_ACCION_MAX = 100;

/** AccionMejoraResponseDTO. */
export interface AccionMejora {
  id: string;
  nombre: string;
  descripcion: string;
  fechaPropuesta: string;
  resultadoAprendizajeId: string;
  resultadoAprendizajeCodigo: string;
  asignaturaId: string;
  semestreId: string;
  semestreCodigo: string;
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
  semestreId?: string;
  asignaturaId?: string;
  convertida?: boolean;
}

/** Cuerpo de POST /acciones-mejora/{id}/conversion (RF-18). */
export interface ConversionAccionMejora {
  fechaTentativa: string;
  porcentaje: number;
}
