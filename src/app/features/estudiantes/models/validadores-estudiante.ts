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

/**
 * Cada parte del nombre (primer/segundo nombre, primer/segundo apellido): solo letras (con
 * tildes y Ñ), sin espacios, dígitos ni símbolos — mismo patrón que valida el backend
 * (`^\p{L}+$` en los DTO de estudiante, profesor y matrícula con estudiante nuevo).
 */
export const PATRON_PARTE_NOMBRE = /^\p{L}+$/u;
export const LONGITUD_MAXIMA_PARTE_NOMBRE = 50;

/** Campos de identificación de un estudiante (segundo nombre es opcional). */
export type CampoEstudiante =
  | 'tipoDocumentoId'
  | 'numeroDocumento'
  | 'primerNombre'
  | 'segundoNombre'
  | 'primerApellido'
  | 'segundoApellido'
  | 'correoInstitucional';

/** Las cuatro partes del nombre que viajan en las peticiones. */
export interface PartesNombre {
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido: string;
}

/**
 * Validadores de las partes del nombre. `segundoNombre` no es obligatorio: `Validators.pattern`
 * y `maxLength` ignoran el valor vacío. Arreglos nuevos en cada llamada (ver `validadoresEstudiante`).
 */
export function validadoresPartesNombre(): Record<
  'primerNombre' | 'segundoNombre' | 'primerApellido' | 'segundoApellido',
  ValidatorFn[]
> {
  const parte = (): ValidatorFn[] => [
    Validators.maxLength(LONGITUD_MAXIMA_PARTE_NOMBRE),
    Validators.pattern(PATRON_PARTE_NOMBRE),
  ];
  return {
    primerNombre: [Validators.required, ...parte()],
    segundoNombre: parte(),
    primerApellido: [Validators.required, ...parte()],
    segundoApellido: [Validators.required, ...parte()],
  };
}

/**
 * Arma las cuatro partes para la petición: el segundo nombre vacío se omite (es opcional).
 * No se recorta nada: las partes no admiten espacios y el formulario ya las valida.
 */
export function partesNombreParaPeticion(valores: {
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
}): PartesNombre {
  const partes: PartesNombre = {
    primerNombre: valores.primerNombre,
    primerApellido: valores.primerApellido,
    segundoApellido: valores.segundoApellido,
  };
  if (valores.segundoNombre) {
    partes.segundoNombre = valores.segundoNombre;
  }
  return partes;
}

/**
 * Validadores de cada campo, listos para `FormBuilder.group`. Se devuelven arreglos nuevos en cada
 * llamada: un `FormControl` conserva la referencia del arreglo que recibe, así que compartir una
 * sola instancia entre formularios dejaría una puerta abierta a que uno afecte al otro.
 */
export function validadoresEstudiante(): Record<CampoEstudiante, ValidatorFn[]> {
  return {
    tipoDocumentoId: [Validators.required],
    numeroDocumento: [Validators.required, Validators.pattern(PATRON_NUMERO_DOCUMENTO)],
    ...validadoresPartesNombre(),
    correoInstitucional: [Validators.required, Validators.pattern(PATRON_CORREO_INSTITUCIONAL)],
  };
}
