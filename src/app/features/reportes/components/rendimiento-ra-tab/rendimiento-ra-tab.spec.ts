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
  facultadId: 'f1',
  facultadNombre: 'Facultad de Ingeniería',
  estado: 'ACTIVA',
  cantidadRa: 2,
};
const ASIGNATURA_DERECHO = {
  ...ASIGNATURA,
  id: 'a2',
  codigo: 'DER101',
  nombre: 'Derecho Civil',
  programaId: 'p2',
  programaNombre: 'Derecho',
  facultadId: 'f2',
  facultadNombre: 'Facultad de Derecho',
};
// GET /facultades (solo Administrador) las devuelve ordenadas por nombre.
const FACULTADES = [
  { id: 'f2', nombre: 'Facultad de Derecho', estado: 'ACTIVO' },
  { id: 'f1', nombre: 'Facultad de Ingeniería', estado: 'ACTIVO' },
];
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
      facultadId: 'f1',
      facultadNombre: 'Facultad de Ingeniería',
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

  function responderListas(rutaAsignaturas: string, asignaturas: unknown[] = [ASIGNATURA]): void {
    http.expectOne(`${API}/v1/semestres`).flush([{ id: 's1', codigo: '2026-2' }]);
    http.expectOne((r) => r.url === `${API}/v1/asignaturas${rutaAsignaturas}`).flush(asignaturas);
    // Solo el Administrador consulta GET /facultades; el Profesor arma las opciones con /mias.
    if (rutaAsignaturas === '') {
      http.expectOne(`${API}/v1/facultades`).flush(FACULTADES);
    } else {
      http.expectNone(`${API}/v1/facultades`);
    }
    http.expectNone(`${API}/v1/programas`);
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

  it('el profesor elige entre las facultades de sus asignaturas y el filtro va al backend', () => {
    const html = crear('profesor');
    responderListas('/mias', [ASIGNATURA, ASIGNATURA_DERECHO, { ...ASIGNATURA, id: 'a3', codigo: 'SIS102' }]);
    http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`).flush(REPORTE);
    fixture.detectChanges();

    const facultad = html.querySelector('#filtro-facultad-r1') as HTMLSelectElement;
    expect(facultad.disabled).toBe(false);
    expect([...facultad.options].map((o) => o.textContent?.trim())).toEqual([
      'Todas las facultades',
      'Facultad de Derecho',
      'Facultad de Ingeniería',
    ]);

    facultad.value = 'f2';
    facultad.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`);
    expect(req.request.params.get('facultadId')).toBe('f2');
    req.flush({ ...REPORTE, asignaturas: [] , mensaje: 'Sin datos disponibles' });
  });

  it('un profesor sin asignaturas ve el filtro de facultad deshabilitado con un aviso', () => {
    const html = crear('profesor');
    responderListas('/mias', []);
    http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`).flush(REPORTE);
    fixture.detectChanges();

    const facultad = html.querySelector('#filtro-facultad-r1') as HTMLSelectElement;
    expect(facultad.disabled).toBe(true);
    expect(html.querySelector('#filtro-facultad-r1-ayuda')?.textContent).toContain(
      'No tienes asignaturas asignadas',
    );
  });

  it('el administrador filtra por facultad: lo envía al backend y acota programas y asignaturas', () => {
    const html = crear('admin');
    responderListas('', [ASIGNATURA, ASIGNATURA_DERECHO]);
    http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`).flush(REPORTE);
    fixture.detectChanges();

    const textos = (selector: string) =>
      [...html.querySelectorAll(`${selector} option`)].map((o) => o.textContent?.trim());
    expect(textos('#filtro-facultad-r1')).toEqual([
      'Todas las facultades',
      'Facultad de Derecho',
      'Facultad de Ingeniería',
    ]);
    expect(html.textContent).toContain('Facultad de Ingeniería · Ingeniería de Sistemas');

    const facultad = html.querySelector('#filtro-facultad-r1') as HTMLSelectElement;
    facultad.value = 'f1';
    facultad.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`);
    expect(req.request.params.get('facultadId')).toBe('f1');
    req.flush(REPORTE);
    fixture.detectChanges();

    expect(textos('#filtro-programa-r1')).toEqual(['Todos los programas', 'Ingeniería de Sistemas']);
    expect(textos('#filtro-asignatura-r1')).toEqual(['Todas las asignaturas', 'SIS101 · Programación']);
  });

  it('al cambiar de facultad limpia la asignatura elegida si es de otra facultad', () => {
    const html = crear('admin');
    responderListas('', [ASIGNATURA, ASIGNATURA_DERECHO]);
    http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`).flush(REPORTE);
    fixture.detectChanges();

    const asignatura = html.querySelector('#filtro-asignatura-r1') as HTMLSelectElement;
    asignatura.value = 'a2';
    asignatura.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`).flush(REPORTE);

    const facultad = html.querySelector('#filtro-facultad-r1') as HTMLSelectElement;
    facultad.value = 'f1';
    facultad.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${API}/v1/reportes/rendimiento-ra`);
    expect(req.request.params.get('facultadId')).toBe('f1');
    expect(req.request.params.has('asignaturaId')).toBe(false);
    req.flush(REPORTE);
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
