/**
 * Modelos del reporte R2 (matrículas por programa y semestre), alineados con el contrato del
 * backend. Ruta: GET /api/v1/reportes/matriculas-programa-semestre.
 */
export interface FiltrosMatriculasProgramaSemestre {
  semestreId?: string;
  programaId?: string;
  facultadId?: string;
}

export interface ResumenMatriculasProgramaSemestre {
  totalMatriculas: number;
  activas: number;
  desvinculadas: number;
  estudiantesDistintos: number;
  programas: number;
  semestres: number;
}

export interface FilaMatriculasProgramaSemestre {
  semestreId: string;
  semestreCodigo: string;
  semestreFechaInicio: string | null;
  semestreEstado: 'ACTIVO' | 'INACTIVO';
  programaId: string;
  programaCodigo: string;
  programaNombre: string;
  facultadNombre: string;
  totalMatriculas: number;
  activas: number;
  desvinculadas: number;
  estudiantes: number;
  asignaturas: number;
}

export interface MatriculasProgramaSemestreReporte {
  semestreId: string | null;
  programaId: string | null;
  facultadId: string | null;
  resumen: ResumenMatriculasProgramaSemestre;
  filas: FilaMatriculasProgramaSemestre[];
}

const ENCABEZADOS_CSV = [
  'Semestre',
  'Programa',
  'Facultad',
  'Activas',
  'Desvinculadas',
  'Total',
  'Estudiantes',
  'Asignaturas',
] as const;

function escaparCsv(valor: string | number): string {
  return `"${String(valor).replaceAll('"', '""')}"`;
}

/** Genera el CSV completo del reporte sin depender del navegador ni de APIs de plataforma. */
export function generarCsvMatriculasProgramaSemestre(
  reporte: MatriculasProgramaSemestreReporte,
): string {
  const filas = reporte.filas.map((fila) => [
    fila.semestreCodigo,
    `${fila.programaCodigo} · ${fila.programaNombre}`,
    fila.facultadNombre,
    fila.activas,
    fila.desvinculadas,
    fila.totalMatriculas,
    fila.estudiantes,
    fila.asignaturas,
  ]);
  const total = [
    'Total',
    '',
    '',
    reporte.resumen.activas,
    reporte.resumen.desvinculadas,
    reporte.resumen.totalMatriculas,
    reporte.resumen.estudiantesDistintos,
    '—',
  ];

  return [ENCABEZADOS_CSV, ...filas, total]
    .map((fila) => fila.map((valor) => escaparCsv(valor)).join(';'))
    .join('\r\n')
    .replace(/^/, '\uFEFF');
}
