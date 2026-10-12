/** Rol del usuario autenticado, tal como lo entrega el backend. */
export type RolUsuario = 'ADMINISTRADOR' | 'PROFESOR' | 'ESTUDIANTE';

/** Datos del usuario que el backend entrega al iniciar sesión. No incluye credenciales. */
export interface UsuarioSesion {
  id: string;
  nombreCompleto: string;
  correoInstitucional: string;
  rol: RolUsuario;
}

/** Respuesta de POST /api/v1/auth/login. `expiraEn` llega en segundos. */
export interface RespuestaLogin {
  token: string;
  tipo: string;
  expiraEn: number;
  usuario: UsuarioSesion;
}

/** Lo que se guarda en el navegador después de validar un inicio de sesión correcto. */
export interface SesionAlmacenada {
  token: string;
  tipo: 'Bearer';
  /** Instante absoluto de expiración en milisegundos desde Unix epoch. */
  expiraEn: number;
  usuario: UsuarioSesion;
}
