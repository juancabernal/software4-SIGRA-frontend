import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModuloPendiente } from './modulo-pendiente';

describe('ModuloPendiente', () => {
  let fixture: ComponentFixture<ModuloPendiente>;

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ModuloPendiente] }).compileComponents();
    fixture = TestBed.createComponent(ModuloPendiente);
  });

  it('muestra el nombre del módulo como título de la pantalla', async () => {
    fixture.componentRef.setInput('titulo', 'Catálogo académico');
    await fixture.whenStable();

    const titulo = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(titulo.textContent?.trim()).toBe('Catálogo académico');
  });

  it('explica que la pantalla está pendiente en lugar de dejarla vacía', async () => {
    fixture.componentRef.setInput('titulo', 'Reportes');
    await fixture.whenStable();

    expect(texto()).toContain('Módulo en construcción');
    expect(texto()).toContain('cuando el módulo se construya');
  });

  it('omite el subtítulo y el requisito cuando no se informan', async () => {
    fixture.componentRef.setInput('titulo', 'Reportes');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.cabecera__sub')).toBeNull();
    expect(fixture.nativeElement.querySelector('.requisito')).toBeNull();
  });

  it('muestra el requisito que cubrirá la pantalla cuando se informa', async () => {
    fixture.componentRef.setInput('titulo', 'Estudiantes');
    fixture.componentRef.setInput('subtitulo', 'Ficha del estudiante');
    fixture.componentRef.setInput('requisito', 'RF-09a');
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.cabecera__sub').textContent).toContain(
      'Ficha del estudiante',
    );
    expect(fixture.nativeElement.querySelector('.requisito').textContent).toContain('RF-09a');
  });

  it('asocia el título a la región de la pantalla', async () => {
    fixture.componentRef.setInput('titulo', 'Reportes');
    await fixture.whenStable();

    const seccion = fixture.nativeElement.querySelector('section') as HTMLElement;
    const titulo = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(seccion.getAttribute('aria-labelledby')).toBe(titulo.id);
  });
});
