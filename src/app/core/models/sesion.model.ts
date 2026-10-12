/** Rol del usuario autenticado, tal como lo entrega el backend. */
export type RolUsuario = 'ADMINISTRADOR' | 'PROFESOR' | 'ESTUDIANTE';

/** Datos del usuario que el backend entrega al iniciar sesión. No incluye credenciales. */
export interface UsuarioSesion {
  id: string;
  nombreCompleto: string;
  correoInstitucional: string;
  rol: RolUsuario;
}

/** Lo que se guarda en el navegador después de un inicio de sesión correcto (RF-04). */
export interface SesionAlmacenada {
  token: string;
  tipo: string;
  expiraEn: number;
  usuario: UsuarioSesion;
}
