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
  const rol = signal('admin');

  const pestanas = () => Array.from(html.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
  const seleccionada = () => pestanas().find((p) => p.getAttribute('aria-selected') === 'true');

  beforeEach(async () => {
    rol.set('admin');
    TestBed.configureTestingModule({
      imports: [ReportesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SesionService, useValue: { rol } },
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
      if (req.request.url.includes('/reportes/acciones-mejora')) {
        req.flush({ resumen: { total: 0, convertidas: 0, sinConvertir: 0, porcentajeConversion: 0 }, filas: [] });
      } else if (req.request.url.includes('/reportes/rendimiento-ra')) {
        req.flush({ semestreId: null, semestreCodigo: null, asignaturas: [], mensaje: 'Sin datos disponibles' });
      } else if (req.request.url.includes('/reportes/riesgo-academico')) {
        req.flush({
          semestreId: null,
          semestreCodigo: null,
          totalEstudiantesEnRiesgo: 0,
          estudiantes: [],
          mensaje: 'Sin datos disponibles',
        });
      } else if (req.request.url.includes('/reportes/matriculas-programa-semestre')) {
        req.flush({
          semestreId: null,
          programaId: null,
          facultadId: null,
          resumen: {
            totalMatriculas: 0,
            activas: 0,
            desvinculadas: 0,
            estudiantesDistintos: 0,
            programas: 0,
            semestres: 0,
          },
          filas: [],
        });
      } else if (req.request.url.includes('/reportes/trazabilidad-uso/profesor')) {
        req.flush({
          desde: '2026-07-01',
          hasta: '2026-12-15',
          semestreId: null,
          semestreCodigo: null,
          propia: { totalEventos: 0, ultimaActividad: null, acciones: [] },
          resumenEstudiantes: { total: 0, conActividad: 0, sinActividad: 0, ingresos: 0 },
          estudiantes: [],
          mensaje: null,
        });
      } else if (req.request.url.includes('/reportes/trazabilidad-uso')) {
        req.flush({
          desde: '2026-10-17',
          hasta: '2026-11-15',
          semestreId: null,
          semestreCodigo: null,
          rol: null,
          resumen: { totalEventos: 0, usuariosActivos: 0, loginsExitosos: 0, loginsFallidos: 0 },
          porRol: [],
        });
      } else {
        req.flush([]);
      }
    });
  }

  it('muestra el título y las seis pestañas del administrador en orden', () => {
    expect(html.querySelector('h1')?.textContent).toContain('Reportes');
    expect(pestanas().map((p) => p.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Rendimiento por RA',
      'Riesgo académico',
      'Reportes por facultad',
      'Matrículas por programa',
      'Acciones de mejora',
      'Trazabilidad por rol',
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

  it('muestra la pestaña R2 y su componente', async () => {
    pestanas()[3].click();
    fixture.detectChanges();
    flushPendientes();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.querySelector('app-matriculas-programa-semestre-tab')).not.toBeNull();
  });

  it('muestra R7 al administrador con la vista general', async () => {
    pestanas()[5].click();
    fixture.detectChanges();
    flushPendientes();
    await fixture.whenStable();
    fixture.detectChanges();
    flushPendientes();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.querySelector('app-trazabilidad-uso-tab')).not.toBeNull();
    expect(html.querySelector('#filtro-rol-r7')).not.toBeNull();
  });

  it('muestra R7 al profesor con su vista propia', async () => {
    rol.set('profesor');
    fixture.detectChanges();
    pestanas()[4].click();
    fixture.detectChanges();
    flushPendientes();
    await fixture.whenStable();
    fixture.detectChanges();
    flushPendientes();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.querySelector('app-trazabilidad-uso-tab')).not.toBeNull();
    expect(html.querySelector('#filtro-rol-r7')).toBeNull();
    expect(html.textContent).toContain('Actividad de mis estudiantes');
  });

  it('oculta Matrículas por programa al profesor y le deja Acciones de mejora y Trazabilidad por rol', () => {
    rol.set('profesor');
    fixture.detectChanges();

    expect(pestanas().map((p) => p.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Rendimiento por RA',
      'Riesgo académico',
      'Reportes por facultad',
      'Acciones de mejora',
      'Trazabilidad por rol',
    ]);
    expect(html.querySelector('app-matriculas-programa-semestre-tab')).toBeNull();
    expect(http.match((req) => req.url.includes('/reportes/matriculas-programa-semestre'))).toHaveLength(0);
  });

  it('permite al profesor abrir el reporte de acciones de mejora', async () => {
    rol.set('profesor');
    fixture.detectChanges();
    const boton = pestanas().find(p => p.textContent?.includes('Acciones de mejora'))!;
    boton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    flushPendientes();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(html.querySelector('app-acciones-mejora-tab')).not.toBeNull();
    expect(html.textContent).toContain('No hay acciones de mejora');
  });

  it('oculta el R4 al estudiante', () => {
    rol.set('estudiante');
    fixture.detectChanges();
    expect(pestanas().some(p => p.textContent?.includes('Acciones de mejora'))).toBe(false);
    expect(html.querySelector('app-acciones-mejora-tab')).toBeNull();
    expect(http.match(req => req.url.endsWith('/reportes/acciones-mejora'))).toHaveLength(0);
  });
});
