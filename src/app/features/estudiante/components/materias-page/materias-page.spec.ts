import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { MiMateria } from '../../models/mi-proceso.model';
import { MisMateriasPage } from './materias-page';

const API = `${environment.apiUrl}/v1/estudiantes/me/materias`;
const MATERIAS: MiMateria[] = [
  {
    matriculaId: '00000000-0000-4000-8000-000000000001',
    asignaturaCodigo: 'MAT-01',
    asignaturaNombre: 'Matemáticas',
    programaNombre: 'Ingeniería',
    semestreCodigo: '2026-1',
    fechaMatricula: '2026-01-20',
    situacion: 'EN_CURSO',
  },
  {
    matriculaId: '00000000-0000-4000-8000-000000000002',
    asignaturaCodigo: 'FIS-01',
    asignaturaNombre: 'Física',
    programaNombre: null,
    semestreCodigo: '2026-2',
    fechaMatricula: '2026-07-20',
    situacion: 'PROGRAMADA',
  },
];

describe('MisMateriasPage', () => {
  let fixture: ComponentFixture<MisMateriasPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(MisMateriasPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function cargar(materias: MiMateria[] = MATERIAS): HTMLElement {
    http.expectOne(API).flush(materias);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mantiene el encabezado durante la carga', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mis materias');
    expect(fixture.nativeElement.textContent).toContain('Cargando');
    http.expectOne(API).flush([]);
  });

  it('muestra campos, situaciones, enlace y no muestra el UUID', () => {
    const html = cargar();
    expect(html.textContent).toContain('MAT-01');
    expect(html.textContent).toContain('En curso');
    expect(html.textContent).toContain('Programada');
    expect(html.textContent).toContain('Ingeniería');
    expect(html.textContent).toContain('2026-2');
    expect(html.textContent).toContain('Ver detalle');
    expect(html.textContent).not.toContain(MATERIAS[0].matriculaId);
    expect(html.querySelector('a')?.getAttribute('href')).toContain(MATERIAS[0].matriculaId);
  });

  it('muestra el vacío exacto y el encabezado', () => {
    const html = cargar([]);
    expect(html.textContent).toContain('Mis materias');
    expect(html.textContent).toContain('Aún no tienes asignaturas matriculadas');
  });

  it('muestra error y reintenta', () => {
    http.expectOne(API).flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Mis materias');
    expect(fixture.nativeElement.textContent).toContain('No tienes permisos');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    http.expectOne(API).flush([]);
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
