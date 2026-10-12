import { HttpErrorResponse } from '@angular/common/http';

const SIN_CONEXION =
  'No fue posible conectar con el servidor. Verifica tu conexión e intenta nuevamente.';
const INESPERADO = 'No fue posible iniciar sesión. Intenta nuevamente.';

/**
 * Traduce un error del login a un mensaje para el usuario (RF-04, RNF-17).
 * Decide solo por el status HTTP: nunca lee ni muestra el cuerpo de la respuesta,
 * porque un 500 puede traer detalles técnicos.
 */
export function mensajeDeErrorLogin(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return INESPERADO;
  }
  switch (error.status) {
    case 0:
      return SIN_CONEXION;
    case 400:
      return 'Revisa los datos ingresados.';
    case 401:
      return 'Correo o contraseña incorrectos.';
    case 423:
      return 'Tu usuario está temporalmente bloqueado. Intenta nuevamente más tarde.';
    default:
      return INESPERADO;
  }
}
