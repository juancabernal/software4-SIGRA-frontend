import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { PERFILES } from '../../models/rol';
import { Shell } from './shell';

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
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([
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
});
