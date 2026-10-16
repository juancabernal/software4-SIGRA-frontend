import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { AsignaturaProfesor, Profesor } from '../../../profesores/models/profesor.model';
import { ResultadoAsignacionMasiva } from '../../models/asignacion-docente.model';
import { AsignarTab } from './asignar-tab';

const URL_PROFESORES = `${environment.apiUrl}/v1/profesores`;
const URL_ASIGNATURAS = `${environment.apiUrl}/v1/asignaturas`;
const URL_ASIGNACIONES = `${environment.apiUrl}/v1/asignaciones-docentes`;

const PROFESOR_ACTIVO: Profesor = {
  id: 'prof-activo',
  tipoDocumentoNombre: 'CC',
  numeroDocumento: '123456',
  nombreCompleto: 'Ana Activa',
  correoInstitucional: 'ana.activa@uco.net.co',
  estado: 'ACTIVO',
  tieneAsignacionesActivas: false,
};

const PROFESOR_INACTIVO: Profesor = {
  ...PROFESOR_ACTIVO,
  id: 'prof-inactivo',
  nombreCompleto: 'Beto Inactivo',
  estado: 'INACTIVO',
};

const ASIGNATURA_ACTIVA: Asignatura = {
  id: 'asig-activa',
  codigo: 'MAT101',
  nombre: 'Cálculo',
  programaId: 'prog-1',
  programaNombre: 'Ingeniería',
  estado: 'ACTIVA',
  cantidadRa: 5,
};

const ASIGNATURA_ACTIVA_2: Asignatura = {
  ...ASIGNATURA_ACTIVA,
  id: 'asig-activa-2',
  codigo: 'FIS201',
  nombre: 'Física',
};

const ASIGNATURA_BORRADOR: Asignatura = {
  ...ASIGNATURA_ACTIVA,
  id: 'asig-borrador',
  codigo: 'MAT102',
  nombre: 'Álgebra',
  estado: 'BORRADOR',
};

describe('AsignarTab', () => {
  let fixture: ComponentFixture<AsignarTab>;
  let http: HttpTestingController;
  let html: HTMLElement;

  async function cargarCatalogos(): Promise<void> {
    http.expectOne(URL_PROFESORES).flush([PROFESOR_ACTIVO, PROFESOR_INACTIVO]);
    http
      .expectOne((r) => r.url === URL_ASIGNATURAS)
      .flush([ASIGNATURA_ACTIVA, ASIGNATURA_ACTIVA_2, ASIGNATURA_BORRADOR]);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Marca el checkbox de un profesor y responde la consulta de sus materias ya asignadas. */
  async function elegirProfesor(yaAsignadas: AsignaturaProfesor[] = []): Promise<void> {
    const checkboxProfesor = html.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkboxProfesor.click();
    fixture.detectChanges();
    http
      .expectOne((r) => r.url === `${URL_PROFESORES}/${PROFESOR_ACTIVO.id}/asignaturas`)
      .flush(yaAsignadas);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AsignarTab],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AsignarTab);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    fixture.detectChanges();
    await cargarCatalogos();
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  it('muestra solo los profesores activos y no muestra materias hasta elegir uno', () => {
    expect(html.textContent).toContain('Ana Activa');
    expect(html.textContent).not.toContain('Beto Inactivo');
    expect(html.querySelectorAll('.lista-seleccionable').length).toBe(1); // solo la de profesores
    expect(html.textContent).not.toContain('Cálculo');
  });

  it('al elegir un profesor aparecen las materias activas que no tiene asignadas', async () => {
    await elegirProfesor();

    expect(html.querySelectorAll('.lista-seleccionable').length).toBe(2);
    expect(html.textContent).toContain('Cálculo');
    expect(html.textContent).toContain('Física');
    expect(html.textContent).not.toContain('Álgebra'); // está en BORRADOR
  });

  it('oculta las materias que el profesor elegido ya tiene asignadas', async () => {
    await elegirProfesor([
      {
        asignacionId: 'asig-doc-1',
        asignaturaId: ASIGNATURA_ACTIVA.id,
        codigoAsignatura: ASIGNATURA_ACTIVA.codigo,
        nombreAsignatura: ASIGNATURA_ACTIVA.nombre,
        estadoAsignatura: 'ACTIVO',
      },
    ]);

    expect(html.textContent).not.toContain('Cálculo');
    expect(html.textContent).toContain('Física');
  });

  it('el buscador filtra las materias por nombre o código', async () => {
    await elegirProfesor();

    const buscador = html.querySelector('.buscador input') as HTMLInputElement;
    buscador.value = 'fis';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(html.textContent).not.toContain('Cálculo');
    expect(html.textContent).toContain('Física');

    buscador.value = 'MAT101';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(html.textContent).toContain('Cálculo');
    expect(html.textContent).not.toContain('Física');
  });

  it('al deseleccionar el último profesor, las materias desaparecen', async () => {
    const checkboxProfesor = html.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await elegirProfesor();
    expect(html.querySelectorAll('.lista-seleccionable').length).toBe(2);

    checkboxProfesor.click(); // deselecciona
    fixture.detectChanges();
    expect(html.querySelectorAll('.lista-seleccionable').length).toBe(1);
  });

  it('asigna los seleccionados y muestra el resultado', async () => {
    await elegirProfesor();

    const checkboxAsignatura = html.querySelectorAll('input[type="checkbox"]')[1] as HTMLInputElement;
    checkboxAsignatura.click();
    fixture.detectChanges();

    const boton = html.querySelector('.barra__registrar') as HTMLButtonElement;
    expect(boton.getAttribute('aria-disabled')).toBeNull();
    boton.click();

    const req = http.expectOne(URL_ASIGNACIONES);
    expect(req.request.body).toEqual({
      profesorIds: [PROFESOR_ACTIVO.id],
      asignaturaIds: [ASIGNATURA_ACTIVA.id],
    });

    const resultado: ResultadoAsignacionMasiva = {
      creadas: [
        {
          id: 'asig-doc-1',
          profesorId: PROFESOR_ACTIVO.id,
          nombreProfesor: PROFESOR_ACTIVO.nombreCompleto,
          asignaturaId: ASIGNATURA_ACTIVA.id,
          codigoAsignatura: ASIGNATURA_ACTIVA.codigo,
          nombreAsignatura: ASIGNATURA_ACTIVA.nombre,
          estado: 'ACTIVO',
          fechaAsignacion: '2026-10-16',
        },
      ],
      omitidas: [],
      rechazadas: [],
    };
    req.flush(resultado);
    fixture.detectChanges();

    expect(html.textContent).toContain('Creadas (1)');
    expect(html.textContent).toContain('Ana Activa → Cálculo');
  });
});
