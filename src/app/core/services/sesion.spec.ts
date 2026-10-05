import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { SesionService } from './sesion';

/** Destino mínimo: aquí solo interesa la URL, no lo que se pinta. */
@Component({ template: '' })
class PantallaStub {}

describe('SesionService', () => {
  let router: Router;
  let sesion: SesionService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'profesor/asignaturas', component: PantallaStub },
          { path: 'admin/catalogo', component: PantallaStub },
          { path: 'estudiante/materias', component: PantallaStub },
          { path: 'estudiante/progreso/calificaciones', component: PantallaStub },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    sesion = TestBed.inject(SesionService);
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

  it('el perfil corresponde al rol derivado de la URL', async () => {
    await router.navigateByUrl('/admin/catalogo');
    expect(sesion.perfil().etiqueta).toBe('Admin');
    expect(sesion.perfil().nombre).toBe('Administrador');
  });

  it('cambiar de rol navega a la pantalla por defecto de ese rol', async () => {
    await router.navigateByUrl('/admin/catalogo');
    const navegar = vi.spyOn(router, 'navigateByUrl');

    sesion.cambiarRol('profesor');

    expect(navegar).toHaveBeenCalledWith('/profesor/asignaturas');
  });
});
