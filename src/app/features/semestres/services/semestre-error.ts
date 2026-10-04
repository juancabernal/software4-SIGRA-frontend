import { HttpErrorResponse } from '@angular/common/http';

import { ApiError } from '../models/semestre.model';

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
 * Las validaciones de DTO llegan en `detalles` como «campo: mensaje»; se muestra solo el mensaje.
 * En un 500 nunca se muestra el cuerpo, porque `detalles` puede traer información técnica.
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
  const mensaje = typeof cuerpo.mensaje === 'string' && cuerpo.mensaje ? cuerpo.mensaje : INESPERADO;
  const detalles = Array.isArray(cuerpo.detalles)
    ? cuerpo.detalles
        .filter((d): d is string => typeof d === 'string')
        .map((d) => (d.includes(': ') ? d.slice(d.indexOf(': ') + 2) : d))
    : [];
  return { mensaje, detalles };
}
