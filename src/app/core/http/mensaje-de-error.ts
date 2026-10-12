import { HttpErrorResponse } from '@angular/common/http';

/** Mensaje listo para mostrar al usuario, sin trazas ni detalles técnicos (RNF-17). */
export interface MensajeError {
  mensaje: string;
  detalles: string[];
}

/** Formato de error común de la API: { timestamp, status, error, mensaje, detalles? }. */
interface CuerpoError {
  mensaje?: unknown;
  detalles?: unknown;
}

export const SIN_CONEXION =
  'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.';
export const INESPERADO = 'Ocurrió un error inesperado. Intenta de nuevo en unos minutos.';

/**
 * Traduce un error HTTP del backend a un mensaje para el usuario, sin depender de ningún feature.
 * Las validaciones de DTO llegan en `detalles` como «campo: mensaje»; se muestra solo el mensaje.
 * En un 5xx nunca se muestra el cuerpo, porque puede traer información técnica.
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

  const cuerpo = (error.error ?? {}) as CuerpoError;
  const mensaje =
    typeof cuerpo.mensaje === 'string' && cuerpo.mensaje.trim() ? cuerpo.mensaje : INESPERADO;
  const detalles = Array.isArray(cuerpo.detalles)
    ? cuerpo.detalles
        .filter((d): d is string => typeof d === 'string')
        .map((d) => (d.includes(': ') ? d.slice(d.indexOf(': ') + 2) : d))
    : [];
  return { mensaje, detalles };
}
