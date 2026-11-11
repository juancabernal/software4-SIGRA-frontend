import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { SesionService } from '../../../../core/services/sesion';
import { RendimientoRaReporte, badgeDeRa } from '../../models/rendimiento-ra.model';
import { RendimientoRaTab } from './rendimiento-ra-tab';

const API = environment.apiUrl;
const ASIGNATURA = {
  id: 'a1',
  codigo: 'SIS101',
  nombre: 'Programación',
  programaId: 'p1',
  programaNombre: 'Ingeniería de Sistemas',
  estado: 'ACTIVA',
  cantidadRa: 2,
};
const REPORTE: RendimientoRaReporte = {
  semestreId: 's1',
  semestreCodigo: '2026-2',
  mensaje: null,
  asignaturas: [
    {
      asignaturaId: 'a1',
      codigo: 'SIS101',
      nombre: 'Programación',
      programaId: 'p1',
      programaNombre: 'Ingeniería de Sistemas',
      resultados: [
        {
          resultadoAprendizajeId: 'r1',
          codigo: 'RA-01',
          descripcion: 'Con nivel',
          cantidadCalificaciones: 14,
          estado: 'CON_NIVEL',
          nivelLogro: 'MEDIO',
          promedioNota: 3.65,
          evaluados: 4,
          sinDatosSuficientes: 1,
          sinEvaluar: 1,
          distribucion: [
            { nivel: 'BAJO', cantidad: 1, porcentaje: 25 },
            { nivel: 'MEDIO', cantidad: 1, porcentaje: 25 },
            { nivel: 'ALTO', cantidad: 1, porcentaje: 25 },
            { nivel: 'SOBRESALIENTE', cantidad: 1, porcentaje: 25 },
          ],
          mensaje: null,
        },
        {
          resultadoAprendizajeId: 'r2',
          codigo: 'RA-02',
          descripcion: 'Sin notas',
          cantidadCalificaciones: 0,
          estado: 'SIN_EVALUAR',
          nivelLogro: null,
          promedioNota: null,
          evaluados: 0,
          sinDatosSuficientes: 0,
          sinEvaluar: 6,
          distribucion: [],
          mensaje: 'Sin evaluar',
        },
      ],
    },
  ],
};

describe('RendimientoRaTab', () => {
  let fixture: ComponentFixture<RendimientoRaTab>;
  let http: HttpTestingController;

  function crear(rol: 'admin' | 'profesor'): HTMLElement {
    TestBed.configureTestingModule({
      imports: [RendimientoRaTab],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SesionService, useValue: { rol: signal(rol) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RendimientoRaTab);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function responderListas(rutaAsignaturas: string): void {
    http.expectOne(`${API}/v1/semestres`).flush([{ id: 's1', codigo: '2026-2' }]);
    http.expectOne((r) => r.url === `${API}/v1/asignaturas${rutaAsignaturas}`).flush([ASIGNATURA]);
  }

  afterEach(() => http.verify());

  it('muestra el estado de carga y luego el reporte agrupado por asignatura', () => {
    const html = crear('admin');
    expect(html.textContent).toContain('Cargando reporte');

    responderListas('');
    http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`).flush(REPORTE);
    fixture.detectChanges();

    expect(html.textContent).toContain('SIS101 · Programación');
    expect(html.textContent).toContain('RA-01');
    expect(html.textContent).toContain('3,65');
    expect(html.textContent).toContain('Medio');
    expect(html.textContent).toContain('Sin evaluar');
    expect(html.textContent).not.toContain('Cargando reporte');
  });

  it('el profesor arma sus filtros con sus propias asignaturas (/mias)', () => {
    crear('profesor');
    responderListas('/mias');
    http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`).flush(REPORTE);
    fixture.detectChanges();

    const opciones = [...(fixture.nativeElement as HTMLElement).querySelectorAll('#filtro-asignatura-r1 option')];
    expect(opciones.map((o) => o.textContent?.trim())).toContain('SIS101 · Programación');
  });

  it('muestra el estado vacío con el mensaje del backend', () => {
    const html = crear('admin');
    responderListas('');
    http
      .expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`)
      .flush({ semestreId: null, semestreCodigo: null, asignaturas: [], mensaje: 'Sin datos disponibles' });
    fixture.detectChanges();

    expect(html.textContent).toContain('Sin datos disponibles');
  });

  it('muestra un error sin detalles técnicos y permite reintentar', () => {
    const html = crear('admin');
    responderListas('');
    http
      .expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`)
      .flush({ mensaje: 'x' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(html.querySelector('[role="alert"]')).not.toBeNull();
    (html.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`).flush(REPORTE);
  });

  it('al elegir una asignatura vuelve a consultar con ese filtro', () => {
    const html = crear('admin');
    responderListas('');
    http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`).flush(REPORTE);
    fixture.detectChanges();

    const select = html.querySelector('#filtro-asignatura-r1') as HTMLSelectElement;
    select.value = 'a1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`);
    expect(req.request.params.get('asignaturaId')).toBe('a1');
    req.flush(REPORTE);
  });
});

describe('badgeDeRa', () => {
  it('usa el nivel cuando lo hay y el estado sin nivel en los otros casos', () => {
    expect(badgeDeRa({ estado: 'CON_NIVEL', nivelLogro: 'ALTO' })).toBe('ALTO');
    expect(badgeDeRa({ estado: 'DATOS_INSUFICIENTES', nivelLogro: null })).toBe('SIN_DATOS');
    expect(badgeDeRa({ estado: 'SIN_EVALUAR', nivelLogro: null })).toBe('SIN_EVALUAR');
  });
});
