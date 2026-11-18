import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { SesionService } from '../../../../core/services/sesion';
import { RiesgoAcademicoReporte, chipSeveridad } from '../../models/riesgo-academico.model';
import { RiesgoAcademicoTab } from './riesgo-academico-tab';

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
const REPORTE: RiesgoAcademicoReporte = {
  semestreId: 's1',
  semestreCodigo: '2026-2',
  totalEstudiantesEnRiesgo: 1,
  mensaje: null,
  estudiantes: [
    {
      estudianteId: 'e1',
      nombreCompleto: 'Mariana Salazar Duque',
      primerNombre: 'Mariana',
      segundoNombre: null,
      primerApellido: 'Salazar',
      segundoApellido: 'Duque',
      correoInstitucional: 'mariana@uco.net.co',
      numeroDocumento: '10458921',
      asignaturaId: 'a1',
      asignaturaCodigo: 'SIS101',
      asignaturaNombre: 'Programación',
      programaId: 'p1',
      programaNombre: 'Ingeniería de Sistemas',
      facultadId: 'f1',
      facultadNombre: 'Facultad de Ingeniería',
      cantidadRaNoAlcanzados: 2,
      severidad: 'RIESGO',
      ras: [
        {
          resultadoAprendizajeId: 'r1',
          codigo: 'RA-01',
          descripcion: 'Control',
          nivelLogro: 'BAJO',
          promedio: 2.1,
        },
        {
          resultadoAprendizajeId: 'r2',
          codigo: 'RA-02',
          descripcion: 'Componentes',
          nivelLogro: 'MEDIO',
          promedio: 3.2,
        },
      ],
    },
  ],
};

describe('RiesgoAcademicoTab', () => {
  let fixture: ComponentFixture<RiesgoAcademicoTab>;
  let http: HttpTestingController;

  function crear(rol: 'admin' | 'profesor' = 'admin'): HTMLElement {
    TestBed.configureTestingModule({
      imports: [RiesgoAcademicoTab],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SesionService, useValue: { rol: signal(rol) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RiesgoAcademicoTab);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function responderListas(asignaturas: unknown[] = [ASIGNATURA, ASIGNATURA_DERECHO]): void {
    http.expectOne(`${API}/v1/semestres`).flush([{ id: 's1', codigo: '2026-2' }]);
    http.expectOne((r) => r.url === `${API}/v1/asignaturas`).flush(asignaturas);
    http.expectOne(`${API}/v1/facultades`).flush(FACULTADES);
    http.expectNone(`${API}/v1/programas`);
  }

  afterEach(() => http.verify());

  it('muestra estudiantes en riesgo con severidad y detalle de RA', () => {
    const html = crear();
    expect(html.textContent).toContain('Cargando reporte');

    responderListas();
    const req = http.expectOne((r) => r.url === `${API}/v1/reportes/riesgo-academico`);
    expect(req.request.params.get('minRaNoAlcanzados')).toBe('1');
    req.flush(REPORTE);
    fixture.detectChanges();

    expect(html.textContent).toContain('Mariana Salazar Duque');
    expect(html.textContent).toContain('RA-01');
    expect(html.textContent).toContain('Riesgo');
    expect(html.textContent).toContain('Estudiantes en riesgo: 1');
  });

  it('muestra vacío cuando el backend no tiene filas', () => {
    const html = crear();
    responderListas();
    http.expectOne((r) => r.url === `${API}/v1/reportes/riesgo-academico`).flush({
      semestreId: 's1',
      semestreCodigo: '2026-2',
      totalEstudiantesEnRiesgo: 0,
      estudiantes: [],
      mensaje: 'Sin datos disponibles',
    });
    fixture.detectChanges();

    expect(html.textContent).toContain('Sin datos disponibles');
  });

  it('al elegir una facultad la envía al backend y acota programas y asignaturas', () => {
    const html = crear();
    responderListas();
    http.expectOne((r) => r.url === `${API}/v1/reportes/riesgo-academico`).flush(REPORTE);
    fixture.detectChanges();
    expect(html.textContent).toContain('Facultad de Ingeniería · Ingeniería de Sistemas');

    const textos = (selector: string) =>
      [...html.querySelectorAll(`${selector} option`)].map((o) => o.textContent?.trim());
    expect(textos('#filtro-facultad-r6')).toEqual([
      'Todas las facultades',
      'Facultad de Derecho',
      'Facultad de Ingeniería',
    ]);

    const facultad = html.querySelector('#filtro-facultad-r6') as HTMLSelectElement;
    facultad.value = 'f2';
    facultad.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${API}/v1/reportes/riesgo-academico`);
    expect(req.request.params.get('facultadId')).toBe('f2');
    expect(req.request.params.get('minRaNoAlcanzados')).toBe('1');
    req.flush({ ...REPORTE, totalEstudiantesEnRiesgo: 0, estudiantes: [], mensaje: 'Sin datos disponibles' });
    fixture.detectChanges();

    expect(textos('#filtro-programa-r6')).toEqual(['Todos los programas', 'Derecho']);
    expect(textos('#filtro-asignatura-r6')).toEqual(['Todas las asignaturas', 'DER101 · Derecho Civil']);
    expect(html.textContent).toContain('Sin datos disponibles');
  });

  it('el profesor arma las facultades con sus asignaturas y no consulta /facultades', () => {
    const html = crear('profesor');
    http.expectOne(`${API}/v1/semestres`).flush([{ id: 's1', codigo: '2026-2' }]);
    http.expectOne((r) => r.url === `${API}/v1/asignaturas/mias`).flush([ASIGNATURA]);
    http.expectNone(`${API}/v1/facultades`);
    http.expectOne((r) => r.url === `${API}/v1/reportes/riesgo-academico`).flush(REPORTE);
    fixture.detectChanges();

    const facultad = html.querySelector('#filtro-facultad-r6') as HTMLSelectElement;
    expect([...facultad.options].map((o) => o.textContent?.trim())).toEqual([
      'Todas las facultades',
      'Facultad de Ingeniería',
    ]);
    facultad.value = 'f1';
    facultad.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url === `${API}/v1/reportes/riesgo-academico`);
    expect(req.request.params.get('facultadId')).toBe('f1');
    req.flush(REPORTE);
  });

  it('un profesor sin asignaturas ve el filtro de facultad deshabilitado con un aviso', () => {
    const html = crear('profesor');
    http.expectOne(`${API}/v1/semestres`).flush([]);
    http.expectOne((r) => r.url === `${API}/v1/asignaturas/mias`).flush([]);
    http.expectOne((r) => r.url === `${API}/v1/reportes/riesgo-academico`).flush(REPORTE);
    fixture.detectChanges();

    expect((html.querySelector('#filtro-facultad-r6') as HTMLSelectElement).disabled).toBe(true);
    expect(html.querySelector('#filtro-facultad-r6-ayuda')?.textContent).toContain(
      'No tienes asignaturas asignadas',
    );
  });

  it('al cambiar el umbral vuelve a consultar', () => {
    const html = crear();
    responderListas();
    http.expectOne((r) => r.url === `${API}/v1/reportes/riesgo-academico`).flush(REPORTE);
    fixture.detectChanges();

    const select = html.querySelector('#filtro-umbral-r6') as HTMLSelectElement;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${API}/v1/reportes/riesgo-academico`);
    expect(req.request.params.get('minRaNoAlcanzados')).toBe('2');
    req.flush(REPORTE);
  });
});

describe('chipSeveridad', () => {
  it('mapea las tres severidades a etiqueta y variante', () => {
    expect(chipSeveridad('ATENCION').etiqueta).toBe('Atención');
    expect(chipSeveridad('RIESGO').variante).toBe('advertencia');
    expect(chipSeveridad('ALTO_RIESGO').variante).toBe('peligro');
  });
});
