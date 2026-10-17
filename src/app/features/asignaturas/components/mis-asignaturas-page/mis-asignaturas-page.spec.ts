import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { MiAsignatura } from '../../models/asignatura.model';
import { MisAsignaturasPage } from './mis-asignaturas-page';

const URL_MIAS = `${environment.apiUrl}/v1/asignaturas/mias`;
const URL_RA = `${environment.apiUrl}/v1/asignaturas/a1/resultados-aprendizaje`;

const ASIGNATURA: MiAsignatura = {
  id: 'a1',
  codigo: 'QA-VEC3B41597D',
  nombre: 'Álgebra QA',
  programaId: 'p1',
  programaNombre: 'Ingeniería de Sistemas',
  estado: 'ACTIVA',
  cantidadRa: 5,
  cantidadEstudiantes: 6,
  profesores: ['Profesor Uno'],
};

const ASIGNATURA_FISICA: MiAsignatura = {
  id: 'a2',
  codigo: 'FIS-100',
  nombre: 'Física I',
  programaId: 'p2',
  programaNombre: 'Ingeniería Electrónica',
  estado: 'ACTIVA',
  cantidadRa: 4,
  cantidadEstudiantes: 10,
  profesores: ['Profesora Dos'],
};

describe('MisAsignaturasPage', () => {
  let fixture: ComponentFixture<MisAsignaturasPage>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(MisAsignaturasPage);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function cargar(asignaturas: MiAsignatura[] = [ASIGNATURA]): HTMLElement {
    http.expectOne(URL_MIAS).flush(asignaturas);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra el contrato real de mis asignaturas y los conteos del backend', () => {
    const html = cargar();

    expect(html.textContent).toContain('QA-VEC3B41597D');
    expect(html.textContent).toContain('Álgebra QA');
    expect(html.textContent).toContain('Ingeniería de Sistemas');
    expect(html.textContent).toContain('6');
    expect(html.textContent).toContain('Profesor Uno');
    expect(html.textContent).not.toContain('app-modulo-pendiente');
  });

  it('al seleccionar una asignatura del profesor consulta sus RA y permite ir a matrículas', () => {
    const html = cargar();

    (Array.from(html.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Ver resultados de aprendizaje'),
    ) as HTMLButtonElement).click();
    const ra = http.expectOne(URL_RA);
    expect(ra.request.method).toBe('GET');
    ra.flush([
      {
        id: 'ra1',
        asignaturaId: 'a1',
        codigo: 'RA-01',
        descripcion: 'Describe el resultado de aprendizaje.',
        estado: 'ACTIVO',
      },
    ]);
    fixture.detectChanges();

    expect(html.textContent).toContain('RA-01');
    expect(html.textContent).toContain('Describe el resultado de aprendizaje.');
  });

  it('en modo estudiante muestra solo lectura y no consulta RA', () => {
    fixture.componentRef.setInput('vista', 'ESTUDIANTE');
    const html = cargar();

    expect(html.textContent).toContain('Mis materias');
    expect(html.textContent).toContain('Solo lectura');
    expect(html.textContent).not.toContain('Ver resultados de aprendizaje');
    http.expectNone(URL_RA);
  });

  it('muestra error de API y ofrece reintentar', () => {
    http.expectOne(URL_MIAS).flush(
      { status: 500, mensaje: 'detalle técnico que no se debe mostrar' },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Ocurrió un error inesperado');
    expect(html.textContent).not.toContain('detalle técnico');
    expect(html.querySelector('button')?.textContent).toContain('Reintentar');
  });

  it('el estado vacío dice lo correcto según el rol, sin mencionar el backend', () => {
    const htmlProfesor = cargar([]);
    expect(htmlProfesor.textContent).toContain('Aún no tienes asignaturas asignadas');
    expect(htmlProfesor.textContent?.toLowerCase()).not.toContain('backend');
    expect(htmlProfesor.querySelector('.tarjeta')).toBeNull();

    fixture = TestBed.createComponent(MisAsignaturasPage);
    fixture.componentRef.setInput('vista', 'ESTUDIANTE');
    http = TestBed.inject(HttpTestingController);
    const htmlEstudiante = cargar([]);
    expect(htmlEstudiante.textContent).toContain('Aún no estás matriculado en ninguna materia');
  });

  it('buscar por código deja solo la asignatura esperada', () => {
    const html = cargar([ASIGNATURA, ASIGNATURA_FISICA]);

    const buscador = html.querySelector('input[type="search"]') as HTMLInputElement;
    buscador.value = 'fis-100';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(html.textContent).toContain('Física I');
    expect(html.textContent).not.toContain('Álgebra QA');
  });

  it('filtrar por programa deja solo las asignaturas de ese programa', () => {
    const html = cargar([ASIGNATURA, ASIGNATURA_FISICA]);

    const selectorPrograma = html.querySelector('#filtro-programa') as HTMLSelectElement;
    selectorPrograma.value = 'p2';
    selectorPrograma.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(html.textContent).toContain('Física I');
    expect(html.textContent).not.toContain('Álgebra QA');
  });

  it('una combinación sin resultados muestra el mensaje de búsqueda vacía, no el de "no tienes asignaturas"', () => {
    const html = cargar([ASIGNATURA, ASIGNATURA_FISICA]);

    const buscador = html.querySelector('input[type="search"]') as HTMLInputElement;
    buscador.value = 'no existe ninguna materia con esto';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(html.textContent).toContain('No hay resultados para esta búsqueda');
    expect(html.textContent).not.toContain('Aún no tienes asignaturas asignadas');
  });

  it('un refresco de fondo no muestra "cargando", conserva los datos y lo que el usuario escribió', () => {
    const html = cargar([ASIGNATURA, ASIGNATURA_FISICA]);

    const buscador = html.querySelector('input[type="search"]') as HTMLInputElement;
    buscador.value = 'fis';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    document.dispatchEvent(new Event('visibilitychange'));
    fixture.detectChanges();

    expect(html.querySelector('[role="status"]')).toBeNull();
    expect(html.textContent).toContain('Física I');

    const req = http.expectOne(URL_MIAS);
    req.flush([ASIGNATURA, ASIGNATURA_FISICA]);
    fixture.detectChanges();

    expect((html.querySelector('input[type="search"]') as HTMLInputElement).value).toBe('fis');
    expect(html.textContent).toContain('Física I');
    expect(html.textContent).not.toContain('Álgebra QA');
  });
});
