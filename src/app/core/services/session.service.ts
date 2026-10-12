import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { RespuestaLogin, SesionAlmacenada, UsuarioSesion } from '../models/sesion.model';

/** Clave de sessionStorage. Solo este servicio lee o escribe la sesión. */
const CLAVE_SESION = 'sigra.sesion';
const MARGEN_RELOJ_MS = 5_000;

/**
 * Único punto de acceso al estado de sesión guardado en el navegador (RF-04).
 * Usa sessionStorage: la sesión dura lo que dura la pestaña. Nunca guarda contraseñas.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  /** Valida y guarda la respuesta del backend. Devuelve false si no es una sesión utilizable. */
  saveSession(respuesta: RespuestaLogin): boolean {
    if (!this.esNavegador || !respuestaValida(respuesta)) {
      return false;
    }

    const ahora = Date.now();
    const expiraPorTtl = ahora + respuesta.expiraEn * 1000;
    const expiraPorClaim = expiracionJwt(respuesta.token);
    const expiraEn = expiraPorClaim === null ? expiraPorTtl : Math.min(expiraPorTtl, expiraPorClaim);

    if (!Number.isFinite(expiraEn) || expiraEn <= ahora) {
      return false;
    }

    const sesion: SesionAlmacenada = {
      token: respuesta.token,
      tipo: 'Bearer',
      expiraEn,
      usuario: {
        id: respuesta.usuario.id,
        nombreCompleto: respuesta.usuario.nombreCompleto,
        correoInstitucional: respuesta.usuario.correoInstitucional,
        rol: respuesta.usuario.rol,
      },
    };

    try {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
      return true;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return this.leer()?.token ?? null;
  }

  getUser(): UsuarioSesion | null {
    return this.leer()?.usuario ?? null;
  }

  getExpiration(): number | null {
    return this.leer()?.expiraEn ?? null;
  }

  hasSession(): boolean {
    return this.getToken() !== null;
  }

  clearSession(): void {
    if (!this.esNavegador) {
      return;
    }
    try {
      sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      // Storage bloqueado o no disponible: la sesión se considera ausente igualmente.
    }
  }

  /** Borra únicamente la sesión que originó una petición fallida. */
  clearSessionIfToken(token: string | null): boolean {
    if (token === null || !this.tokenGuardadoCoincide(token)) {
      return false;
    }
    this.clearSession();
    return true;
  }

  /**
   * Compara el token crudo para poder cerrar también una sesión que acaba de vencer.
   * No usa `getToken()`: ese método descarta primero los datos ya expirados.
   */
  private tokenGuardadoCoincide(token: string): boolean {
    if (!this.esNavegador) {
      return false;
    }

    try {
      const crudo = sessionStorage.getItem(CLAVE_SESION);
      if (crudo === null) {
        return false;
      }
      const guardado = JSON.parse(crudo) as { token?: unknown };
      return guardado.token === token;
    } catch {
      return false;
    }
  }

  private leer(): SesionAlmacenada | null {
    if (!this.esNavegador) {
      return null;
    }

    let crudo: string | null;
    try {
      crudo = sessionStorage.getItem(CLAVE_SESION);
    } catch {
      return null;
    }
    if (crudo === null) {
      return null;
    }
    try {
      const sesion = JSON.parse(crudo) as unknown;
      if (sesionValida(sesion)) {
        return sesion;
      }
    } catch {
      // Dato dañado: se descarta igual que una sesión inexistente.
    }
    this.clearSession();
    return null;
  }
}

function respuestaValida(respuesta: RespuestaLogin): boolean {
  const expiraPorClaim = expiracionJwt(respuesta?.token ?? '');
  return (
    respuesta !== null &&
    typeof respuesta === 'object' &&
    respuesta.tipo === 'Bearer' &&
    typeof respuesta.token === 'string' &&
    jwtTieneFormaValida(respuesta.token) &&
    Number.isFinite(respuesta.expiraEn) &&
    respuesta.expiraEn > 0 &&
    respuesta.expiraEn <= Number.MAX_SAFE_INTEGER / 1000 &&
    usuarioValido(respuesta.usuario) &&
    expiraPorClaim !== null &&
    Number.isFinite(expiraPorClaim) &&
    expiraPorClaim > Date.now() + MARGEN_RELOJ_MS
  );
}

function sesionValida(valor: unknown): valor is SesionAlmacenada {
  if (valor === null || typeof valor !== 'object') {
    return false;
  }
  const sesion = valor as Partial<SesionAlmacenada>;
  const expiraPorClaim = typeof sesion.token === 'string' ? expiracionJwt(sesion.token) : null;
  return (
    sesion.tipo === 'Bearer' &&
    typeof sesion.token === 'string' &&
    jwtTieneFormaValida(sesion.token) &&
    typeof sesion.expiraEn === 'number' &&
    Number.isFinite(sesion.expiraEn) &&
    sesion.expiraEn > Date.now() &&
    expiraPorClaim !== null &&
    Number.isFinite(expiraPorClaim) &&
    expiraPorClaim > Date.now() + MARGEN_RELOJ_MS &&
    sesion.expiraEn <= expiraPorClaim &&
    usuarioValido(sesion.usuario)
  );
}

function usuarioValido(usuario: unknown): usuario is UsuarioSesion {
  if (usuario === null || typeof usuario !== 'object') {
    return false;
  }
  const candidato = usuario as Partial<UsuarioSesion>;
  return (
    typeof candidato.id === 'string' &&
    candidato.id.trim() !== '' &&
    typeof candidato.nombreCompleto === 'string' &&
    candidato.nombreCompleto.trim() !== '' &&
    typeof candidato.correoInstitucional === 'string' &&
    candidato.correoInstitucional.trim() !== '' &&
    (candidato.rol === 'ADMINISTRADOR' ||
      candidato.rol === 'PROFESOR' ||
      candidato.rol === 'ESTUDIANTE')
  );
}

function jwtTieneFormaValida(token: string): boolean {
  const partes = token.split('.');
  return partes.length === 3 && partes.every((parte) => /^[A-Za-z0-9_-]+$/.test(parte));
}

/** Devuelve `null` cuando el JWT no trae `exp`; no valida la firma ni autoriza al usuario. */
function expiracionJwt(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const binario = atob(base64);
    const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    if (!Object.hasOwn(claims, 'exp')) {
      return null;
    }
    const exp = typeof claims['exp'] === 'number' ? claims['exp'] : Number(claims['exp']);
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : Number.NaN;
  } catch {
    return Number.NaN;
  }
}
