import { ValidatorFn, Validators } from '@angular/forms';

/**
 * Validadores de borde de los datos de identificación de un estudiante, en un solo lugar.
 *
 * Los consumen los dos formularios que capturan esos datos: `estudiante-form-dialog` (registrar y
 * modificar, RF-09a) y el modo «estudiante nuevo» de `matricula-form-dialog` (registrar y
 * matricular en un paso, D14). Viven aquí, y no en uno de los dos componentes, para que las
 * expresiones no queden duplicadas y para que un diálogo no tenga que importar del otro.
 *
 * Son validación de borde, para dar buena experiencia: la decisión de si el estudiante es
 * admisible la toma el backend (mismos patrones que `@Pattern` en `EstudianteRequestDTO`).
 */

/** Mismo patrón que valida el backend (@Pattern en EstudianteRequestDTO). */
export const PATRON_NUMERO_DOCUMENTO = /^\d{6,10}$/;

/** Admite mayúsculas y espacios alrededor; se recortan antes de enviar. */
export const PATRON_CORREO_INSTITUCIONAL = /^\s*[\w.-]+@uco\.net\.co\s*$/i;

/** Los cuatro campos de identificación de un estudiante. */
export type CampoEstudiante =
  'tipoDocumentoId' | 'numeroDocumento' | 'nombreCompleto' | 'correoInstitucional';

/**
 * Validadores de cada campo, listos para `FormBuilder.group`. Se devuelven arreglos nuevos en cada
 * llamada: un `FormControl` conserva la referencia del arreglo que recibe, así que compartir una
 * sola instancia entre formularios dejaría una puerta abierta a que uno afecte al otro.
 */
export function validadoresEstudiante(): Record<CampoEstudiante, ValidatorFn[]> {
  return {
    tipoDocumentoId: [Validators.required],
    numeroDocumento: [Validators.required, Validators.pattern(PATRON_NUMERO_DOCUMENTO)],
    nombreCompleto: [Validators.required],
    correoInstitucional: [Validators.required, Validators.pattern(PATRON_CORREO_INSTITUCIONAL)],
  };
}
