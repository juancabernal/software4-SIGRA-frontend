import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { MiMateriaDetalle } from '../../models/mi-proceso.model';
import { MateriaDetallePage } from './detalle-page';

const ID = '00000000-0000-4000-8000-000000000001';
const API = `${environment.apiUrl}/v1/estudiantes/me/materias/${ID}`;
const DETALLE: MiMateriaDetalle = {
  matriculaId: ID,
  asignaturaCodigo: 'MAT-01',
  asignaturaNombre: 'Matemáticas',
  programaNombre: 'Ingeniería',
  semestreCodigo: '2026-1',
  fechaMatricula: '2026-01-20',
  situacion: 'EN_CURSO',
  resultadosAprendizaje: [
    {
      codigo: 'RA-01',
      descripcion: 'Resuelve problemas.',
      nivelLogro: 'SIN_EVALUAR',
      promedio: null,
      evaluacionesCalificadas: 0,
      evaluacionesTotales: 1,
      evaluaciones: [
        {
          nombre: 'Taller',
          descripcion: null,
          fecha: null,
          porcentaje: 30,
          nota: null,
          observacion: null,
        },
      ],
    },
  ],
};

describe('MateriaDetallePage', () => {
  let fixture: ComponentFixture<MateriaDetallePage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(MateriaDetallePage);
    fixture.componentRef.setInput('matriculaId', ID);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('muestra RA, nivel sin evaluar, conteos y valores vacíos', async () => {
    await fixture.whenStable();
    http.expectOne(API).flush(DETALLE);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('RA-01');
    expect(html.textContent).toContain('Resuelve problemas.');
    expect(html.textContent).toContain('Sin evaluar');
    expect(html.textContent).toContain('Aún no hay calificaciones suficientes');
    expect(html.textContent).toContain('0 de 1 evaluaciones calificadas');
    expect(html.textContent).toContain('Sin calificar');
    expect(html.textContent).toContain('—');
    expect(html.textContent).not.toContain(ID);
  });

  it('traduce 404 y 400 a materia no encontrada sin reintento', async () => {
    await fixture.whenStable();
    http.expectOne(API).flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No encontramos esta materia en tu registro académico');
    expect(fixture.nativeElement.textContent).not.toContain('Reintentar');
  });

  it('muestra el mensaje de permisos para 403', async () => {
    await fixture.whenStable();
    http.expectOne(API).flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes permisos');
  });

  it('oculta promedio nulo, UUID y textos no permitidos', async () => {
    await fixture.whenStable();
    http.expectOne(API).flush(DETALLE);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Promedio:');
    expect(text).not.toContain(ID);
    expect(text).not.toContain('Conclusiones');
    expect(text).not.toContain('Acciones de mejora');
    expect(text).not.toContain('Recalcular');
  });

  it('regresa a Mis materias o Mi historial según la situación', async () => {
    const casos = [
      ['EN_CURSO', '/estudiante/materias'],
      ['PROGRAMADA', '/estudiante/materias'],
      ['CURSADA', '/estudiante/historial'],
      ['DESVINCULADA', '/estudiante/historial'],
    ] as const;
    await fixture.whenStable();
    http.expectOne(API).flush(DETALLE);
    for (const [situacion, destino] of casos) {
      const actual = TestBed.createComponent(MateriaDetallePage);
      actual.componentRef.setInput('matriculaId', ID);
      await actual.whenStable();
      const request = TestBed.inject(HttpTestingController).expectOne(API);
      request.flush({ ...DETALLE, situacion });
      actual.detectChanges();
      expect(actual.nativeElement.querySelector('a')?.getAttribute('href')).toBe(destino);
    }
  });

  it('consulta de nuevo cuando cambia la matrícula', async () => {
    await fixture.whenStable();
    http.expectOne(API).flush(DETALLE);
    fixture.componentRef.setInput('matriculaId', '00000000-0000-4000-8000-000000000002');
    await fixture.whenStable();
    http.expectOne(`${environment.apiUrl}/v1/estudiantes/me/materias/00000000-0000-4000-8000-000000000002`).flush(DETALLE);
  });
});
