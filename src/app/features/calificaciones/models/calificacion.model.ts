export const NOTA_MINIMA = 0;
export const NOTA_MAXIMA = 5;
export const OBSERVACION_MIN = 10;
export const OBSERVACION_MAX = 500;

export interface FilaPlanilla {
  matriculaId: string;
  estudianteId: string;
  numeroDocumento: string;
  nombreCompleto: string;
  matriculaActiva: boolean;
  calificacionId: string | null;
  nota: number | null;
  observacion: string | null;
  fueraDeFecha: boolean | null;
  fechaRegistro: string | null;
  fechaModificacion: string | null;
}

/** PlanillaCalificacionesDTO. */
export interface PlanillaCalificaciones {
  evaluacionId: string;
  evaluacionNombre: string;
  fechaTentativa: string;
  porcentaje: number;
  estadoEvaluacion: 'ACTIVA' | 'INACTIVA';
  semestreId: string;
  semestreCodigo: string;
  asignaturaId: string;
  asignaturaCodigo: string;
  asignaturaNombre: string;
  resultadoAprendizajeCodigo: string;
  totalEstudiantes: number;
  totalCalificados: number;
  filas: FilaPlanilla[];
}

/** CalificacionResponseDTO. */
export interface Calificacion {
  id: string;
  evaluacionId: string;
  matriculaId: string;
  estudianteId: string;
  estudianteNombre: string;
  nota: number;
  observacion: string;
  fechaRegistro: string;
  fechaModificacion: string | null;
  fueraDeFecha: boolean;
}

/** CalificacionRequestDTO (POST). */
export interface CalificacionRequest {
  matriculaId: string;
  nota: number;
  observacion: string;
}

/** CalificacionModificarRequestDTO (PUT). */
export interface CalificacionModificarRequest {
  nota: number;
  observacion: string;
}

/** HistorialCalificacionDTO. */
export interface EventoHistorialCalificacion {
  id: string;
  tipoEvento: 'REGISTRO' | 'MODIFICACION';
  notaAnterior: number | null;
  notaNueva: number;
  observacionAnterior: string | null;
  observacionNueva: string;
  fueraDeFecha: boolean;
  usuarioId: string | null;
  rolUsuario: string | null;
  fechaEvento: string;
}

/** Lo mínimo de una evaluación que necesita el selector de la planilla (EvaluacionResponseDTO). */
export interface EvaluacionOpcion {
  id: string;
  nombre: string;
  fechaTentativa: string;
  porcentaje: number;
  estado: 'ACTIVA' | 'INACTIVA';
}
