/**
 * Modelos del módulo de asignaturas, alineados con los DTO del backend
 * (co.edu.uco.sigra.asignaturas.dto). Ruta base: /api/v1/asignaturas.
 */

/** Ciclo de vida: BORRADOR → ACTIVA → INACTIVA. Una asignatura INACTIVA no se reactiva. */
export type EstadoAsignatura = 'BORRADOR' | 'ACTIVA' | 'INACTIVA';

/** AsignaturaResponseDTO. `cantidadRa` cuenta solo los RA ACTIVOS. */
export interface Asignatura {
  id: string;
  codigo: string;
  nombre: string;
  programaId: string;
  programaNombre: string;
  estado: EstadoAsignatura;
  cantidadRa: number;
}

/** AsignaturaRequestDTO (POST /asignaturas). La materia nace en BORRADOR. */
export interface AsignaturaRequest {
  codigo: string;
  nombre: string;
  programaId: string;
}

/**
 * Mismas reglas que valida el backend en AsignaturaRequestDTO. El código se evalúa recortado
 * (el backend además lo pasa a mayúsculas) y el nombre recortado y con los espacios reducidos.
 */
export const NOMBRE_MIN = 3;
export const NOMBRE_MAX = 100;
export const CODIGO_MIN = 3;
export const CODIGO_MAX = 20;
/** Letras y números en bloques separados por un solo guion: sin espacios ni guiones sueltos. */
export const PATRON_CODIGO = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;
/** Caracteres de control o de formato (\p{Cc}, \p{Cf}) y los signos < y >. */
export const PATRON_NOMBRE_PROHIBIDO = /[\p{Cc}\p{Cf}<>]/u;

/** Filtros de GET /asignaturas; todos opcionales y combinados con AND en el backend. */
export interface FiltrosAsignaturas {
  texto?: string;
  programaId?: string;
  estado?: EstadoAsignatura;
  raMin?: number;
  raMax?: number;
}

/** ProgramaResponseDTO de GET /programas, usado en el selector de programa. */
export interface ProgramaOpcion {
  id: string;
  codigo: string;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

/** Rango de RA activos que exige el backend para activar una asignatura (RF-03d). */
export const MIN_RA = 5;
export const MAX_RA = 7;

/** Validación de experiencia de usuario; la regla real la aplica el backend. */
export function puedeActivarse(asignatura: Pick<Asignatura, 'estado' | 'cantidadRa'>): boolean {
  return (
    asignatura.estado === 'BORRADOR' &&
    asignatura.cantidadRa >= MIN_RA &&
    asignatura.cantidadRa <= MAX_RA
  );
}
