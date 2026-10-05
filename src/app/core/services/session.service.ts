import { Injectable } from '@angular/core';

import { SesionAlmacenada, UsuarioSesion } from '../models/sesion.model';

/** Clave de sessionStorage. Solo este servicio lee o escribe la sesión. */
const CLAVE_SESION = 'sigra.sesion';

/**
 * Único punto de acceso al estado de sesión guardado en el navegador (RF-04).
 * Usa sessionStorage: la sesión dura lo que dura la pestaña. Nunca guarda contraseñas.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  saveSession(respuesta: SesionAlmacenada): void {
    const { token, tipo, expiraEn, usuario } = respuesta;
    const sesion: SesionAlmacenada = {
      token,
      tipo,
      expiraEn,
      usuario: {
        id: usuario.id,
        nombreCompleto: usuario.nombreCompleto,
        correoInstitucional: usuario.correoInstitucional,
        rol: usuario.rol,
      },
    };
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  }

  getToken(): string | null {
    return this.leer()?.token ?? null;
  }

  getUser(): UsuarioSesion | null {
    return this.leer()?.usuario ?? null;
  }

  hasSession(): boolean {
    return this.getToken() !== null;
  }

  clearSession(): void {
    sessionStorage.removeItem(CLAVE_SESION);
  }

  private leer(): SesionAlmacenada | null {
    const crudo = sessionStorage.getItem(CLAVE_SESION);
    if (crudo === null) {
      return null;
    }
    try {
      const sesion = JSON.parse(crudo) as Partial<SesionAlmacenada>;
      if (typeof sesion.token === 'string' && sesion.usuario) {
        return sesion as SesionAlmacenada;
      }
    } catch {
      // Dato dañado: se descarta igual que una sesión inexistente.
    }
    this.clearSession();
    return null;
  }
}
