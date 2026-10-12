import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { SesionAlmacenada } from '../models/sesion.model';
import { SesionService } from './sesion';
import { SessionService } from './session.service';

/** Destino mínimo: acá solo interesa la URL, no lo que se pinta. */
@Component({ template: '' })
class PantallaStub {}

const SESION_ESTUDIANTE: SesionAlmacenada = {
  token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature',
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: '00000000-0000-4000-c000-000000000010',
    nombreCompleto: 'Daniela Ortiz Reyes',
    correoInstitucional: 'daniela.ortiz@uco.net.co',
    rol: 'ESTUDIANTE',
  },
};

describe('SesionService', () => {
  let router: Router;
  let sesion: SesionService;
  let guardada: SessionService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: PantallaStub },
          { path: 'profesor/asignaturas', component: PantallaStub },
          { path: 'admin/catalogo', component: PantallaStub },
          { path: 'estudiante/materias', component: PantallaStub },
          { path: 'estudiante/progreso/calificaciones', component: PantallaStub },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    guardada = TestBed.inject(SessionService);
    sesion = TestBed.inject(SesionService);
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  describe('sin sesión', () => {
    it('no hay usuario autenticado', () => {
      expect(sesion.autenticado()).toBe(false);
      expect(sesion.usuario()).toBeNull();
    });

    it('no deriva rol ni identidad desde la URL', async () => {
      await router.navigateByUrl('/admin/catalogo');
      expect(sesion.rol()).toBeNull();
      expect(sesion.identidad().nombre).toBe('Sesión no disponible');
      expect(sesion.etiquetaRol()).toBe('Sesión');
    });
  });

  describe('con sesión real', () => {
    beforeEach(() => {
      guardada.saveSession(SESION_ESTUDIANTE);
      sesion.refrescar();
    });

    it('reconoce al usuario autenticado', () => {
      expect(sesion.autenticado()).toBe(true);
      expect(sesion.usuario()?.nombreCompleto).toBe('Daniela Ortiz Reyes');
    });

    it('el rol del backend manda sobre el que indique la URL', async () => {
      await router.navigateByUrl('/admin/catalogo');

      expect(sesion.rol()).toBe('estudiante');
      expect(sesion.etiquetaRol()).toBe('Estudiante');
    });

    it('la identidad sale del usuario, con su correo y sus iniciales', () => {
      expect(sesion.identidad().nombre).toBe('Daniela Ortiz Reyes');
      expect(sesion.identidad().subtitulo).toBe('daniela.ortiz@uco.net.co');
      expect(sesion.identidad().inicial).toBe('DR');
    });

    it('el menú es el del rol autenticado', () => {
      expect(sesion.identidad().menu.map((item) => item.etiqueta)).toEqual([
        'Mis materias',
        'Mi progreso',
      ]);
    });

    it('la ruta inicial es la del rol autenticado', () => {
      expect(sesion.rutaInicial()).toBe('/estudiante/materias');
    });

    it('cerrar sesión borra la sesión guardada y vuelve al login', () => {
      const navegar = vi.spyOn(router, 'navigateByUrl');

      sesion.cerrarSesion();

      expect(guardada.hasSession()).toBe(false);
      expect(sesion.autenticado()).toBe(false);
      expect(navegar).toHaveBeenCalledWith('/login');
    });
  });

  it('relee la sesión al terminar cada navegación', async () => {
    expect(sesion.autenticado()).toBe(false);

    // Se guarda sin avisar al servicio: es lo que hace el login antes de navegar.
    guardada.saveSession(SESION_ESTUDIANTE);
    await router.navigateByUrl('/estudiante/materias');

    expect(sesion.autenticado()).toBe(true);
    expect(sesion.rol()).toBe('estudiante');
  });

  it('limpia y redirige al login cuando vence el TTL aunque no haya navegación', async () => {
    vi.useFakeTimers();
    guardada.saveSession({ ...SESION_ESTUDIANTE, expiraEn: 1 });
    sesion.refrescar();

    expect(sesion.autenticado()).toBe(true);
    vi.advanceTimersByTime(1_100);
    await vi.runAllTimersAsync();

    expect(sesion.autenticado()).toBe(false);
    expect(sesion.identidad().nombre).toBe('Sesión no disponible');
    expect(guardada.hasSession()).toBe(false);
    expect(router.url).toMatch(/^\/login(?:\?returnUrl=|$)/);
  });
});
