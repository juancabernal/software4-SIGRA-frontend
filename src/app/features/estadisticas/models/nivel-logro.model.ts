/**
 * Modelos de nivel de logro y estadísticas (RF-14, RF-15), alineados con los DTO del backend
 * (co.edu.uco.sigra.estadisticas.dto). Rutas:
 * GET  /api/v1/resultados-aprendizaje/{raId}/semestres/{semestreId}/estadisticas
 * POST /api/v1/resultados-aprendizaje/{raId}/semestres/{semestreId}/estadisticas/recalculo
 * GET  /api/v1/niveles-logro
 */
import { Conclusion } from './conclusion.model';

/** NivelLogro del backend, en orden ascendente. */
export type NivelLogro = 'BAJO' | 'MEDIO' | 'ALTO' | 'SOBRESALIENTE';

/** Orden en que el backend entrega la distribución y el catálogo. */
export const NIVELES_LOGRO: readonly NivelLogro[] = ['BAJO', 'MEDIO', 'ALTO', 'SOBRESALIENTE'];

/** Etiqueta visible de cada nivel. */
export const ETIQUETA_NIVEL: Readonly<Record<NivelLogro, string>> = {
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
  SOBRESALIENTE: 'Sobresaliente',
};

/** DistribucionNivelLogroDTO: el porcentaje es sobre los evaluados. */
export interface DistribucionNivelLogro {
  nivel: NivelLogro;
  cantidad: number;
  porcentaje: number;
}

/** EstadisticasResultadoAprendizajeResponseDTO. */
export interface EstadisticasResultadoAprendizaje {
  resultadoAprendizajeId: string;
  codigoResultadoAprendizaje: string;
  asignaturaId: string;
  semestreId: string;
  codigoSemestre: string;
  /** Matriculados activos más quienes tienen calificaciones en el RA. */
  totalEstudiantes: number;
  /** Con nivel calculado: 3 o más calificaciones. */
  evaluados: number;
  /** Con 1 o 2 calificaciones: «sin datos suficientes para calcular». */
  sinDatosSuficientes: number;
  /** Sin ninguna calificación en el RA: «Sin evaluar». */
  sinEvaluar: number;
  /** 0.0 – 5.0 con dos decimales; null si no hay evaluados. */
  promedioNota: number | null;
  promedioPorcentaje: number | null;
  /** Siempre los 4 niveles, en orden. */
  distribucion: DistribucionNivelLogro[];
  /** ISO local (sin zona); null si nunca se ha recalculado. */
  fechaCalculo: string | null;
}

/** RangoNivelLogroResponseDTO: [notaMinima, notaLimite) o [notaMinima, notaLimite] si limiteIncluido. */
export interface RangoNivelLogro {
  nivel: NivelLogro;
  notaMinima: number;
  notaLimite: number;
  limiteIncluido: boolean;
}

/** GenerarConclusionResponseDTO: generada=false no es un error (RF-16). */
export interface GenerarConclusion {
  generada: boolean;
  motivo: string | null;
  conclusion: Conclusion | null;
}

/** RecalculoEstadisticasResponseDTO. */
export interface RecalculoEstadisticas {
  estadisticas: EstadisticasResultadoAprendizaje;
  conclusion: GenerarConclusion | null;
}
