import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsignacionDocentePage } from './asignacion-docente-page';

describe('AsignacionDocentePage', () => {
  let fixture: ComponentFixture<AsignacionDocentePage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  const pestanas = () => Array.from(html.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
  const seleccionada = () => pestanas().find((p) => p.getAttribute('aria-selected') === 'true');

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AsignacionDocentePage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AsignacionDocentePage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    fixture.detectChanges();
    // AsignarTab carga profesores y materias al iniciar.
    http.match(() => true).forEach((req) => req.flush([]));
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    html.remove();
    http.match(() => true).forEach((req) => req.flush([]));
  });

  async function teclear(tecla: string): Promise<void> {
    seleccionada()!.dispatchEvent(new KeyboardEvent('keydown', { key: tecla, bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('muestra el título y las dos pestañas en orden', () => {
    expect(html.querySelector('h1')?.textContent).toContain('Asignación docente');
    expect(pestanas().map((p) => p.textContent?.trim())).toEqual([
      'Asignar',
      'Consultar y desasignar',
    ]);
  });

  it('arranca en «Asignar» con el patrón ARIA de tabs', () => {
    const activa = seleccionada()!;
    expect(activa.textContent?.trim()).toBe('Asignar');
    expect(activa.getAttribute('tabindex')).toBe('0');
    expect(pestanas().filter((p) => p.getAttribute('tabindex') === '-1').length).toBe(1);

    const panel = html.querySelector('[role="tabpanel"]') as HTMLElement;
    expect(activa.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(activa.id);
    expect(html.querySelector('app-asignar-tab')).not.toBeNull();
  });

  it('cambia a «Consultar y desasignar» con clic', async () => {
    pestanas()[1].click();
    fixture.detectChanges();
    http.match(() => true).forEach((req) => req.flush([]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.querySelector('app-asignar-tab')).toBeNull();
    expect(html.querySelector('app-consultar-tab')).not.toBeNull();
  });

  it('las flechas, Inicio y Fin mueven la selección y el foco', async () => {
    await teclear('ArrowRight');
    http.match(() => true).forEach((req) => req.flush([]));
    await fixture.whenStable();
    expect(seleccionada()?.textContent?.trim()).toBe('Consultar y desasignar');
    expect(document.activeElement).toBe(seleccionada());

    await teclear('ArrowLeft');
    http.match(() => true).forEach((req) => req.flush([]));
    await fixture.whenStable();
    expect(seleccionada()?.textContent?.trim()).toBe('Asignar');

    await teclear('End');
    http.match(() => true).forEach((req) => req.flush([]));
    await fixture.whenStable();
    expect(seleccionada()?.textContent?.trim()).toBe('Consultar y desasignar');

    await teclear('Home');
    http.match(() => true).forEach((req) => req.flush([]));
    await fixture.whenStable();
    expect(seleccionada()?.textContent?.trim()).toBe('Asignar');
    expect(document.activeElement).toBe(seleccionada());
  });
});
