import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { SesionService } from '../../../../core/services/sesion';
import { ReportesFacultad } from './reportes-facultad';

const API = `${environment.apiUrl}/v1`;

const RANGOS = [
  { nivel: 'BAJO', notaMinima: 0, notaLimite: 3, limiteIncluido: false },
  { nivel: 'MEDIO', notaMinima: 3, notaLimite: 4, limiteIncluido: false },
  { nivel: 'ALTO', notaMinima: 4, notaLimite: 4.5, limiteIncluido: false },
  { nivel: 'SOBRESALIENTE', notaMinima: 4.5, notaLimite: 5, limiteIncluido: true },
];

const asignatura = (id: string, facultadId: string, facultadNombre: string, programaId: string) => ({
  id,
  codigo: id.toUpperCase(),
  nombre: `Materia ${id}`,
  programaId,
  programaNombre: `Programa ${programaId}`,
  facultadId,
  facultadNombre,
  estado: 'ACTIVA',
  cantidadRa: 5,
});

const SISTEMAS = asignatura('sis1', 'f-ing', 'Facultad de Ingeniería', 'p-sis');
const PENAL = asignatura('der1', 'f-der', 'Facultad de Derecho', 'p-der');

const enReporte = (a: typeof SISTEMAS, promedios: number[], nivel: string) => ({
  asignaturaId: a.id,
  codigo: a.codigo,
  nombre: a.nombre,
  programaId: a.programaId,
  programaNombre: a.programaNombre,
  facultadId: a.facultadId,
  facultadNombre: a.facultadNombre,
  resultados: promedios.map((p, i) => ({
    resultadoAprendizajeId: `${a.id}-r${i}`,
    estado: 'CON_NIVEL',
    nivelLogro: nivel,
    promedioNota: p,
  })),
});

const RENDIMIENTO = {
  semestreId: 's1',
  semestreCodigo: '2026-2',
  mensaje: null,
  asignaturas: [enReporte(SISTEMAS, [4.6, 4.8], 'SOBRESALIENTE'), enReporte(PENAL, [2.1], 'BAJO')],
};

describe('ReportesFacultad', () => {
  let fixture: ComponentFixture<ReportesFacultad>;
  let http: HttpTestingController;
  let html: HTMLElement;

  function crear(rol: 'admin' | 'profesor' | 'estudiante'): void {
    TestBed.configureTestingModule({
      imports: [ReportesFacultad],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SesionService, useValue: { rol: signal(rol) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportesFacultad);
    html = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  const textoDe = (selector: string) =>
    Array.from(html.querySelectorAll(selector)).map((e) => e.textContent?.replace(/\s+/g, ' ').trim());
  const boton = (texto: string) =>
    Array.from(html.querySelectorAll('button')).find((b) =>
      b.textContent?.replace(/\s+/g, ' ').trim().startsWith(texto),
    ) as HTMLButtonElement;

  function responderInstitucional(urlSemestres: string, urlMaterias: string): void {
    http.expectOne(`${API}/niveles-logro`).flush(RANGOS);
    http.expectOne(urlSemestres).flush([{ id: 's1', codigo: '2026-2' }]);
    http.expectOne((r) => r.url === `${API}/reportes/rendimiento-ra`).flush(RENDIMIENTO);
    http.expectOne((r) => r.url === `${API}/reportes/riesgo-academico`).flush({
      semestreId: 's1',
      semestreCodigo: '2026-2',
      totalEstudiantesEnRiesgo: 2,
      mensaje: null,
      estudiantes: [
        { estudianteId: 'e1', asignaturaId: 'der1' },
        { estudianteId: 'e2', asignaturaId: 'der1' },
      ],
    });
    http.expectOne((r) => r.url === urlMaterias).flush([SISTEMAS, PENAL]);
    http
      .expectOne((r) => r.url === `${API}/acciones-mejora`)
      .flush([{ asignaturaId: 'der1', convertida: true }]);
    fixture.detectChanges();
  }

  describe('administrador', () => {
    beforeEach(() => crear('admin'));

    it('muestra el nombre del módulo y la vista institucional', () => {
      expect(html.textContent).toContain('Cargando reportes por facultad');
      responderInstitucional(`${API}/semestres`, `${API}/asignaturas`);

      expect(html.querySelector('h2')?.textContent).toContain('Reportes por facultad');
      expect(html.textContent).toContain('Vista institucional');
      expect(html.textContent).toContain('Semestre: 2026-2');
    });

    it('ordena las facultades de mejor a peor logro, con semáforo y texto', () => {
      responderInstitucional(`${API}/semestres`, `${API}/asignaturas`);

      const nombres = textoDe('.ranking h3');
      expect(nombres).toEqual(['Facultad de Ingeniería', 'Facultad de Derecho']);
      const filas = html.querySelectorAll('.ranking > .fila');
      expect(filas[0].classList).toContain('fila--verde');
      expect(filas[0].textContent).toContain('Logro alto');
      expect(filas[1].classList).toContain('fila--rojo');
      expect(filas[1].textContent).toContain('Logro bajo');
      expect(filas[1].textContent).toContain('Estudiantes en riesgo');
      expect(filas[1].textContent).toContain('1 de 1 convertidas');
      // La barra de distribución tiene texto alternativo.
      expect(filas[1].querySelector('.distribucion')?.getAttribute('aria-label')).toContain('Bajo: 1');
    });

    it('baja de facultad a programa y a materia, y vuelve con las migas', () => {
      responderInstitucional(`${API}/semestres`, `${API}/asignaturas`);

      boton('Ver programas').click();
      fixture.detectChanges();
      expect(textoDe('.ranking h3')).toEqual(['Programa p-sis']);
      expect(textoDe('.migas li')).toEqual(['Facultades', 'Facultad de Ingeniería']);

      boton('Ver materias').click();
      fixture.detectChanges();
      expect(textoDe('.ranking h3')).toEqual(['SIS1 Materia sis1']);
      expect(boton('Ver')).toBeUndefined();

      boton('Facultades').click();
      fixture.detectChanges();
      expect(textoDe('.ranking h3')).toEqual(['Facultad de Ingeniería', 'Facultad de Derecho']);
    });

    it('al cambiar de semestre vuelve a consultar con ese semestre', () => {
      responderInstitucional(`${API}/semestres`, `${API}/asignaturas`);

      const semestre = html.querySelector('#filtro-semestre-facultad') as HTMLSelectElement;
      semestre.value = 's1';
      semestre.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const req = http.expectOne((r) => r.url === `${API}/reportes/rendimiento-ra`);
      expect(req.request.params.get('semestreId')).toBe('s1');
      req.flush(RENDIMIENTO);
      http.expectOne((r) => r.url === `${API}/reportes/riesgo-academico`).flush({ estudiantes: [] });
      http.expectOne((r) => r.url === `${API}/asignaturas`).flush([]);
      http.expectOne((r) => r.url === `${API}/acciones-mejora`).flush([]);
    });

    it('muestra el error del backend y permite reintentar', () => {
      http.expectOne(`${API}/niveles-logro`).flush(RANGOS);
      http.expectOne(`${API}/semestres`).flush([]);
      http
        .expectOne((r) => r.url === `${API}/reportes/rendimiento-ra`)
        .flush(
          { status: 400, error: 'BAD_REQUEST', mensaje: 'El semestre indicado no es válido' },
          { status: 400, statusText: 'Bad Request' },
        );
      http.match(() => true).forEach((r) => !r.cancelled && r.flush([]));
      fixture.detectChanges();

      expect(html.querySelector('[role="alert"]')?.textContent).toContain(
        'El semestre indicado no es válido',
      );
      boton('Reintentar').click();
      fixture.detectChanges();
      expect(http.match((r) => r.url === `${API}/reportes/rendimiento-ra`).length).toBe(1);
      http.match(() => true).forEach((r) => r.flush([]));
    });
  });

  it('el profesor ve sus materias, con sus semestres y su etiqueta', () => {
    crear('profesor');
    responderInstitucional(`${API}/semestres/mios`, `${API}/asignaturas/mias`);

    expect(html.textContent).toContain('Vista de tus materias');
    expect(html.querySelectorAll('.ranking > .fila').length).toBe(2);
    expect(html.textContent).toContain('Estudiantes en riesgo');
  });

  it('el estudiante ve solo su desempeño, sin datos de otros estudiantes', () => {
    crear('estudiante');
    http.expectOne(`${API}/niveles-logro`).flush(RANGOS);
    http.expectNone(`${API}/semestres`);
    http.expectOne(`${API}/estudiantes/me/progreso`).flush([
      {
        matriculaId: 'm1',
        asignaturaCodigo: 'SIS1',
        asignaturaNombre: 'Materia sis1',
        programaNombre: 'Programa p-sis',
        semestreCodigo: '2026-2',
        fechaMatricula: '2026-07-01',
        situacion: 'EN_CURSO',
        resultadosAprendizaje: [
          { codigo: 'RA-01', nivelLogro: 'ALTO', promedio: 4.2 },
          { codigo: 'RA-02', nivelLogro: 'SIN_EVALUAR', promedio: null },
        ],
      },
    ]);
    http.expectOne((r) => r.url === `${API}/asignaturas/mias`).flush([SISTEMAS]);
    fixture.detectChanges();

    expect(html.textContent).toContain('Vista personal');
    expect(html.querySelector('#filtro-semestre-facultad')).toBeNull();
    expect(textoDe('.ranking h3')).toEqual(['Facultad de Ingeniería']);
    expect(html.textContent).toContain('RA sin evaluar');
    expect(html.textContent).not.toContain('Estudiantes en riesgo');
    expect(html.textContent).not.toContain('Acciones de mejora');
    http.expectNone((r) => r.url.includes('/reportes/'));
  });

  it('el estudiante sin materias en curso ve un estado vacío propio', () => {
    crear('estudiante');
    http.expectOne(`${API}/niveles-logro`).flush(RANGOS);
    http.expectOne(`${API}/estudiantes/me/progreso`).flush([]);
    http.expectOne((r) => r.url === `${API}/asignaturas/mias`).flush([]);
    fixture.detectChanges();

    expect(html.textContent).toContain('Cuando tengas materias en curso');
  });
});
