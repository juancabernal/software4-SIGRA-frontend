import { Route } from '@angular/router';

import { routes } from './app.routes';
import { Shell } from './core/layout/shell/shell';
import { PERFILES, ROLES } from './core/models/rol';

describe('tabla de rutas de la aplicación', () => {
  const shell = routes.find((ruta) => ruta.component === Shell);
  const hijas: Route[] = shell?.children ?? [];
  const pantallas = hijas.map((ruta) => ruta.path).filter((path): path is string => Boolean(path));
  /** Las redirecciones no llevan guardia ni componente: la guarda la ruta de destino. */
  const conComponente = hijas.filter((ruta) => ruta.redirectTo === undefined);

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
    for (const ruta of conComponente) {
      expect(ruta.canActivate, `la ruta ${ruta.path} no tiene guardia`).toBeDefined();
      expect(ruta.data?.['roles'], `la ruta ${ruta.path} no tiene roles`).toBeDefined();
      expect(ruta.data?.['roles']).toHaveLength(1);
    }
  });

  it('toda pantalla se carga de forma diferida y lleva título', () => {
    for (const ruta of conComponente) {
      expect(ruta.loadComponent, `la ruta ${ruta.path} no es diferida`).toBeDefined();
      expect(ruta.title, `la ruta ${ruta.path} no tiene título`).toBeDefined();
    }
  });

  describe('estadísticas en tres páginas (Mantis 0000048)', () => {
    const base = 'profesor/estadisticas';
    const paginas = ['niveles-logro', 'conclusiones', 'acciones-mejora'];

    it('las tres páginas existen y llevan el mismo guard y rol que protegía la ruta antigua', () => {
      for (const pagina of paginas) {
        const ruta = hijas.find((r) => r.path === `${base}/${pagina}`);
        expect(ruta, `falta la ruta ${base}/${pagina}`).toBeDefined();
        expect(ruta?.canActivate).toHaveLength(1);
        expect(ruta?.data?.['roles']).toEqual(['PROFESOR']);
        expect(ruta?.loadComponent).toBeDefined();
        expect(ruta?.title).toBeDefined();
      }
    });

    it('la ruta vieja redirige a «Niveles de logro» por si queda algún enlace antiguo', () => {
      const vieja = hijas.find((r) => r.path === base);
      expect(vieja?.redirectTo).toBe(`${base}/niveles-logro`);
      expect(vieja?.pathMatch).toBe('full');
      expect(pantallas).toContain(`${base}/niveles-logro`);
    });

    it('el menú del profesor tiene una entrada propia por página, con su ícono', () => {
      const entradas = PERFILES.profesor.menu.filter((item) => item.ruta.startsWith(`/${base}/`));
      expect(entradas.map((e) => [e.ruta, e.etiqueta, e.icono])).toEqual([
        [`/${base}/niveles-logro`, 'Niveles de logro', 'barras'],
        [`/${base}/conclusiones`, 'Conclusiones', 'documento'],
        [`/${base}/acciones-mejora`, 'Acciones de mejora', 'check'],
      ]);
      expect(PERFILES.profesor.menu.some((item) => item.ruta === `/${base}`)).toBe(false);
    });
  });

  it('ninguna ruta de pantalla queda duplicada y las desconocidas vuelven a la raíz', () => {
    expect(new Set(pantallas).size).toBe(pantallas.length);
    expect(routes.some((ruta) => ruta.path === '**' && ruta.redirectTo === '')).toBe(true);
  });
});
