import { Route } from '@angular/router';

import { routes } from './app.routes';
import { Shell } from './core/layout/shell/shell';
import { PERFILES, ROLES } from './core/models/rol';

describe('tabla de rutas de la aplicación', () => {
  const shell = routes.find((ruta) => ruta.component === Shell);
  const hijas: Route[] = shell?.children ?? [];
  const pantallas = hijas.map((ruta) => ruta.path).filter((path): path is string => Boolean(path));

  it('el shell existe y protege las pantallas privadas', () => {
    expect(shell).toBeDefined();
    expect(shell?.canActivate).toHaveLength(1);
    expect(pantallas.length).toBeGreaterThanOrEqual(15);
  });

  it('cada ítem del menú de cada rol tiene su ruta declarada', () => {
    for (const rol of ROLES) {
      for (const item of PERFILES[rol].menu) {
        expect(pantallas).toContain(item.ruta.replace(/^\//, ''));
      }
    }
  });

  it('el login y acceso denegado están fuera del shell', () => {
    expect(routes.find((ruta) => ruta.path === 'login')?.canActivate).toHaveLength(1);
    expect(routes.some((ruta) => ruta.path === 'acceso-denegado')).toBe(true);
    expect(pantallas).not.toContain('login');
  });

  it('la raíz decide login o home desde la sesión, nunca desde un rol fijo', () => {
    const raiz = routes.find((ruta) => ruta.path === '' && ruta.canActivate);
    expect(raiz?.redirectTo).toBeUndefined();
    expect(raiz?.canActivate).toHaveLength(1);
  });

  it('cada pantalla privada declara exactamente sus roles backend', () => {
    for (const ruta of hijas) {
      expect(ruta.canActivate, `la ruta ${ruta.path} no tiene guardia`).toBeDefined();
      expect(ruta.data?.['roles'], `la ruta ${ruta.path} no tiene roles`).toBeDefined();
      expect(ruta.data?.['roles']).toHaveLength(1);
    }
  });

  it('toda pantalla se carga de forma diferida y lleva título', () => {
    for (const ruta of hijas) {
      expect(ruta.loadComponent, `la ruta ${ruta.path} no es diferida`).toBeDefined();
      expect(ruta.title, `la ruta ${ruta.path} no tiene título`).toBeDefined();
    }
  });

  it('ninguna ruta de pantalla queda duplicada y las desconocidas vuelven a la raíz', () => {
    expect(new Set(pantallas).size).toBe(pantallas.length);
    expect(routes.some((ruta) => ruta.path === '**' && ruta.redirectTo === '')).toBe(true);
  });
});
