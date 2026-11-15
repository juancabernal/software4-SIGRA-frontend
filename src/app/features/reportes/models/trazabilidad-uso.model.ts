import { AccionAuditoria, ETIQUETA_ACCION } from '../../auditoria/models/auditoria.model';

/**
 * Modelos del reporte R7 (trazabilidad de uso por rol), alineados con el backend:
 * - GET /api/v1/reportes/trazabilidad-uso (administrador): agregados por tipo de usuario, sin identificar personas.
 * - GET /api/v1/reportes/trazabilidad-uso/profesor (profesor): su actividad y la de sus estudiantes del semestre.
 */
export type RolTrazabilidad = 'ADMINISTRADOR' | 'PROFESOR' | 'ESTUDIANTE';
export type GrupoTrazabilidad = RolTrazabilidad | 'SIN_IDENTIFICAR';

export interface FiltrosTrazabilidadUso {
  desde?: string;
  hasta?: string;
  semestreId?: string;
  rol?: RolTrazabilidad;
}

export interface ConteoAccion {
  accion: AccionAuditoria;
  total: number;
}

export interface ActividadRol {
  rol: GrupoTrazabilidad;
  totalEventos: number;
  usuariosDistintos: number;
  ultimaActividad: string | null;
  acciones: ConteoAccion[];
}

export interface TrazabilidadUsoReporte {
  desde: string;
  hasta: string;
  semestreId: string | null;
  semestreCodigo: string | null;
  rol: RolTrazabilidad | null;
  resumen: {
    totalEventos: number;
    usuariosActivos: number;
    loginsExitosos: number;
    loginsFallidos: number;
  };
  porRol: ActividadRol[];
}

export interface ActividadEstudiante {
  estudianteId: string;
  nombreCompleto: string;
  correoInstitucional: string;
  asignaturas: string[];
  ingresos: number;
  totalEventos: number;
  ultimaActividad: string | null;
}

export interface TrazabilidadUsoProfesor {
  desde: string;
  hasta: string;
  semestreId: string | null;
  semestreCodigo: string | null;
  propia: {
    totalEventos: number;
    ultimaActividad: string | null;
    acciones: ConteoAccion[];
  };
  resumenEstudiantes: {
    total: number;
    conActividad: number;
    sinActividad: number;
    ingresos: number;
  };
  estudiantes: ActividadEstudiante[];
  mensaje: string | null;
}

export const ETIQUETA_GRUPO: Readonly<Record<GrupoTrazabilidad, string>> = {
  ADMINISTRADOR: 'Administrador',
  PROFESOR: 'Profesor',
  ESTUDIANTE: 'Estudiante',
  SIN_IDENTIFICAR: 'Sin identificar',
};

export const ROLES_TRAZABILIDAD: readonly RolTrazabilidad[] = ['ADMINISTRADOR', 'PROFESOR', 'ESTUDIANTE'];

/** Orden de las columnas de acciones en la tabla y el CSV. */
export const ACCIONES_TRAZABILIDAD: readonly AccionAuditoria[] = [
  'LOGIN_EXITOSO',
  'LOGIN_FALLIDO',
  'CAMBIO_ESTADO',
  'CALIFICACION_MODIFICADA',
  'CALIFICACION_FUERA_DE_FECHA',
];

export function conteoDe(acciones: readonly ConteoAccion[], accion: AccionAuditoria): number {
  return acciones.find((conteo) => conteo.accion === accion)?.total ?? 0;
}

function escaparCsv(valor: string | number | null): string {
  return `"${String(valor ?? '').replaceAll('"', '""')}"`;
}

function aCsv(filas: readonly (readonly (string | number | null)[])[]): string {
  return '﻿' + filas.map((fila) => fila.map(escaparCsv).join(';')).join('\r\n');
}

/** CSV del reporte del administrador: una fila por tipo de usuario más la fila de totales. */
export function generarCsvTrazabilidadUso(reporte: TrazabilidadUsoReporte): string {
  const encabezados = [
    'Rol',
    'Usuarios activos',
    ...ACCIONES_TRAZABILIDAD.map((accion) => ETIQUETA_ACCION[accion]),
    'Total de eventos',
    'Última actividad',
  ];
  const filas = reporte.porRol.map((fila) => [
    ETIQUETA_GRUPO[fila.rol],
    fila.usuariosDistintos,
    ...ACCIONES_TRAZABILIDAD.map((accion) => conteoDe(fila.acciones, accion)),
    fila.totalEventos,
    fila.ultimaActividad,
  ]);
  const total = [
    'Total',
    reporte.resumen.usuariosActivos,
    ...ACCIONES_TRAZABILIDAD.map((accion) =>
      reporte.porRol.reduce((suma, fila) => suma + conteoDe(fila.acciones, accion), 0),
    ),
    reporte.resumen.totalEventos,
    '',
  ];
  return aCsv([encabezados, ...filas, total]);
}

/** CSV de la vista del profesor: actividad de cada estudiante. */
export function generarCsvActividadEstudiantes(reporte: TrazabilidadUsoProfesor): string {
  const encabezados = ['Estudiante', 'Correo', 'Asignaturas', 'Ingresos', 'Total de eventos', 'Último acceso'];
  const filas = reporte.estudiantes.map((estudiante) => [
    estudiante.nombreCompleto,
    estudiante.correoInstitucional,
    estudiante.asignaturas.join(', '),
    estudiante.ingresos,
    estudiante.totalEventos,
    estudiante.ultimaActividad,
  ]);
  return aCsv([encabezados, ...filas]);
}
