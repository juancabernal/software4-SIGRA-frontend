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
