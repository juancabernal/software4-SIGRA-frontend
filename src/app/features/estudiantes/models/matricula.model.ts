import { VarianteChip } from '../../../shared/ui/chip-estado/chip-estado';

/**
 * Modelos del módulo de matrícula, alineados con los DTO del backend
 * (co.edu.uco.sigra.estudiantes.dto). Ruta base: /api/v1/matriculas.
 */

/**
 * Desvinculación lógica: una matrícula DESVINCULADA puede reactivarse, nunca se borra.
 *
 * Valores del `enum EstadoMatricula` del backend (co.edu.uco.sigra.estudiantes.entity), deliberadamente
 * distinto de `EstadoRegistro` (ACTIVO/INACTIVO): una matrícula desvinculada conserva su historial
 * académico, no es un registro dado de baja.
 */
export type EstadoMatricula = 'ACTIVA' | 'DESVINCULADA';

interface PresentacionEstado {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
}

/**
 * Ícono + texto + color para pintar con `<app-chip-estado>`: el color nunca va solo (RNF-21).
 * Los textos son los de la matrícula («Activa» / «Desvinculada»), no los del estado crudo.
 */
export const PRESENTACION_ESTADO_MATRICULA: Readonly<Record<EstadoMatricula, PresentacionEstado>> =
  {
    ACTIVA: { etiqueta: 'Activa', variante: 'ok', icono: 'check' },
    DESVINCULADA: { etiqueta: 'Desvinculada', variante: 'neutro', icono: 'prohibido' },
  };

/**
 * Fecha de matrícula en formato legible es-CO, sin hora: es un dato administrativo, no una marca
 * de tiempo técnica.
 *
 * Se usa `Intl.DateTimeFormat` en vez de `DatePipe` con `'es-CO'` a propósito: el proyecto no
 * registra datos de locale ni fija `LOCALE_ID`, y hacerlo cambiaría el formato de fechas y números
 * de toda la aplicación. `Intl` es nativo, no pesa en el bundle (RNF-08) y no toca configuración
 * global.
 *
 * Una fecha sin hora (`2026-02-03`) se formatea en UTC para que no se corra un día en zonas
 * detrás de UTC, que es lo que pasaría al interpretarla como medianoche UTC y pintarla en local.
 * Una marca de tiempo completa sí se formatea en la zona del usuario.
 *
 * Devuelve cadena vacía si no hay fecha o si no se puede interpretar: la vista nunca inventa una.
 */
export function formatearFechaMatricula(fecha?: string): string {
  if (!fecha) {
    return '';
  }
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const valor = new Date(soloFecha ? `${fecha}T00:00:00Z` : fecha);
  if (Number.isNaN(valor.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(soloFecha ? { timeZone: 'UTC' } : {}),
  }).format(valor);
}

/** MatriculaRequestDTO (POST /matriculas). */
export interface MatriculaRequest {
  estudianteId: string;
  asignaturaId: string;
  semestreId: string;
}

/**
 * Datos del formulario de «registrar y matricular en un paso» (RF-09a).
 *
 * **No** extiende ni reemplaza a `MatriculaRequest`: ese es el cuerpo exacto de
 * `POST /v1/matriculas` y no debe crecer con campos que ese endpoint no recibe. Este tipo es solo
 * la entrada del formulario, que el componente parte en dos peticiones encadenadas —
 * `POST /v1/estudiantes` con los cuatro campos del estudiante y luego `POST /v1/matriculas` con el
 * `id` devuelto más la asignatura y el semestre (D14).
 */
export interface MatriculaConEstudianteNuevo {
  tipoDocumentoId: string;
  numeroDocumento: string;
  nombreCompleto: string;
  correoInstitucional: string;
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

/**
 * EstudianteMatriculadoDTO: fila de GET /matriculas?asignaturaId=&semestreId=.
 *
 * No trae `estudianteId`: alcanza para desvincular (por `matriculaId`), pero impide enlazar esta
 * fila a la ficha del estudiante (`/admin/estudiantes/:id`) desde `matriculados-page`. Petición
 * pendiente al equipo del backend, igual que la de `tipos-documento.ts`, para que no se pierda al
 * archivar este cambio.
 */
export interface EstudianteMatriculado {
  matriculaId: string;
  numeroDocumento: string;
  nombreCompleto: string;
  estado: EstadoMatricula;
  /**
   * Fecha en que se creó la matrícula. **Hoy el backend no la envía**: `entity/Matricula.java` no
   * tiene ningún campo de fecha y ninguno de los tres DTO la expone, así que este campo llega
   * siempre `undefined`. Se activa con que el backend añada `fechaMatricula` a la entidad y al DTO.
   *
   * `undefined` significa «el servidor no lo dijo», nunca «no hay fecha»: las vistas omiten la
   * columna entera en lugar de pintar un hueco o un guion (D13).
   */
  fechaMatricula?: string;
  /**
   * Si esta matrícula ya tiene calificaciones registradas. **Hoy el backend no lo envía**: el
   * paquete `co.edu.uco.sigra.calificaciones` está vacío (RF-12/RF-13 sin implementar), así que no
   * existe ni campo ni endpoint que lo informe y este campo llega siempre `undefined`. Se activa
   * con que el backend añada `tieneCalificaciones` (o `cantidadCalificaciones`) al DTO.
   *
   * `undefined` significa «el servidor no lo dijo», nunca «no tiene»: con `undefined` la
   * desvinculación usa la confirmación habitual y **no** queda bloqueada (D13). El frontend no
   * deduce por su cuenta si hay calificaciones.
   */
  tieneCalificaciones?: boolean;
}

/** AsignaturaDeEstudianteDTO: fila de GET /estudiantes/{id}/asignaturas. */
export interface AsignaturaDeEstudiante {
  matriculaId: string;
  asignaturaNombre: string;
  semestreCodigo: string;
  estado: EstadoMatricula;
  /** Igual que en `EstudianteMatriculado`: hoy no llega; `undefined` = el servidor no lo dijo. */
  fechaMatricula?: string;
  /** Igual que en `EstudianteMatriculado`: hoy no llega; `undefined` no bloquea la desvinculación. */
  tieneCalificaciones?: boolean;
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
