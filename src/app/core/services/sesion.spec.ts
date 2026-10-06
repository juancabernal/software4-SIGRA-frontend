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
  token: 'jwt-de-prueba',
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

  afterEach(() => sessionStorage.clear());

  describe('sin sesión: modo de demostración', () => {
    it('no hay usuario autenticado', () => {
      expect(sesion.autenticado()).toBe(false);
      expect(sesion.usuario()).toBeNull();
    });

    it('sin navegación previa asume el rol administrador', () => {
      expect(sesion.rol()).toBe('admin');
    });

    it('deriva el rol del primer segmento de la URL', async () => {
      await router.navigateByUrl('/profesor/asignaturas');
      expect(sesion.rol()).toBe('profesor');

      await router.navigateByUrl('/estudiante/materias');
      expect(sesion.rol()).toBe('estudiante');
    });

    it('mantiene el rol en las rutas hijas', async () => {
      await router.navigateByUrl('/estudiante/progreso/calificaciones');
      expect(sesion.rol()).toBe('estudiante');
    });

    it('la identidad es la del perfil de demostración', async () => {
      await router.navigateByUrl('/admin/catalogo');
      expect(sesion.identidad().nombre).toBe('Administrador');
      expect(sesion.identidad().subtitulo).toBe('Vista global');
      expect(sesion.etiquetaRol()).toBe('Admin');
    });

    it('cambiar de rol navega a la pantalla por defecto de ese rol', async () => {
      await router.navigateByUrl('/admin/catalogo');
      const navegar = vi.spyOn(router, 'navigateByUrl');

      sesion.cambiarRol('profesor');

      expect(navegar).toHaveBeenCalledWith('/profesor/asignaturas');
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
});
