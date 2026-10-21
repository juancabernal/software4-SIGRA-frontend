import { HttpErrorResponse } from '@angular/common/http';

import { ApiError } from '../models/estudiante.model';

/** Mensaje listo para mostrar al usuario, sin trazas ni detalles técnicos (RNF-17). */
export interface MensajeError {
  mensaje: string;
  detalles: string[];
}

const SIN_CONEXION =
  'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución e intenta de nuevo.';
const INESPERADO = 'Ocurrió un error inesperado. Intenta de nuevo en unos minutos.';

/**
 * Traduce un error HTTP con el formato común del backend (timestamp, status, error, mensaje, detalles).
 * Mismo criterio que `semestre-error.ts` (D6): las validaciones de DTO llegan en `detalles` como
 * «campo: mensaje», y se muestra solo el mensaje. En un 500 nunca se muestra el cuerpo, porque
 * `detalles` puede traer información técnica.
 */
export function mensajeDeError(error: unknown): MensajeError {
  if (!(error instanceof HttpErrorResponse)) {
    return { mensaje: INESPERADO, detalles: [] };
  }
  if (error.status === 0) {
    return { mensaje: SIN_CONEXION, detalles: [] };
  }
  if (error.status >= 500) {
    return { mensaje: INESPERADO, detalles: [] };
  }

  const cuerpo = (error.error ?? {}) as ApiError;
  const mensaje =
    typeof cuerpo.mensaje === 'string' && cuerpo.mensaje ? cuerpo.mensaje : INESPERADO;
  const detalles = Array.isArray(cuerpo.detalles)
    ? cuerpo.detalles
        .filter((d): d is string => typeof d === 'string')
        .map((d) => (d.includes(': ') ? d.slice(d.indexOf(': ') + 2) : d))
    : [];
  return { mensaje, detalles };
}

/**
 * Registra en la consola el cuerpo técnico completo del error (status, campo que falló,
 * mensaje crudo del validador) sin acortar nada. El usuario nunca ve esto en pantalla — solo
 * `mensajeDeError` (RNF-17) — pero un administrador que abra DevTools sí lo tiene disponible para
 * diagnosticar. No reemplaza a `mensajeDeError`: se usa junto a él, no en su lugar.
 */
export function registrarErrorTecnico(contexto: string, error: unknown): void {
  if (error instanceof HttpErrorResponse) {
    console.error(`[${contexto}] ${error.status} ${error.statusText}`, error.error);
    return;
  }
  console.error(`[${contexto}]`, error);
}
