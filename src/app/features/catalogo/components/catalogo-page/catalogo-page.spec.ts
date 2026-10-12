import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogoPage } from './catalogo-page';

describe('CatalogoPage', () => {
  let fixture: ComponentFixture<CatalogoPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  const pestanas = () => Array.from(html.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
  const seleccionada = () => pestanas().find((p) => p.getAttribute('aria-selected') === 'true');

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CatalogoPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CatalogoPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    await fixture.whenStable();
  });

  afterEach(() => html.remove());

  async function teclear(tecla: string): Promise<void> {
    seleccionada()!.dispatchEvent(new KeyboardEvent('keydown', { key: tecla, bubbles: true }));
    await fixture.whenStable();
  }

  it('muestra el título, el subtítulo y las tres pestañas en orden', () => {
    expect(html.querySelector('h1')?.textContent).toContain('Catálogo académico');
    expect(html.textContent).toContain('Gestión de profesores, programas y materias');
    expect(pestanas().map((p) => p.textContent?.trim())).toEqual([
      'Profesores',
      'Programas académicos',
      'Materias',
    ]);
  });

  it('arranca en «Materias» con el patrón ARIA de tabs', () => {
    const activa = seleccionada()!;
    expect(activa.textContent?.trim()).toBe('Materias');
    expect(activa.getAttribute('tabindex')).toBe('0');
    expect(pestanas().filter((p) => p.getAttribute('tabindex') === '-1').length).toBe(2);

    const panel = html.querySelector('[role="tabpanel"]') as HTMLElement;
    expect(activa.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(activa.id);
    expect(html.querySelector('app-materias-tab')).not.toBeNull();
  });

  it('cada pestaña muestra su propio módulo implementado', async () => {
    pestanas()[0].click(); // Profesores (RF-01)
    await fixture.whenStable();
    expect(html.querySelector('app-profesores-tab')).not.toBeNull();
    expect(html.querySelector('app-materias-tab')).toBeNull();
    expect(html.querySelector('app-modulo-pendiente')).toBeNull();

    pestanas()[1].click(); // Programas académicos (RF-02)
    await fixture.whenStable();
    expect(html.querySelector('app-programas-tab')).not.toBeNull();
    expect(html.querySelector('app-profesores-tab')).toBeNull();

    pestanas()[2].click(); // Materias (RF-03)
    await fixture.whenStable();
    expect(html.querySelector('app-materias-tab')).not.toBeNull();
    expect(html.querySelector('app-programas-tab')).toBeNull();
  });

  it('las flechas, Inicio y Fin mueven la selección y el foco', async () => {
    await teclear('ArrowRight');
    expect(seleccionada()?.textContent?.trim()).toBe('Profesores');
    expect(document.activeElement).toBe(seleccionada());

    await teclear('ArrowLeft');
    expect(seleccionada()?.textContent?.trim()).toBe('Materias');

    await teclear('Home');
    expect(seleccionada()?.textContent?.trim()).toBe('Profesores');

    await teclear('End');
    expect(seleccionada()?.textContent?.trim()).toBe('Materias');
    expect(document.activeElement).toBe(seleccionada());
    expect(http.match(() => true).length).toBeGreaterThan(0);
  });
});
