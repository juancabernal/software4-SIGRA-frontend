/**
 * Modelos del módulo de resultados de aprendizaje (RF-06), alineados con los DTO del backend
 * (co.edu.uco.sigra.resultadosaprendizaje.dto). Rutas: /api/v1/asignaturas/{id}/resultados-aprendizaje
 * y /api/v1/resultados-aprendizaje/{id}.
 */

/** EstadoRegistro del backend. */
export type EstadoResultadoAprendizaje = 'ACTIVO' | 'INACTIVO';

/** ResultadoAprendizajeResponseDTO. */
export interface ResultadoAprendizaje {
  id: string;
  asignaturaId: string;
  codigo: string;
  descripcion: string;
  estado: EstadoResultadoAprendizaje;
}

/** ResultadoAprendizajeCrearRequestDTO. La asignatura viaja en la URL, no en el cuerpo. */
export interface ResultadoAprendizajeCrearRequest {
  codigo: string;
  descripcion: string;
}

/** ResultadoAprendizajeActualizarRequestDTO: solo la descripción es modificable. */
export interface ResultadoAprendizajeActualizarRequest {
  descripcion: string;
}

/** Ciclo de vida de la asignatura según el backend (EstadoAsignatura). */
export type EstadoAsignaturaOpcion = 'BORRADOR' | 'ACTIVA' | 'INACTIVA';

/**
 * AsignaturaResponseDTO, solo con lo que necesita el selector de esta vista.
 * `cantidadRa` cuenta únicamente los RA ACTIVOS.
 */
export interface AsignaturaOpcion {
  id: string;
  codigo: string;
  nombre: string;
  programaId: string;
  programaNombre: string;
  estado: EstadoAsignaturaOpcion;
  cantidadRa: number;
}

/** Estados de asignatura en los que se gestionan RA: en BORRADOR se cargan para poder activarla. */
export const ESTADOS_GESTIONABLES: readonly EstadoAsignaturaOpcion[] = ['BORRADOR', 'ACTIVA'];

/**
 * Mismas reglas que valida el backend (ReglasEntradaResultadoAprendizaje). Ambos campos se evalúan
 * ya normalizados, igual que en el backend: código recortado y en mayúsculas; descripción con los
 * espacios repetidos (incluidos saltos de línea) reducidos a uno y recortada.
 */
export const CODIGO_MAX = 10;
export const DESCRIPCION_MIN = 10;
export const DESCRIPCION_MAX = 100;
/** Letras sin tilde y números, con guiones solo entre ellos (por ejemplo RA-01). */
export const PATRON_CODIGO = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
/** Sin < ni > y sin caracteres de control ni de formato invisibles. */
export const PATRON_DESCRIPCION_PROHIBIDO = /[<>\p{Cc}\p{Cf}]/u;

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

export function normalizarDescripcion(descripcion: string): string {
  return descripcion
    .normalize('NFC')
    .replace(/[\s\p{Z}]+/gu, ' ')
    .trim();
}

/** Rango de RA activos por asignatura. */
export const MIN_RA_ACTIVOS = 5;
export const MAX_RA_ACTIVOS = 7;

/** EstadoRendimiento del backend (RF-14 / RF-15). */
export type EstadoRendimiento = 'SIN_EVALUAR' | 'DATOS_INSUFICIENTES' | 'CON_NIVEL';

/** NivelLogro del backend (módulo estadísticas). */
export type NivelLogro = 'BAJO' | 'MEDIO' | 'ALTO' | 'SOBRESALIENTE';

/** RendimientoResultadoAprendizajeResponseDTO. `nivelLogro` y `promedioNota` solo vienen con CON_NIVEL. */
export interface RendimientoResultado {
  resultadoAprendizajeId: string;
  codigo: string;
  estado: EstadoRendimiento;
  nivelLogro: NivelLogro | null;
  promedioNota: number | null;
  porcentajeAsignado: number;
  porcentajeEvaluado: number;
  completo: boolean;
}

/**
 * RendimientoAsignaturaResponseDTO. Sin semestre activo, `semestreId` es null y `resultados` va vacío.
 */
export interface RendimientoAsignatura {
  asignaturaId: string;
  semestreId: string | null;
  semestreCodigo: string | null;
  resultados: RendimientoResultado[];
}
