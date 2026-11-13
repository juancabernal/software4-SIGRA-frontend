import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { DatosReporteFacultad } from '../models/reportes-facultad.model';
import { ReportesFacultadService } from './reportes-facultad.service';

const API = `${environment.apiUrl}/v1`;

const ASIGNATURA = {
  id: 'a1',
  codigo: 'SIS101',
  nombre: 'Programación',
  programaId: 'p1',
  programaNombre: 'Ingeniería de Sistemas',
  facultadId: 'f1',
  facultadNombre: 'Facultad de Ingeniería',
  estado: 'ACTIVA',
  cantidadRa: 4,
};

const RENDIMIENTO = {
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
        { resultadoAprendizajeId: 'r1', estado: 'CON_NIVEL', nivelLogro: 'ALTO', promedioNota: 4.1 },
        { resultadoAprendizajeId: 'r2', estado: 'SIN_EVALUAR', nivelLogro: null, promedioNota: null },
      ],
    },
  ],
};

const RIESGO = {
  semestreId: 's1',
  semestreCodigo: '2026-2',
  totalEstudiantesEnRiesgo: 1,
  mensaje: null,
  estudiantes: [{ estudianteId: 'e1', asignaturaId: 'a1' }],
};

describe('ReportesFacultadService', () => {
  let service: ReportesFacultadService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportesFacultadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('vista institucional', () => {
    function responderBase(urlMaterias: string, rendimiento: object = RENDIMIENTO): void {
      http.expectOne((r) => r.url === `${API}/reportes/rendimiento-ra`).flush(rendimiento);
      const riesgo = http.expectOne((r) => r.url === `${API}/reportes/riesgo-academico`);
      expect(riesgo.request.params.get('minRaNoAlcanzados')).toBe('1');
      riesgo.flush(RIESGO);
      http
        .expectOne((r) => r.url === urlMaterias)
        .flush([ASIGNATURA, { ...ASIGNATURA, id: 'a9', estado: 'INACTIVA' }]);
    }

    it('el administrador une R1, R6, las materias y las acciones del semestre resuelto', () => {
      let datos: DatosReporteFacultad | undefined;
      service.cargarInstitucional(false).subscribe((d) => (datos = d));

      responderBase(`${API}/asignaturas`);
      const acciones = http.expectOne((r) => r.url === `${API}/acciones-mejora`);
      expect(acciones.request.params.get('semestreId')).toBe('s1');
      acciones.flush([
        { asignaturaId: 'a1', convertida: true },
        { asignaturaId: 'a1', convertida: false },
      ]);

      expect(datos?.semestreCodigo).toBe('2026-2');
      // La materia INACTIVA no cuenta.
      expect(datos?.materias.map((m) => m.asignaturaId)).toEqual(['a1']);
      expect(datos?.ras).toEqual([
        expect.objectContaining({ facultadId: 'f1', nivel: 'ALTO', promedio: 4.1 }),
        expect.objectContaining({ nivel: null, promedio: null }),
      ]);
      expect(datos?.riesgo).toEqual([{ estudianteId: 'e1', asignaturaId: 'a1' }]);
      expect(datos?.acciones).toEqual([
        { asignaturaId: 'a1', convertida: true },
        { asignaturaId: 'a1', convertida: false },
      ]);
    });

    it('el profesor usa sus asignaturas y envía el semestre elegido', () => {
      service.cargarInstitucional(true, 's2').subscribe();

      const rendimiento = http.expectOne((r) => r.url === `${API}/reportes/rendimiento-ra`);
      expect(rendimiento.request.params.get('semestreId')).toBe('s2');
      rendimiento.flush({ ...RENDIMIENTO, semestreId: 's2' });
      http.expectOne((r) => r.url === `${API}/reportes/riesgo-academico`).flush(RIESGO);
      http.expectOne((r) => r.url === `${API}/asignaturas/mias`).flush([ASIGNATURA]);
      http.expectOne((r) => r.url === `${API}/acciones-mejora`).flush([]);
    });

    it('sin semestre activo no pide acciones de mejora', () => {
      let datos: DatosReporteFacultad | undefined;
      service.cargarInstitucional(false).subscribe((d) => (datos = d));

      responderBase(`${API}/asignaturas`, { ...RENDIMIENTO, semestreId: null, asignaturas: [] });
      http.expectNone((r) => r.url === `${API}/acciones-mejora`);
      expect(datos?.acciones).toEqual([]);
    });

    it('propaga el error del backend', () => {
      let status: number | undefined;
      service.cargarInstitucional(false).subscribe({ error: (e) => (status = e.status) });

      http
        .expectOne((r) => r.url === `${API}/reportes/rendimiento-ra`)
        .flush({ mensaje: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });
      http.match(() => true).forEach((r) => !r.cancelled && r.flush([]));
      expect(status).toBe(403);
    });
  });

  describe('vista del estudiante', () => {
    it('une su progreso con la facultad de sus materias por el código de la asignatura', () => {
      let datos: DatosReporteFacultad | undefined;
      service.cargarEstudiante().subscribe((d) => (datos = d));

      http.expectOne(`${API}/estudiantes/me/progreso`).flush([
        {
          matriculaId: 'm1',
          asignaturaCodigo: 'SIS101',
          asignaturaNombre: 'Programación',
          programaNombre: 'Ingeniería de Sistemas',
          semestreCodigo: '2026-2',
          fechaMatricula: '2026-07-01',
          situacion: 'EN_CURSO',
          resultadosAprendizaje: [
            { codigo: 'RA-01', nivelLogro: 'BAJO', promedio: 2.4 },
            { codigo: 'RA-02', nivelLogro: 'SIN_EVALUAR', promedio: null },
          ],
        },
        {
          matriculaId: 'm2',
          asignaturaCodigo: 'OTRA',
          asignaturaNombre: 'Sin facultad conocida',
          programaNombre: null,
          semestreCodigo: '2026-2',
          fechaMatricula: '2026-07-01',
          situacion: 'EN_CURSO',
          resultadosAprendizaje: [],
        },
      ]);
      http.expectOne((r) => r.url === `${API}/asignaturas/mias`).flush([ASIGNATURA]);

      expect(datos?.semestreCodigo).toBe('2026-2');
      expect(datos?.materias[0]).toEqual(
        expect.objectContaining({ facultadId: 'f1', programaId: 'p1', asignaturaId: 'a1', cantidadRa: null }),
      );
      expect(datos?.materias[1].facultadNombre).toBe('Sin facultad');
      expect(datos?.ras).toEqual([
        expect.objectContaining({ facultadId: 'f1', nivel: 'BAJO', promedio: 2.4 }),
        expect.objectContaining({ nivel: null, promedio: null }),
      ]);
      expect(datos?.riesgo).toEqual([]);
      expect(datos?.acciones).toEqual([]);
    });
  });
});
