import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { PERFILES } from '../../models/rol';
import { SesionAlmacenada } from '../../models/sesion.model';
import { SesionService } from '../../services/sesion';
import { SessionService } from '../../services/session.service';
import { Shell } from './shell';

const SESION_PROFESOR: SesionAlmacenada = {
  token: 'jwt-de-prueba',
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: '00000000-0000-4000-c000-000000000010',
    nombreCompleto: 'Profesor Bruno',
    correoInstitucional: 'profesor.bruno@uco.net.co',
    rol: 'PROFESOR',
  },
};

/** Destino mínimo: aquí se prueba el shell, no las pantallas. */
@Component({ template: '' })
class PantallaStub {}

describe('Shell', () => {
  let fixture: ComponentFixture<Shell>;
  let router: Router;

  const raiz = () => fixture.nativeElement as HTMLElement;

  const enlacesDelMenu = () =>
    Array.from(raiz().querySelectorAll<HTMLAnchorElement>('.nav-item')).map((enlace) =>
      enlace.textContent?.trim(),
    );

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([
          // `login` es el destino de «Cerrar sesión»: sin declararla, esa navegación rechaza.
          { path: 'login', component: PantallaStub },
          { path: 'profesor/asignaturas', component: PantallaStub },
          { path: 'admin/catalogo', component: PantallaStub },
          { path: 'estudiante/materias', component: PantallaStub },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
  });

  afterEach(() => sessionStorage.clear());

  it('pinta el menú del rol que indica la URL', async () => {
    await router.navigateByUrl('/estudiante/materias');
    await fixture.whenStable();

    expect(enlacesDelMenu()).toEqual(PERFILES['estudiante'].menu.map((item) => item.etiqueta));
  });

  it('cambia el menú completo al cambiar de rol', async () => {
    await router.navigateByUrl('/admin/catalogo');
    await fixture.whenStable();
    expect(enlacesDelMenu()).toEqual(PERFILES['admin'].menu.map((item) => item.etiqueta));

    await router.navigateByUrl('/profesor/asignaturas');
    await fixture.whenStable();
    expect(enlacesDelMenu()).toEqual(PERFILES['profesor'].menu.map((item) => item.etiqueta));
  });

  it('marca el rol activo en el selector de vista', async () => {
    await router.navigateByUrl('/profesor/asignaturas');
    await fixture.whenStable();

    const activos = Array.from(
      raiz().querySelectorAll<HTMLButtonElement>('.segmentado__opcion'),
    ).filter((boton) => boton.getAttribute('aria-pressed') === 'true');

    expect(activos.length).toBe(1);
    expect(activos[0].textContent?.trim()).toContain('Profesor');
  });

  it('el botón del menú colapsa y despliega el sidebar, y lo anuncia', async () => {
    const boton = raiz().querySelector<HTMLButtonElement>('.hamburguesa')!;
    expect(boton.getAttribute('aria-expanded')).toBe('true');

    boton.click();
    await fixture.whenStable();

    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(raiz().classList.contains('shell--colapsado')).toBe(true);
  });

  it('ofrece un enlace para saltar directamente al contenido', () => {
    const salto = raiz().querySelector<HTMLAnchorElement>('.saltar')!;
    expect(salto.getAttribute('href')).toBe('#contenido');
    expect(raiz().querySelector('#contenido')).not.toBeNull();
  });

  describe('sin sesión', () => {
    it('ofrece entrar y muestra el selector de demostración', () => {
      expect(raiz().querySelector('.btn-entrar')?.textContent).toContain('Iniciar sesión');
      expect(raiz().querySelector('.btn-salir')).toBeNull();
      expect(raiz().querySelector('.segmentado')).not.toBeNull();
    });

    it('el bloque de usuario muestra el perfil de demostración', async () => {
      await router.navigateByUrl('/admin/catalogo');
      await fixture.whenStable();

      expect(raiz().querySelector('.barra__usuario')?.textContent).toContain('Administrador');
    });
  });

  describe('con sesión real', () => {
    beforeEach(async () => {
      TestBed.inject(SessionService).saveSession(SESION_PROFESOR);
      TestBed.inject(SesionService).refrescar();
      await fixture.whenStable();
    });

    it('el header ofrece cerrar sesión en lugar de entrar', () => {
      expect(raiz().querySelector('.btn-salir')?.textContent).toContain('Cerrar sesión');
      expect(raiz().querySelector('.btn-entrar')).toBeNull();
    });

    it('esconde el selector de demostración: con sesión real no tiene sentido', () => {
      expect(raiz().querySelector('.segmentado')).toBeNull();
    });

    it('el bloque de usuario muestra el nombre y el correo del autenticado', () => {
      const usuario = raiz().querySelector('.barra__usuario')?.textContent ?? '';
      expect(usuario).toContain('Profesor Bruno');
      expect(usuario).toContain('profesor.bruno@uco.net.co');
    });

    it('el menú es el del rol que informa el backend, no el de la URL', async () => {
      await router.navigateByUrl('/admin/catalogo');
      await fixture.whenStable();

      expect(enlacesDelMenu()).toEqual(PERFILES['profesor'].menu.map((item) => item.etiqueta));
    });

    it('cerrar sesión limpia la sesión guardada', async () => {
      raiz().querySelector<HTMLButtonElement>('.btn-salir')!.click();
      await fixture.whenStable();

      expect(TestBed.inject(SessionService).hasSession()).toBe(false);
    });
  });
});
