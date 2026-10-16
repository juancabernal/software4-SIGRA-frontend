import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { SessionService } from '../services/session.service';

const API_CONFIG = analizarConfiguracionApi(environment.apiUrl);
const API_PATH = normalizarPrefijoApi(API_CONFIG.path);
const API_PREFIX = `${API_PATH}/v1/`;
const LOGIN_PATH = `${API_PATH}/v1/auth/login`;

/** Adjunta el Bearer solo a la API propia; nunca a login, terceros o recursos estáticos. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!esApiPropia(request.urlWithParams) || esLogin(request.urlWithParams)) {
    return next(request);
  }

  const token = inject(SessionService).getToken();
  return token === null
    ? next(request)
    : next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export function esApiPropia(url: string): boolean {
  const candidata = resolverUrlApi(url);
  if (candidata === null) {
    return false;
  }

  return candidata.pathname.startsWith(API_PREFIX) && !esRecursoEstatico(candidata.pathname);
}

export function esLogin(url: string): boolean {
  const candidata = resolverUrlApi(url);
  if (candidata === null) {
    return false;
  }

  return candidata.pathname === LOGIN_PATH;
}

interface ConfiguracionApi {
  readonly origin: string | null;
  readonly path: string;
}

function analizarConfiguracionApi(apiUrl: string): ConfiguracionApi {
  try {
    const absoluta = new URL(apiUrl);
    return { origin: absoluta.origin, path: absoluta.pathname };
  } catch {
    // Una configuración root-relative se valida contra el origen real del navegador. No se
    // inventa un hostname de respaldo: en SSR las URLs absolutas quedan bloqueadas.
    const path = apiUrl.startsWith('/') && !apiUrl.startsWith('//') ? apiUrl : '/api';
    return { origin: null, path };
  }
}

function normalizarPrefijoApi(path: string): string {
  const sinBarras = path.replace(/\/+$/, '');
  return sinBarras === '' ? '/' : sinBarras.startsWith('/') ? sinBarras : `/${sinBarras}`;
}

function resolverUrlApi(url: string): URL | null {
  if (esRootRelative(url)) {
    if (!rootRelativeAutorizada()) {
      return null;
    }
    try {
      return new URL(url, 'http://relative.invalid');
    } catch {
      return null;
    }
  }

  if (!esUrlAbsoluta(url)) {
    return null;
  }

  try {
    const candidata = new URL(url);
    const origenAutorizado = API_CONFIG.origin ?? origenDelNavegador();
    return origenAutorizado !== null && candidata.origin === origenAutorizado ? candidata : null;
  } catch {
    return null;
  }
}

function rootRelativeAutorizada(): boolean {
  return API_CONFIG.origin === null || origenDelNavegador() === API_CONFIG.origin;
}

function esRootRelative(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

function esUrlAbsoluta(url: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//');
}

function origenDelNavegador(): string | null {
  return typeof window === 'undefined' ? null : window.location.origin;
}

function esRecursoEstatico(pathname: string): boolean {
  return pathname === '/assets' || pathname.startsWith('/assets/');
}
