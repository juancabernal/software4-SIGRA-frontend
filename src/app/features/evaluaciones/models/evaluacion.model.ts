/**
 * Modelos del módulo de evaluaciones (RF-10 / RF-11), alineados con los DTO del backend
 * (co.edu.uco.sigra.evaluaciones.dto). Rutas: /api/v1/resultados-aprendizaje/{raId}/evaluaciones
 * y /api/v1/evaluaciones/{id}.
 */

/** EstadoEvaluacion del backend. */
export type EstadoEvaluacion = 'ACTIVA' | 'INACTIVA';

/** EvaluacionResponseDTO. La fecha llega como texto AAAA-MM-DD. */
export interface Evaluacion {
  id: string;
  resultadoAprendizajeId: string;
  semestreId: string;
  semestreCodigo: string;
  nombre: string;
  fechaTentativa: string;
  porcentaje: number;
  descripcion: string;
  estado: EstadoEvaluacion;
  /** Con calificaciones registradas, la fecha tentativa y el porcentaje no se pueden cambiar. */
  tieneCalificaciones: boolean;
}

/** EvaluacionesRaResumenDTO: evaluaciones del RA en un semestre y el porcentaje de las ACTIVAS. */
export interface EvaluacionesRaResumen {
  resultadoAprendizajeId: string;
  semestreId: string;
  semestreCodigo: string;
  porcentajeAsignado: number;
  porcentajeDisponible: number;
  evaluaciones: Evaluacion[];
}

/** EvaluacionCrearRequestDTO y EvaluacionActualizarRequestDTO (mismos campos). */
export interface EvaluacionRequest {
  nombre: string;
  fechaTentativa: string;
  porcentaje: number;
  descripcion: string;
}

/** AsignaturaResponseDTO, solo con lo que usa el selector de materia. */
export interface AsignaturaOpcion {
  id: string;
  codigo: string;
  nombre: string;
  programaNombre: string;
  estado: 'BORRADOR' | 'ACTIVA' | 'INACTIVA';
}

/** SemestreResponseDTO, solo con lo que usan el selector y la validación de la fecha. */
export interface SemestreOpcion {
  id: string;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
}

// ── Reglas de entrada (ReglasEntradaEvaluacion del backend) ──────────────
export const NOMBRE_MAX = 30;
export const DESCRIPCION_MAX = 100;
export const PORCENTAJE_MAX = 100;
/** Sin < ni > y sin caracteres de control ni de formato invisibles. */
export const PATRON_TEXTO_PROHIBIDO = /[<>\p{Cc}\p{Cf}]/u;

/** Igual que el backend: NFC, espacios repetidos (incluidos saltos de línea) reducidos a uno y recorte. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFC')
    .replace(/[\s\p{Z}]+/gu, ' ')
    .trim();
}

/** Los porcentajes se comparan en centésimas para evitar errores de coma flotante. */
export function enCentesimas(valor: number): number {
  return Math.round(valor * 100);
}

export function tieneMaximoDosDecimales(valor: number): boolean {
  return Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6;
}

// ── Fechas (AAAA-MM-DD, como fechas locales) ────────────────────────────
export function hoyIso(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

/** Semestre en curso: el que contiene la fecha de hoy (el backend lo calcula igual, por fechas). */
export function esSemestreEnCurso(semestre: SemestreOpcion, hoy = hoyIso()): boolean {
  return semestre.fechaInicio <= hoy && hoy <= semestre.fechaFin;
}

/**
 * Semestre que se muestra por defecto: el que está en curso. Si hoy no hay ninguno (por ejemplo,
 * entre dos semestres), el último que ya empezó; y si ninguno ha empezado, el próximo en empezar.
 * Así nunca se elige por defecto un semestre lejano en el futuro.
 */
export function semestrePorDefecto(
  semestres: readonly SemestreOpcion[],
  hoy = hoyIso(),
): SemestreOpcion | null {
  const enCurso = semestres.find((s) => esSemestreEnCurso(s, hoy));
  if (enCurso) {
    return enCurso;
  }
  const yaEmpezados = semestres
    .filter((s) => s.fechaInicio <= hoy)
    .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  if (yaEmpezados.length) {
    return yaEmpezados[0];
  }
  const futuros = [...semestres].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  return futuros[0] ?? null;
}

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** «20 nov 2026». */
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const partes = formatoFecha.formatToParts(new Date(anio, mes - 1, dia));
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';
  return `${valor('day')} ${valor('month').replace('.', '')} ${valor('year')}`;
}

const formatoPorcentaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/** «25,5 %». */
export function formatearPorcentaje(valor: number): string {
  return `${formatoPorcentaje.format(valor)} %`;
}

/** Opciones del selector de filas por página. */
export const TAMANOS_PAGINA: readonly number[] = [5, 10, 15];
