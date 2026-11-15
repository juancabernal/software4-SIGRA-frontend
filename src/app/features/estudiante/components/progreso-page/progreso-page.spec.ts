import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { MiMateriaDetalle } from '../../models/mi-proceso.model';
import { MiProgresoPage } from './progreso-page';

const API = `${environment.apiUrl}/v1/estudiantes/me/progreso`;
const MATERIA: MiMateriaDetalle = {
  matriculaId: '00000000-0000-4000-8000-000000000001',
  asignaturaCodigo: 'MAT-01',
  asignaturaNombre: 'Matemáticas',
  programaNombre: 'Ingeniería',
  semestreCodigo: '2026-1',
  fechaMatricula: '2026-01-20',
  situacion: 'EN_CURSO',
  resultadosAprendizaje: [],
};

describe('MiProgresoPage', () => {
  let fixture: ComponentFixture<MiProgresoPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(MiProgresoPage);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('muestra materias, enlace y vacío', () => {
    http.expectOne(API).flush([MATERIA]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Matemáticas');
    expect(fixture.nativeElement.textContent).toContain('Ver detalle');
    expect(fixture.nativeElement.textContent).not.toContain(MATERIA.matriculaId);
  });

  it('muestra el estado vacío exacto', () => {
    http.expectOne(API).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aún no tienes asignaturas en curso');
  });

  it('muestra el error, reintenta con una nueva petición y no expone UUID', () => {
    http.expectOne(API).flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes permisos');
    expect(fixture.nativeElement.textContent).toContain('Mi progreso');
    expect(fixture.nativeElement.textContent).not.toContain(MATERIA.matriculaId);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    http.expectOne(API).flush([MATERIA]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain(MATERIA.matriculaId);
  });

  it('no muestra textos de conclusiones ni acciones', () => {
    http.expectOne(API).flush([]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Conclusiones');
    expect(text).not.toContain('Acciones de mejora');
    expect(text).not.toContain('Recalcular');
  });
});
