import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { PERFILES } from '../../models/rol';
import { RespuestaLogin } from '../../models/sesion.model';
import { SesionService } from '../../services/sesion';
import { SessionService } from '../../services/session.service';
import { Shell } from './shell';

const RESPUESTA_PROFESOR: RespuestaLogin = {
  token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature',
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: '00000000-0000-4000-c000-000000000010',
    nombreCompleto: 'Profesor Bruno',
    correoInstitucional: 'profesor.bruno@uco.net.co',
    rol: 'PROFESOR',
  },
};

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

  async function iniciarSesion(): Promise<void> {
    TestBed.inject(SessionService).saveSession(RESPUESTA_PROFESOR);
    TestBed.inject(SesionService).refrescar();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('no pinta menú ni identidad cuando no existe sesión válida', () => {
    expect(enlacesDelMenu()).toEqual([]);
    expect(raiz().querySelector('.segmentado')).toBeNull();
    expect(raiz().querySelector('.barra__usuario')).toBeNull();
    expect(raiz().querySelector('.btn-salir')).toBeNull();
  });

  it('pinta el menú del rol autenticado y no ofrece selector demo', async () => {
    await iniciarSesion();

    expect(enlacesDelMenu()).toEqual(PERFILES.profesor.menu.map((item) => item.etiqueta));
    expect(raiz().querySelector('.segmentado')).toBeNull();
    expect(raiz().querySelector('.btn-salir')?.textContent).toContain('Cerrar sesión');
  });

  it('usa nombre, correo e iniciales de la sesión real', async () => {
    await iniciarSesion();

    const usuario = raiz().querySelector('.barra__usuario')?.textContent ?? '';
    expect(usuario).toContain('Profesor Bruno');
    expect(usuario).toContain('profesor.bruno@uco.net.co');
    expect(raiz().querySelector('.avatar')?.textContent).toBe('PB');
  });

  it('no cambia el menú por cambiar la URL a otro rol', async () => {
    await iniciarSesion();
    await router.navigateByUrl('/admin/catalogo');
    fixture.detectChanges();

    expect(enlacesDelMenu()).toEqual(PERFILES.profesor.menu.map((item) => item.etiqueta));
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

  it('cerrar sesión limpia la sesión guardada', async () => {
    await iniciarSesion();
    raiz().querySelector<HTMLButtonElement>('.btn-salir')!.click();
    await fixture.whenStable();

    expect(TestBed.inject(SessionService).hasSession()).toBe(false);
    expect(router.url).toBe('/login');
  });
});
