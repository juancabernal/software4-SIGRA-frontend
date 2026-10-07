/**
 * Modelos del módulo de matrícula, alineados con los DTO del backend
 * (co.edu.uco.sigra.estudiantes.dto). Ruta base: /api/v1/matriculas.
 */

/** Desvinculación lógica: una matrícula INACTIVA puede reactivarse, nunca se borra. */
export type EstadoMatricula = 'ACTIVO' | 'INACTIVO';

/** MatriculaRequestDTO (POST /matriculas). */
export interface MatriculaRequest {
  estudianteId: string;
  asignaturaId: string;
  semestreId: string;
}

/** MatriculaResponseDTO. El código HTTP (201 crea, 200 reactiva) distingue el caso, no el cuerpo. */
export interface Matricula {
  id: string;
  estudianteId: string;
  asignaturaId: string;
  semestreId: string;
  estado: EstadoMatricula;
}

/** EstudianteMatriculadoDTO: fila de GET /matriculas?asignaturaId=&semestreId=. */
export interface EstudianteMatriculado {
  matriculaId: string;
  numeroDocumento: string;
  nombreCompleto: string;
  estado: EstadoMatricula;
}

/** AsignaturaDeEstudianteDTO: fila de GET /estudiantes/{id}/asignaturas. */
export interface AsignaturaDeEstudiante {
  matriculaId: string;
  asignaturaNombre: string;
  semestreCodigo: string;
  estado: EstadoMatricula;
}

/**
 * Modelo local mínimo para el selector de asignatura del formulario de matrícula (D5). No se
 * importa `Asignatura` de `features/asignaturas` para no acoplar esta feature a otra en cambio
 * activo durante el mismo sprint; solo interesan el id, el nombre y el estado.
 */
export interface OpcionAsignatura {
  id: string;
  nombre: string;
  estado: 'BORRADOR' | 'ACTIVA' | 'INACTIVA';
}

/**
 * Modelo local mínimo para el selector de semestre del formulario de matrícula (D5), con el
 * mismo motivo que `OpcionAsignatura`: no se importa de `features/semestres`.
 */
export interface OpcionSemestre {
  id: string;
  codigo: string;
  estado: 'ACTIVO' | 'INACTIVO';
}
