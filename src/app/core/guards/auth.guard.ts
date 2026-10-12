import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { SessionService } from '../services/session.service';
import { RolUsuario } from '../models/sesion.model';
import { RUTA_INICIAL, rolDesdeUrl, rolDesdeUsuario } from '../models/rol';

/** Redirige a login conservando únicamente una URL interna del router. */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (session.hasSession()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: returnUrlInterna(state.url) },
  });
};

export function returnUrlInterna(url: string): string {
  const candidata = url.trim();
  if (!esUrlInterna(candidata)) {
    return '/';
  }
  return candidata;
}

/** Destino post-login seguro para el rol entregado por el backend. */
export function destinoDespuesDeLogin(returnUrl: string | null, rolUsuario: RolUsuario): string {
  const rol = rolDesdeUsuario(rolUsuario);
  const candidata = returnUrl === null ? '/' : returnUrlInterna(returnUrl);
  return rolDesdeUrl(candidata) === rol ? candidata : RUTA_INICIAL[rol];
}

function esUrlInterna(url: string): boolean {
  if (
    url === '' ||
    !url.startsWith('/') ||
    url.startsWith('//') ||
    url.includes('\\') ||
    /\p{Cc}/u.test(url) ||
    /^[a-z][a-z\d+.-]*:/i.test(url)
  ) {
    return false;
  }

  let decodificada = url;
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      const siguiente = decodeURIComponent(decodificada);
      if (siguiente === decodificada) {
        break;
      }
      decodificada = siguiente;
    } catch {
      return false;
    }
  }
  return decodificada.startsWith('/') && !decodificada.startsWith('//') && !decodificada.includes('\\');
}
