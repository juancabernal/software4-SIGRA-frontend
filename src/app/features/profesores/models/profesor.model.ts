export type EstadoRegistro = 'ACTIVO' | 'INACTIVO';

/** ProfesorResponseDTO. */
export interface Profesor {
  id: string;
  tipoDocumentoId: string;
  tipoDocumentoNombre: string;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre?: string | null;
  primerApellido: string;
  segundoApellido: string;
  /** Derivado por el backend, solo para mostrar. */
  nombreCompleto: string;
  correoInstitucional: string;
  estado: string;
  tieneAsignacionesActivas: boolean;
}

/** ProfesorRequestDTO (POST y PUT /profesores/{id}). */
export interface ProfesorRequest {
  tipoDocumentoId: string;
  numeroDocumento: string;
  primerNombre: string;
  /** Opcional. */
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido: string;
  correoInstitucional: string;
}

/** AsignaturaProfesorResponseDTO (GET /profesores/{id}/asignaturas). */
export interface AsignaturaProfesor {
  asignacionId: string;
  asignaturaId: string;
  codigoAsignatura: string;
  nombreAsignatura: string;
  estadoAsignatura: EstadoRegistro;
}

/** TipoDocumentoResponseDTO: opción del selector «Tipo de documento» del formulario de Profesores. */
export interface TipoDocumentoOpcion {
  id: string;
  nombre: string;
}
