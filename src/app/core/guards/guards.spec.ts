import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { authGuard, destinoDespuesDeLogin, returnUrlInterna } from './auth.guard';
import { guestGuard } from './guest.guard';
import { roleGuard, rootRedirectGuard } from './role.guard';
import { RespuestaLogin } from '../models/sesion.model';
import { SessionService } from '../services/session.service';

const RESPUESTA_ESTUDIANTE: RespuestaLogin = {
  token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature',
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: 'estudiante-1',
    nombreCompleto: 'Daniela Ortiz',
    correoInstitucional: 'daniela.ortiz@uco.net.co',
    rol: 'ESTUDIANTE',
  },
};

const estado = (url: string): RouterStateSnapshot => ({ url } as RouterStateSnapshot);
const ruta = (roles: readonly string[] = []): ActivatedRouteSnapshot =>
  ({ data: { roles } } as unknown as ActivatedRouteSnapshot);

describe('guards de autenticación y autorización', () => {
  let session: SessionService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  afterEach(() => sessionStorage.clear());

  it('authGuard manda a login con returnUrl interno cuando no hay sesión', () => {
    const resultado = TestBed.runInInjectionContext(() =>
      authGuard(ruta(), estado('/admin/catalogo?filtro=activo')),
    );

    expect(router.serializeUrl(resultado as ReturnType<Router['createUrlTree']>)).toBe(
      '/login?returnUrl=%2Fadmin%2Fcatalogo%3Ffiltro%3Dactivo',
    );
  });

  it('authGuard permite la sesión válida y rechaza JWT vencido', () => {
    session.saveSession(RESPUESTA_ESTUDIANTE);
    expect(TestBed.runInInjectionContext(() => authGuard(ruta(), estado('/estudiante/materias')))).toBe(
      true,
    );

    sessionStorage.setItem(
      'sigra.sesion',
      JSON.stringify({
        token: RESPUESTA_ESTUDIANTE.token,
        tipo: 'Bearer',
        expiraEn: Date.now() - 1,
        usuario: RESPUESTA_ESTUDIANTE.usuario,
      }),
    );
    expect(TestBed.runInInjectionContext(() => authGuard(ruta(), estado('/estudiante/materias')))).not.toBe(
      true,
    );
  });

  it('roleGuard permite solo la matriz declarada y preserva la sesión en 403', () => {
    session.saveSession(RESPUESTA_ESTUDIANTE);
    const permitido = TestBed.runInInjectionContext(() =>
      roleGuard(ruta(['ESTUDIANTE']), estado('/estudiante/materias')),
    );
    expect(permitido).toBe(true);

    const denegado = TestBed.runInInjectionContext(() =>
      roleGuard(ruta(['ADMINISTRADOR']), estado('/admin/catalogo')),
    );
    expect(router.serializeUrl(denegado as ReturnType<Router['createUrlTree']>)).toBe(
      '/acceso-denegado?returnUrl=%2Fadmin%2Fcatalogo',
    );
    expect(session.hasSession()).toBe(true);
  });

  it('guestGuard lleva al home del rol y rootRedirectGuard lleva a login sin sesión', () => {
    session.saveSession(RESPUESTA_ESTUDIANTE);
    const login = TestBed.runInInjectionContext(() => guestGuard(ruta(), estado('/login')));
    expect(router.serializeUrl(login as ReturnType<Router['createUrlTree']>)).toBe(
      '/estudiante/materias',
    );

    session.clearSession();
    const raiz = TestBed.runInInjectionContext(() => rootRedirectGuard(ruta(), estado('/')));
    expect(router.serializeUrl(raiz as ReturnType<Router['createUrlTree']>)).toBe('/login');
  });

  it('restaura solo deep links del rol autenticado y rechaza open redirects', () => {
    expect(destinoDespuesDeLogin('/estudiante/progreso?filtro=activo#tabla', 'ESTUDIANTE')).toBe(
      '/estudiante/progreso?filtro=activo#tabla',
    );
    expect(destinoDespuesDeLogin('/admin/catalogo', 'ESTUDIANTE')).toBe('/estudiante/materias');
    expect(destinoDespuesDeLogin('https://evil.example/', 'ESTUDIANTE')).toBe('/estudiante/materias');
    expect(destinoDespuesDeLogin('//evil.example/', 'ESTUDIANTE')).toBe('/estudiante/materias');
    expect(destinoDespuesDeLogin('%2F%2Fevil.example/', 'ESTUDIANTE')).toBe('/estudiante/materias');
    expect(returnUrlInterna('/estudiante/materias?next=https://evil.example')).toBe(
      '/estudiante/materias?next=https://evil.example',
    );
  });
});
