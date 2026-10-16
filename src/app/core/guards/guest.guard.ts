import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionService } from '../services/session.service';
import { RUTA_INICIAL, rolDesdeUsuario } from '../models/rol';

/** Evita mostrar login a un usuario que ya tiene una sesión vigente. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.hasSession()) {
    return true;
  }

  const usuario = session.getUser();
  if (usuario === null) {
    session.clearSession();
    return true;
  }

  return router.createUrlTree([RUTA_INICIAL[rolDesdeUsuario(usuario.rol)]]);
};
