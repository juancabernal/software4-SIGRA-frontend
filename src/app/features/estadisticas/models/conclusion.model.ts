/**
 * Modelos del módulo de estadísticas (RF-16), alineados con los DTO del backend
 * (co.edu.uco.sigra.estadisticas.dto). Ruta base: /api/v1/conclusiones.
 */

/** VIGENTE: desempeño insuficiente sin atender todavía; ATENDIDA: ya tiene acción de mejora. */
export type EstadoConclusion = 'VIGENTE' | 'ATENDIDA';

/** ConclusionResponseDTO. */
export interface Conclusion {
  id: string;
  resultadoAprendizajeId: string;
  resultadoAprendizajeCodigo: string;
  asignaturaId: string;
  semestreId: string;
  semestreCodigo: string;
  mensaje: string;
  tieneDatosSuficientes: boolean;
  fechaGeneracion: string;
  porcentajeInsuficiente: number;
  estado: EstadoConclusion;
}

/** Filtros de GET /conclusiones; todos opcionales y combinados con AND en el backend. */
export interface FiltrosConclusion {
  resultadoAprendizajeId?: string;
  semestreId?: string;
  asignaturaId?: string;
  estado?: EstadoConclusion;
}
