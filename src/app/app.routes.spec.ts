import { Route } from '@angular/router';

import { routes } from './app.routes';
import { Shell } from './core/layout/shell/shell';
import { PERFILES, ROLES } from './core/models/rol';

/**
 * Estas pruebas miran la tabla de rutas real, no un router armado para el test.
 *
 * Existen porque un merge dejó `app.routes.ts` con dos rutas y nadie se enteró: el build seguía
 * limpio y las pruebas del shell pasaban, porque cada una monta su propio router. Sin algo que
 * afirme el árbol de verdad, perder la navegación completa no rompe nada visible.
 */
describe('tabla de rutas de la aplicación', () => {
  const shell = routes.find((ruta) => ruta.component === Shell);
  const hijas: Route[] = shell?.children ?? [];
  const pantallas = hijas.filter((ruta) => ruta.path !== '').map((ruta) => ruta.path);

  it('el shell existe y envuelve a las pantallas privadas', () => {
    expect(shell).toBeDefined();
    expect(pantallas.length).toBeGreaterThanOrEqual(15);
  });

  it('cada ítem del menú de cada rol tiene su ruta declarada', () => {
    for (const rol of ROLES) {
      for (const item of PERFILES[rol].menu) {
        expect(pantallas).toContain(item.ruta.replace(/^\//, ''));
      }
    }
  });

  it('el login es ruta raíz y no entra al shell', () => {
    expect(routes.some((ruta) => ruta.path === 'login')).toBe(true);
    expect(pantallas).not.toContain('login');
  });

  it('la raíz y las rutas desconocidas tienen destino', () => {
    const raiz = hijas.find((ruta) => ruta.path === '');
    expect(raiz?.redirectTo).toBe('admin/catalogo');
    expect(routes.some((ruta) => ruta.path === '**')).toBe(true);
  });

  it('toda pantalla se carga de forma diferida y lleva título', () => {
    for (const ruta of hijas) {
      if (ruta.path === '') {
        continue;
      }
      expect(ruta.loadComponent, `la ruta ${ruta.path} no es diferida`).toBeDefined();
      expect(ruta.title, `la ruta ${ruta.path} no tiene título`).toBeDefined();
    }
  });

  it('ninguna ruta de pantalla queda duplicada', () => {
    expect(new Set(pantallas).size).toBe(pantallas.length);
  });
});
