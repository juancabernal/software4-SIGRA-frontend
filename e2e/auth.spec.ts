import { expect, Page, test } from '@playwright/test';

type Rol = 'admin' | 'profesor' | 'estudiante';

interface UsuarioE2E {
  readonly correo: string;
  readonly contrasena: string;
  readonly ruta: string;
  readonly etiquetaMenu: string;
}

const usuarios: Record<Rol, UsuarioE2E> = {
  admin: {
    correo: process.env['SIGRA_E2E_ADMIN_EMAIL'] ?? '',
    contrasena: process.env['SIGRA_E2E_ADMIN_PASSWORD'] ?? '',
    ruta: '/admin/catalogo',
    etiquetaMenu: 'Catálogo académico',
  },
  profesor: {
    correo: process.env['SIGRA_E2E_PROFESOR_EMAIL'] ?? '',
    contrasena: process.env['SIGRA_E2E_PROFESOR_PASSWORD'] ?? '',
    ruta: '/profesor/asignaturas',
    etiquetaMenu: 'Mis asignaturas',
  },
  estudiante: {
    correo: process.env['SIGRA_E2E_ESTUDIANTE_EMAIL'] ?? '',
    contrasena: process.env['SIGRA_E2E_ESTUDIANTE_PASSWORD'] ?? '',
    ruta: '/estudiante/materias',
    etiquetaMenu: 'Mis materias',
  },
};

const e2eHabilitado = process.env['SIGRA_E2E_ENABLED'] === '1';
const CLAVE_SESION = 'sigra.sesion';

function usuarioDisponible(rol: Rol): boolean {
  const usuario = usuarios[rol];
  return e2eHabilitado && usuario.correo !== '' && usuario.contrasena !== '';
}

async function iniciarSesion(page: Page, rol: Rol, returnUrl?: string): Promise<void> {
  const destino = returnUrl === undefined ? '/login' : `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  const usuario = usuarios[rol];
  await page.goto(destino);
  await page.getByLabel('Correo institucional').fill(usuario.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(usuario.contrasena);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

test.describe('autenticación y RBAC en navegador real', () => {
  test.beforeAll(() => {
    if (!e2eHabilitado) {
      return;
    }

    const faltantes = (Object.entries(usuarios) as [Rol, UsuarioE2E][]).flatMap(
      ([rol, usuario]) =>
        usuario.correo === '' || usuario.contrasena === '' ? [rol] : [],
    );
    if (faltantes.length > 0) {
      throw new Error(
        `SIGRA_E2E_ENABLED=1 requiere credenciales seed para: ${faltantes.join(', ')}.`,
      );
    }
  });

  for (const rol of ['admin', 'profesor', 'estudiante'] as const) {
    test(`login, menú y deep link de ${rol}`, async ({ page }) => {
      test.skip(!usuarioDisponible(rol), 'Requiere SIGRA_E2E_ENABLED=1 y credenciales seed del rol.');

      const peticionesApi: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          peticionesApi.push(request.url());
        }
      });

      await iniciarSesion(page, rol, usuarios[rol].ruta);
      await expect(page).toHaveURL(new RegExp(`${usuarios[rol].ruta.replace('/', '\\/')}(?:[?#]|$)`));
      await expect(page.getByRole('navigation')).toContainText(usuarios[rol].etiquetaMenu);

      // Regresión: después del login, un refresh real debe preservar la ruta y el rol.
      const recarga = await page.reload({ waitUntil: 'domcontentloaded' });
      expect(recarga?.status()).toBe(200);
      await expect(page).toHaveURL(
        new RegExp(`${usuarios[rol].ruta.replace('/', '\\/')}(?:[?#]|$)`),
      );
      await expect(page.getByRole('navigation')).toContainText(usuarios[rol].etiquetaMenu);

      for (const url of peticionesApi) {
        const destino = new URL(url);
        expect(destino.pathname.startsWith('/api/v1/')).toBe(true);
      }
    });
  }

  test('un rol cruzado llega a la pantalla de acceso denegado sin borrar la sesión', async ({ page }) => {
    test.skip(!usuarioDisponible('estudiante'), 'Requiere usuario estudiante seed.');

    await iniciarSesion(page, 'estudiante');
    await page.goto('/admin/catalogo');
    await expect(page).toHaveURL(/\/acceso-denegado/);
    await expect(page.getByRole('button', { name: /volver a mi inicio/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cerrar sesión/i })).toBeVisible();
  });

  test('un profesor no puede abrir /admin/ra ni después de recargar', async ({ page }) => {
    test.skip(!usuarioDisponible('profesor'), 'Requiere usuario profesor seed.');

    await iniciarSesion(page, 'profesor');
    await page.goto('/admin/ra');
    await expect(page).toHaveURL(/\/acceso-denegado/);
    const respuesta = await page.reload();
    expect(respuesta?.status()).toBe(200);
    await expect(page).toHaveURL(/\/acceso-denegado/);
  });

  test('rechaza returnUrl externo y conserva el inicio del rol', async ({ page }) => {
    test.skip(!usuarioDisponible('profesor'), 'Requiere usuario profesor seed.');

    await iniciarSesion(page, 'profesor', 'https://example.invalid/robo');
    await expect(page).toHaveURL(/\/profesor\/asignaturas/);
  });

  test('logout elimina la sesión visible', async ({ page }) => {
    test.skip(!usuarioDisponible('profesor'), 'Requiere usuario profesor seed.');

    await iniciarSesion(page, 'profesor');
    await page.getByRole('button', { name: /cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('token manipulado se limpia tras el 401 del backend real', async ({ page }) => {
    test.skip(process.env['SIGRA_E2E_ENABLED'] !== '1', 'Requiere backend real.');

    const tokenManipulado =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.invalid';
    const expiraEn = Date.now() + 60 * 60 * 1000;
    await page.addInitScript(({ clave, expiraEn, token }) => {
      sessionStorage.setItem(
        clave,
        JSON.stringify({
          token,
          tipo: 'Bearer',
          expiraEn,
          usuario: {
            id: 'e2e-invalid-token',
            nombreCompleto: 'E2E',
            correoInstitucional: 'e2e@uco.net.co',
            rol: 'ADMINISTRADOR',
          },
        }),
      );
    }, { clave: CLAVE_SESION, expiraEn, token: tokenManipulado });

    const respuestaApi = page.waitForResponse((respuesta) => {
      const url = new URL(respuesta.url());
      return url.pathname === '/api/v1/semestres' && respuesta.request().method() === 'GET';
    });
    await page.goto('/admin/semestres');

    const respuesta = await respuestaApi;
    expect(respuesta.status()).toBe(401);
    expect(respuesta.request().headers()['authorization']).toBe(`Bearer ${tokenManipulado}`);
    await expect(page).toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
    await expect
      .poll(() => page.evaluate((clave) => sessionStorage.getItem(clave), CLAVE_SESION))
      .toBeNull();
  });

  test('el backend rechaza con 403 un recurso de administrador para un estudiante', async ({
    page,
  }) => {
    test.skip(!usuarioDisponible('estudiante'), 'Requiere usuario estudiante seed.');

    await iniciarSesion(page, 'estudiante');
    const token = await page.evaluate(
      (clave) => JSON.parse(sessionStorage.getItem(clave) ?? '{}').token as string,
      CLAVE_SESION,
    );
    const apiBaseUrl = process.env['SIGRA_E2E_API_BASE_URL'] ?? new URL(page.url()).origin;
    const respuesta = await page.request.get(
      new URL('/api/v1/programas', apiBaseUrl).toString(),
      { headers: { Authorization: `Bearer ${token}` } },
    );

    expect(respuesta.status()).toBe(403);
  });

  test('la expiración reactiva desmonta la pantalla privada y vuelve al login', async ({ page }) => {
    test.skip(!usuarioDisponible('profesor'), 'Requiere usuario profesor seed.');

    await iniciarSesion(page, 'profesor');
    await page.evaluate((clave) => {
      const sesion = JSON.parse(sessionStorage.getItem(clave) ?? '{}') as { expiraEn?: number };
      sessionStorage.setItem(clave, JSON.stringify({ ...sesion, expiraEn: Date.now() + 250 }));
      document.dispatchEvent(new Event('visibilitychange'));
    }, CLAVE_SESION);

    await expect(page).toHaveURL(/\/login\?returnUrl=/, { timeout: 5_000 });
    await expect
      .poll(() => page.evaluate((clave) => sessionStorage.getItem(clave), CLAVE_SESION))
      .toBeNull();
  });
});
