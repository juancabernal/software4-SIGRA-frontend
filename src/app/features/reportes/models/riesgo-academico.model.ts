/**
 * Modelos del reporte R6 (riesgo académico), alineados con los DTO del backend.
 * Ruta: GET /api/v1/reportes/riesgo-academico.
 */
import { NivelBadge } from '../../../shared/ui/badge-nivel-logro/badge-nivel-logro';
import { VarianteChip } from '../../../shared/ui/chip-estado/chip-estado';

export type NivelInsuficiente = 'BAJO' | 'MEDIO';
export type SeveridadRiesgo = 'ATENCION' | 'RIESGO' | 'ALTO_RIESGO';

export interface RaNoAlcanzado {
  resultadoAprendizajeId: string;
  codigo: string;
  descripcion: string;
  nivelLogro: NivelInsuficiente;
  promedio: number | null;
}

export interface EstudianteRiesgo {
  estudianteId: string;
  nombreCompleto: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string;
  correoInstitucional: string;
  numeroDocumento: string;
  asignaturaId: string;
  asignaturaCodigo: string;
  asignaturaNombre: string;
  programaNombre: string;
  cantidadRaNoAlcanzados: number;
  severidad: SeveridadRiesgo;
  ras: RaNoAlcanzado[];
}

export interface RiesgoAcademicoReporte {
  semestreId: string | null;
  semestreCodigo: string | null;
  totalEstudiantesEnRiesgo: number;
  estudiantes: EstudianteRiesgo[];
  mensaje: string | null;
}

export interface FiltrosRiesgoAcademico {
  semestreId?: string;
  programaId?: string;
  asignaturaId?: string;
  minRaNoAlcanzados?: number;
}

export function badgeDeRaInsuficiente(nivel: NivelInsuficiente): NivelBadge {
  return nivel;
}

export function chipSeveridad(severidad: SeveridadRiesgo): {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
} {
  switch (severidad) {
    case 'ALTO_RIESGO':
      return { etiqueta: 'Alto riesgo', variante: 'peligro', icono: 'advertencia' };
    case 'RIESGO':
      return { etiqueta: 'Riesgo', variante: 'advertencia', icono: 'advertencia' };
    default:
      return { etiqueta: 'Atención', variante: 'neutro', icono: 'ojo' };
  }
}
