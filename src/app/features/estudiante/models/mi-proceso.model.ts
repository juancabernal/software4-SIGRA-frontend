export type SituacionMateria = 'EN_CURSO' | 'PROGRAMADA' | 'CURSADA' | 'DESVINCULADA';
export type NivelLogro = 'BAJO' | 'MEDIO' | 'ALTO' | 'SOBRESALIENTE' | 'SIN_EVALUAR';

export interface MiMateria {
  matriculaId: string;
  asignaturaCodigo: string;
  asignaturaNombre: string;
  programaNombre: string | null;
  semestreCodigo: string;
  fechaMatricula: string;
  situacion: SituacionMateria;
}

export interface MiMateriaDetalle extends MiMateria {
  resultadosAprendizaje: MiResultadoAprendizaje[];
}

export interface MiResultadoAprendizaje {
  codigo: string;
  descripcion: string;
  nivelLogro: NivelLogro;
  promedio: number | null;
  evaluacionesCalificadas: number;
  evaluacionesTotales: number;
  evaluaciones: MiEvaluacion[];
}

export interface MiEvaluacion {
  nombre: string;
  descripcion: string | null;
  fecha: string | null;
  porcentaje: number;
  nota: number | null;
  observacion: string | null;
}

export const ETIQUETA_SITUACION: Readonly<Record<SituacionMateria, string>> = {
  EN_CURSO: 'En curso',
  PROGRAMADA: 'Programada',
  CURSADA: 'Cursada',
  DESVINCULADA: 'Desvinculada',
};

export const ETIQUETA_NIVEL: Readonly<Record<NivelLogro, string>> = {
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
  SOBRESALIENTE: 'Sobresaliente',
  SIN_EVALUAR: 'Sin evaluar',
};

export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) {
    return '';
  }
  const esSoloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const valor = new Date(esSoloFecha ? `${fecha}T00:00:00Z` : fecha);
  if (Number.isNaN(valor.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: esSoloFecha ? 'UTC' : 'America/Bogota',
  }).format(valor);
}

export function formatearNumero(valor: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(valor);
}
