import { Routes } from '@angular/router';

import { Shell } from './core/layout/shell/shell';

/** Pantalla provisional: se reemplaza por el componente real cuando el módulo se construya. */
const pendiente = () =>
  import('./shared/ui/modulo-pendiente/modulo-pendiente').then((m) => m.ModuloPendiente);

/**
 * Rutas de la aplicación, agrupadas por rol según la especificación visual §7.3.
 *
 * Todavía **no hay login ni guards**: RF-04 y RF-05 son de otra entrega. Cuando existan, cada
 * grupo recibe su `canActivate` sin reorganizar nada. Mientras tanto cualquier ruta es alcanzable
 * por URL, y eso es correcto: el control de acceso lo hace el backend, no el menú.
 *
 * Los `data` de cada ruta alimentan las entradas de `ModuloPendiente` por enlace de entradas del
 * router (`withComponentInputBinding`).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/components/login-page/login-page').then((m) => m.LoginPage),
    title: 'Iniciar sesión · SIGRA',
  },
  {
    path: 'admin/semestres',
    loadComponent: () =>
      import('./features/semestres/components/semestres-page/semestres-page').then(
        (m) => m.SemestresPage,
      ),
    title: 'Semestres académicos · SIGRA',
  },
];
