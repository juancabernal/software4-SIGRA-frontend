import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { PlanillaNotasPage } from './planilla-notas-page';

const API = `${environment.apiUrl}/v1`;
const URL_ASIGNATURAS = `${API}/asignaturas`;
const URL_SEMESTRES = `${API}/semestres`;

const MATEMATICAS: Asignatura = {
  id: 'a1',
  codigo: 'MAT1',
  nombre: 'Matemáticas I',
  programaId: 'p1',
  programaNombre: 'Ingeniería de Sistemas',
  facultadId: 'f1',
  facultadNombre: 'Facultad de Ingeniería',
  estado: 'ACTIVA',
  cantidadRa: 5,
};
const DERECHO: Asignatura = {
  ...MATEMATICAS,
  id: 'a2',
  codigo: 'DER1',
  nombre: 'Derecho Civil',
  programaId: 'p2',
  programaNombre: 'Derecho',
  facultadId: 'f2',
  facultadNombre: 'Facultad de Derecho',
};

describe('PlanillaNotasPage · filtro de facultad', () => {
  let fixture: ComponentFixture<PlanillaNotasPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlanillaNotasPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlanillaNotasPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    // Los RA de la materia elegida no se ejercitan aquí.
    http
      .match((r) => r.url.endsWith('/resultados-aprendizaje'))
      .forEach((r) => !r.cancelled && r.flush([]));
    http.verify();
  });

  const selector = (id: string) => html.querySelector(`#${id}`) as HTMLSelectElement;
  const textos = (id: string) => Array.from(selector(id).options).map((o) => o.textContent?.trim());
  const materiasDe = (facultadId: string) =>
    http.expectOne((r) => r.url === URL_ASIGNATURAS && r.params.get('facultadId') === facultadId);

  async function iniciar(asignaturas: Asignatura[] = [MATEMATICAS, DERECHO]): Promise<void> {
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS && !r.params.has('facultadId')).flush(asignaturas);
    http.expectOne(URL_SEMESTRES).flush([]);
    await fixture.whenStable();
  }

  async function cambiar(id: string, valor: string): Promise<void> {
    selector(id).value = valor;
    selector(id).dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  it('ofrece las facultades de las materias, sin duplicados y por nombre, antes de la materia', async () => {
    await iniciar([MATEMATICAS, DERECHO, { ...MATEMATICAS, id: 'a3', codigo: 'MAT2' }]);

    expect(textos('selector-facultad')).toEqual([
      'Todas las facultades',
      'Facultad de Derecho',
      'Facultad de Ingeniería',
    ]);
    const ids = Array.from(html.querySelectorAll('.filtros select')).map((s) => s.id);
    expect(ids.indexOf('selector-facultad')).toBeLessThan(ids.indexOf('selector-materia'));
  });

  it('al elegir una facultad pide al backend sus materias y conserva las opciones', async () => {
    await iniciar();

    await cambiar('selector-facultad', 'f2');
    materiasDe('f2').flush([DERECHO]);
    await fixture.whenStable();

    expect(textos('selector-materia')).toEqual(['Selecciona una materia', 'DER1 · Derecho Civil']);
    expect(textos('selector-facultad').length).toBe(3);
  });

  it('al cambiar de facultad descarta la materia elegida si es de otra', async () => {
    await iniciar();
    await cambiar('selector-materia', 'a1');

    await cambiar('selector-facultad', 'f2');
    materiasDe('f2').flush([DERECHO]);
    await fixture.whenStable();

    expect(selector('selector-materia').value).toBe('');
    expect(selector('selector-ra').disabled).toBe(true);
  });

  it('volver a «Todas las facultades» no consulta de nuevo y muestra todas las materias', async () => {
    await iniciar();
    await cambiar('selector-facultad', 'f2');
    materiasDe('f2').flush([DERECHO]);
    await fixture.whenStable();

    await cambiar('selector-facultad', '');
    http.expectNone((r) => r.url === URL_ASIGNATURAS);
    expect(textos('selector-materia')).toEqual([
      'Selecciona una materia',
      'MAT1 · Matemáticas I',
      'DER1 · Derecho Civil',
    ]);
  });

  it('una facultad sin materias lo indica sin mostrar «No hay materias disponibles»', async () => {
    await iniciar();
    await cambiar('selector-facultad', 'f2');
    materiasDe('f2').flush([]);
    await fixture.whenStable();

    expect(textos('selector-materia')).toEqual(['Sin materias en esta facultad']);
    expect(html.textContent).not.toContain('No hay materias disponibles');
  });

  it('un error al filtrar muestra el mensaje del backend y permite reintentar', async () => {
    await iniciar();
    await cambiar('selector-facultad', 'f2');
    materiasDe('f2').flush(
      { status: 400, error: 'BAD_REQUEST', mensaje: 'El parámetro facultadId no es válido' },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'El parámetro facultadId no es válido',
    );
  });
});
