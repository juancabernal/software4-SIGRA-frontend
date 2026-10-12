import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RolUsuario } from '../models/sesion.model';
import { RUTA_INICIAL, rolDesdeUsuario } from '../models/rol';
import { SessionService } from '../services/session.service';
import { returnUrlInterna } from './auth.guard';

const ROLES_BACKEND: readonly RolUsuario[] = ['ADMINISTRADOR', 'PROFESOR', 'ESTUDIANTE'];

/** Comprueba la matriz declarativa de roles de cada ruta. */
export const roleGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.hasSession()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: returnUrlInterna(state.url) },
    });
  }

  const usuario = session.getUser();
  const roles = route.data['roles'];
  if (
    usuario === null ||
    !Array.isArray(roles) ||
    roles.length === 0 ||
    !roles.every((rol): rol is RolUsuario => ROLES_BACKEND.includes(rol))
  ) {
    return accesoDenegado(router, state.url);
  }

  return roles.includes(usuario.rol) ? true : accesoDenegado(router, state.url);
};

function accesoDenegado(router: Router, url: string) {
  return router.createUrlTree(['/acceso-denegado'], {
    queryParams: { returnUrl: returnUrlInterna(url) },
  });
}

/** La raíz no tiene un rol propio: el destino se obtiene de la sesión validada. */
export const rootRedirectGuard: CanActivateFn = (_route, _state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.hasSession()) {
    return router.createUrlTree(['/login']);
  }

  const usuario = session.getUser();
  if (usuario === null) {
    session.clearSession();
    return router.createUrlTree(['/login']);
  }

  return router.createUrlTree([RUTA_INICIAL[rolDesdeUsuario(usuario.rol)]]);
};
