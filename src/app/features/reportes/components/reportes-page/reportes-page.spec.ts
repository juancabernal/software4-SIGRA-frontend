import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SesionService } from '../../../../core/services/sesion';
import { ReportesPage } from './reportes-page';

describe('ReportesPage', () => {
  let fixture: ComponentFixture<ReportesPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  const pestanas = () => Array.from(html.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
  const seleccionada = () => pestanas().find((p) => p.getAttribute('aria-selected') === 'true');

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ReportesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SesionService, useValue: { rol: signal('admin') } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportesPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    fixture.detectChanges();
    flushPendientes();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    html.remove();
    flushPendientes();
  });

  function flushPendientes(): void {
    http.match(() => true).forEach((req) => {
      if (req.request.url.includes('/reportes/rendimiento-ra')) {
        req.flush({ semestreId: null, semestreCodigo: null, asignaturas: [], mensaje: 'Sin datos disponibles' });
      } else if (req.request.url.includes('/reportes/riesgo-academico')) {
        req.flush({
          semestreId: null,
          semestreCodigo: null,
          totalEstudiantesEnRiesgo: 0,
          estudiantes: [],
          mensaje: 'Sin datos disponibles',
        });
      } else {
        req.flush([]);
      }
    });
  }

  it('muestra el título y las dos pestañas en orden', () => {
    expect(html.querySelector('h1')?.textContent).toContain('Reportes');
    expect(pestanas().map((p) => p.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Rendimiento por RA',
      'Riesgo académico',
    ]);
  });

  it('arranca en Rendimiento por RA', () => {
    expect(seleccionada()?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Rendimiento por RA');
    expect(html.querySelector('app-rendimiento-ra-tab')).not.toBeNull();
  });

  it('cambia a Riesgo académico con clic', async () => {
    pestanas()[1].click();
    fixture.detectChanges();
    flushPendientes();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.querySelector('app-rendimiento-ra-tab')).toBeNull();
    expect(html.querySelector('app-riesgo-academico-tab')).not.toBeNull();
  });
});
