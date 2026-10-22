export type AccionAuditoria =
  | 'LOGIN_EXITOSO'
  | 'LOGIN_FALLIDO'
  | 'CAMBIO_ESTADO'
  | 'CALIFICACION_FUERA_DE_FECHA'
  | 'CALIFICACION_MODIFICADA';

export type TipoEntidadAuditoria =
  | 'USUARIO'
  | 'PROFESOR'
  | 'ESTUDIANTE'
  | 'PROGRAMA'
  | 'ASIGNATURA'
  | 'RESULTADO_APRENDIZAJE'
  | 'SEMESTRE'
  | 'MATRICULA'
  | 'ASIGNACION_DOCENTE'
  | 'EVALUACION'
  | 'CALIFICACION'
  | 'CONCLUSION'
  | 'ACCION_MEJORA'
  | 'OTRO';

/** RegistroAuditoriaDTO. `idEntidad` y el usuario son null en un login rechazado. */
export interface RegistroAuditoria {
  id: string;
  fechaHora: string;
  accion: AccionAuditoria;
  tipoEntidad: TipoEntidadAuditoria;
  idEntidad: string | null;
  usuarioId: string | null;
  rolUsuario: string | null;
  detalle: string;
}

/** PaginaAuditoriaDTO: `pagina` empieza en 0. */
export interface PaginaAuditoria {
  contenido: RegistroAuditoria[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}

/** Filtros opcionales del reporte; las fechas en formato AAAA-MM-DD y ambas inclusivas. */
export interface FiltrosAuditoria {
  desde?: string;
  hasta?: string;
  tipoEntidad?: TipoEntidadAuditoria;
}

export const ETIQUETA_ACCION: Readonly<Record<AccionAuditoria, string>> = {
  LOGIN_EXITOSO: 'Inicio de sesión',
  LOGIN_FALLIDO: 'Inicio de sesión rechazado',
  CAMBIO_ESTADO: 'Cambio de estado',
  CALIFICACION_FUERA_DE_FECHA: 'Nota fuera de fecha',
  CALIFICACION_MODIFICADA: 'Nota modificada',
};

export const ETIQUETA_ENTIDAD: Readonly<Record<TipoEntidadAuditoria, string>> = {
  USUARIO: 'Usuario',
  PROFESOR: 'Profesor',
  ESTUDIANTE: 'Estudiante',
  PROGRAMA: 'Programa',
  ASIGNATURA: 'Asignatura',
  RESULTADO_APRENDIZAJE: 'Resultado de aprendizaje',
  SEMESTRE: 'Semestre',
  MATRICULA: 'Matrícula',
  ASIGNACION_DOCENTE: 'Asignación docente',
  EVALUACION: 'Evaluación',
  CALIFICACION: 'Calificación',
  CONCLUSION: 'Conclusión',
  ACCION_MEJORA: 'Acción de mejora',
  OTRO: 'Otro',
};

export const TIPOS_ENTIDAD = Object.keys(ETIQUETA_ENTIDAD) as TipoEntidadAuditoria[];