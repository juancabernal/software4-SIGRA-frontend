export type EstadoRegistro = 'ACTIVO' | 'INACTIVO';

/** AsignacionMasivaRequestDTO (POST /asignaciones-docentes). */
export interface AsignacionMasivaRequest {
  profesorIds: string[];
  asignaturaIds: string[];
}

/** AsignacionDocenteResponseDTO: una asignación que sí se creó o reactivó. */
export interface AsignacionDocente {
  id: string;
  profesorId: string;
  nombreProfesor: string;
  asignaturaId: string;
  codigoAsignatura: string;
  nombreAsignatura: string;
  estado: EstadoRegistro;
  fechaAsignacion: string;
}

/** AsignacionNoRealizadaDTO: un par que se omitió (duplicado) o se rechazó (inactivo), con el motivo. */
export interface AsignacionNoRealizada {
  profesorId: string;
  asignaturaId: string;
  motivo: string;
}

/** ResultadoAsignacionMasivaDTO: la respuesta completa de POST /asignaciones-docentes. */
export interface ResultadoAsignacionMasiva {
  creadas: AsignacionDocente[];
  omitidas: AsignacionNoRealizada[];
  rechazadas: AsignacionNoRealizada[];
}
