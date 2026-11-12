import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { MiMateria } from '../../models/mi-proceso.model';
import { MiHistorialPage } from './historial-page';

const API = `${environment.apiUrl}/v1/estudiantes/me/historial`;
const HISTORIAL: MiMateria[] = [
  {
    matriculaId: '00000000-0000-4000-8000-000000000001',
    asignaturaCodigo: 'MAT-01',
    asignaturaNombre: 'Matemáticas',
    programaNombre: 'Ingeniería',
    semestreCodigo: '2026-1',
    fechaMatricula: '2026-01-20',
    situacion: 'CURSADA',
  },
  {
    matriculaId: '00000000-0000-4000-8000-000000000002',
    asignaturaCodigo: 'FIS-01',
    asignaturaNombre: 'Física',
    programaNombre: null,
    semestreCodigo: '2025-2',
    fechaMatricula: '2025-07-20',
    situacion: 'DESVINCULADA',
  },
];

describe('MiHistorialPage', () => {
  let fixture: ComponentFixture<MiHistorialPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(MiHistorialPage);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('agrupa por semestre y muestra situaciones', () => {
    http.expectOne(API).flush(HISTORIAL);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('2026-1');
    expect(html.textContent).toContain('2025-2');
    expect(html.textContent).toContain('Cursada');
    expect(html.textContent).toContain('Desvinculada');
    expect(html.textContent).not.toContain(HISTORIAL[0].matriculaId);
  });

  it('muestra el estado vacío exacto', () => {
    http.expectOne(API).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aún no tienes materias en tu historial');
  });

  it('muestra el error, reintenta y conserva el encabezado sin UUID', () => {
    http.expectOne(API).flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes permisos');
    expect(fixture.nativeElement.textContent).toContain('Mi historial');
    expect(fixture.nativeElement.textContent).not.toContain(HISTORIAL[0].matriculaId);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    http.expectOne(API).flush(HISTORIAL);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toContain(
      HISTORIAL[0].matriculaId,
    );
    expect(fixture.nativeElement.textContent).not.toContain(HISTORIAL[0].matriculaId);
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
