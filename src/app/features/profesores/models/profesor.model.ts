export type EstadoRegistro = 'ACTIVO' | 'INACTIVO';

/** ProfesorResponseDTO. */
export interface Profesor {
  id: string;
  tipoDocumentoNombre: string;
  numeroDocumento: string;
  nombreCompleto: string;
  correoInstitucional: string;
  estado: string;
  tieneAsignacionesActivas: boolean;
}

/** ProfesorRequestDTO (POST y PUT /profesores/{id}). */
export interface ProfesorRequest {
  tipoDocumentoId: string;
  numeroDocumento: string;
  nombreCompleto: string;
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
