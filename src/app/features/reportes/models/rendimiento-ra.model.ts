/**
 * Modelos del reporte R1 (rendimiento académico por RA y asignatura), alineados con los DTO del
 * backend (co.edu.uco.sigra.reportes.dto). Ruta: GET /api/v1/reportes/rendimiento-ra.
 */
import { NivelBadge } from '../../../shared/ui/badge-nivel-logro/badge-nivel-logro';

export type NivelLogro = 'BAJO' | 'MEDIO' | 'ALTO' | 'SOBRESALIENTE';
export type EstadoRendimiento = 'SIN_EVALUAR' | 'DATOS_INSUFICIENTES' | 'CON_NIVEL';

export interface DistribucionNivel {
  nivel: NivelLogro;
  cantidad: number;
  porcentaje: number;
}

export interface RaRendimiento {
  resultadoAprendizajeId: string;
  codigo: string;
  descripcion: string;
  cantidadCalificaciones: number;
  estado: EstadoRendimiento;
  nivelLogro: NivelLogro | null;
  promedioNota: number | null;
  evaluados: number;
  sinDatosSuficientes: number;
  sinEvaluar: number;
  distribucion: DistribucionNivel[];
  mensaje: string | null;
}

export interface AsignaturaRendimiento {
  asignaturaId: string;
  codigo: string;
  nombre: string;
  programaId: string;
  programaNombre: string;
  facultadId: string;
  facultadNombre: string;
  resultados: RaRendimiento[];
}

export interface RendimientoRaReporte {
  semestreId: string | null;
  semestreCodigo: string | null;
  asignaturas: AsignaturaRendimiento[];
  mensaje: string | null;
}

/** Filtros opcionales; sin semestre el backend usa el semestre activo. */
export interface FiltrosRendimientoRa {
  semestreId?: string;
  facultadId?: string;
  programaId?: string;
  asignaturaId?: string;
}

/** Badge que corresponde al estado del RA: el nivel si lo hay, o el estado sin nivel. */
export function badgeDeRa(ra: Pick<RaRendimiento, 'estado' | 'nivelLogro'>): NivelBadge {
  if (ra.estado === 'CON_NIVEL' && ra.nivelLogro) {
    return ra.nivelLogro;
  }
  return ra.estado === 'DATOS_INSUFICIENTES' ? 'SIN_DATOS' : 'SIN_EVALUAR';
}
