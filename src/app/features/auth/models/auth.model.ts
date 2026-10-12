import { UsuarioSesion } from '../../../core/models/sesion.model';

/**
 * Contrato de autenticación de POST /api/v1/auth/login (RF-04).
 * Congelado por el backend: no cambiar nombres de campos.
 */

/** Cuerpo de la petición de inicio de sesión. */
export interface LoginRequest {
  correoInstitucional: string;
  contrasena: string;
}

/** Respuesta 200 del login. */
export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEn: number;
  usuario: UsuarioSesion;
}
