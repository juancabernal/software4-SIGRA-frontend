import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { Estudiante } from '../../models/estudiante.model';
import { AsignaturaDeEstudiante } from '../../models/matricula.model';
import { MatriculadosPage } from '../matriculados-page/matriculados-page';
import { EstudianteDetallePage } from './estudiante-detalle-page';

/**
 * Pruebas de integración (ver design.md): `EstudianteDetallePage` montada con su diálogo hijo real
 * `MatriculaFormDialog` (no un doble), compartiendo el mismo `HttpTestingController`. La segunda
 * prueba, además, monta `MatriculadosPage` por separado (mismo `HttpTestingController`) para
 * verificar el flujo cruzado sin necesitar un backend real.
 */

const URL_ESTUDIANTES = `${environment.apiUrl}/v1/estudiantes`;
const URL_MATRICULAS = `${environment.apiUrl}/v1/matriculas`;
const URL_ASIGNATURAS = `${environment.apiUrl}/v1/asignaturas`;
const URL_SEMESTRES = `${environment.apiUrl}/v1/semestres`;

const ANA: Estudiante = {
  id: 'e1',
  tipoDocumentoNombre: 'Cédula de ciudadanía',
  numeroDocumento: '1234567890',
  nombreCompleto: 'Ana María Gómez',
  correoInstitucional: 'ana@uco.net.co',
  estado: 'ACTIVO',
};

const CALCULO_PREVIA: AsignaturaDeEstudiante = {
  matriculaId: 'm1',
  asignaturaNombre: 'Cálculo I',
  semestreCodigo: '2025-2',
  estado: 'INACTIVO',
};

const ASIGNATURAS = [{ id: 'a1', nombre: 'Física I', estado: 'ACTIVA' as const }];
const SEMESTRES = [{ id: 's1', codigo: '2026-1', estado: 'ACTIVO' as const }];

describe('EstudianteDetallePage (integración con MatriculaFormDialog)', () => {
  let fixture: ComponentFixture<EstudianteDetallePage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EstudianteDetallePage, MatriculadosPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EstudianteDetallePage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  function boton(raiz: ParentNode, texto: string): HTMLButtonElement {
    return Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;
  }

  async function montarFicha(): Promise<void> {
    fixture.componentRef.setInput('id', ANA.id);
    await fixture.whenStable();
    http.expectOne((r) => r.url === `${URL_ESTUDIANTES}/${ANA.id}`).flush(ANA);
    await fixture.whenStable();
    http
      .expectOne((r) => r.url === `${URL_ESTUDIANTES}/${ANA.id}/asignaturas`)
      .flush([CALCULO_PREVIA]);
    await fixture.whenStable();
  }

  /** Abre "Matricular", resuelve los catálogos y elige la asignatura y el semestre indicados. */
  async function abrirYElegir(): Promise<HTMLDialogElement> {
    boton(html, 'Matricular').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-matricula-form-dialog dialog') as HTMLDialogElement;
    expect(dialogo).toBeTruthy();

    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush(ASIGNATURAS);
    http.expectOne((r) => r.url === URL_SEMESTRES).flush(SEMESTRES);
    await fixture.whenStable();

    const selectAsignatura = dialogo.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = dialogo.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    return dialogo;
  }

  it('matricular desde el detalle recarga el historial con la nueva matrícula', async () => {
    await montarFicha();
    const dialogo = await abrirYElegir();

    (dialogo.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const peticion = http.expectOne((r) => r.url === URL_MATRICULAS && r.method === 'POST');
    expect(peticion.request.body).toEqual({
      estudianteId: ANA.id,
      asignaturaId: 'a1',
      semestreId: 's1',
    });
    peticion.flush(
      { id: 'm2', estudianteId: ANA.id, asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVO' },
      { status: 201, statusText: 'Created' },
    );
    await fixture.whenStable();

    expect(html.querySelector('app-matricula-form-dialog')).toBeNull();
    expect(html.querySelector('.aviso-zona')?.textContent).toContain('Estudiante matriculado.');

    const nueva: AsignaturaDeEstudiante = {
      matriculaId: 'm2',
      asignaturaNombre: 'Física I',
      semestreCodigo: '2026-1',
      estado: 'ACTIVO',
    };
    http
      .expectOne((r) => r.url === `${URL_ESTUDIANTES}/${ANA.id}/asignaturas`)
      .flush([CALCULO_PREVIA, nueva]);
    await fixture.whenStable();

    expect(html.querySelectorAll('tbody tr').length).toBe(2);
    expect(html.textContent).toContain('Física I');
    expect(html.textContent).toContain('2026-1');
  });

  it('matricular desde el detalle y luego verlo en MatriculadosPage con la misma asignatura y semestre', async () => {
    await montarFicha();
    const dialogo = await abrirYElegir();

    (dialogo.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    http
      .expectOne((r) => r.url === URL_MATRICULAS && r.method === 'POST')
      .flush(
        { id: 'm2', estudianteId: ANA.id, asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVO' },
        { status: 201, statusText: 'Created' },
      );
    await fixture.whenStable();

    http
      .expectOne((r) => r.url === `${URL_ESTUDIANTES}/${ANA.id}/asignaturas`)
      .flush([CALCULO_PREVIA]);
    await fixture.whenStable();

    // Montar MatriculadosPage por separado, con el mismo HttpTestingController, y consultar la
    // misma terna asignatura/semestre con la que se acaba de matricular desde el detalle.
    const fixtureMatriculados = TestBed.createComponent(MatriculadosPage);
    const htmlMatriculados = fixtureMatriculados.nativeElement as HTMLElement;
    document.body.appendChild(htmlMatriculados);

    await fixtureMatriculados.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush(ASIGNATURAS);
    http.expectOne((r) => r.url === URL_SEMESTRES).flush(SEMESTRES);
    await fixtureMatriculados.whenStable();

    const selectAsignatura = htmlMatriculados.querySelector(
      '#filtro-asignatura',
    ) as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    await fixtureMatriculados.whenStable();

    const selectSemestre = htmlMatriculados.querySelector('#filtro-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixtureMatriculados.whenStable();

    const consulta = http.expectOne((r) => r.url === URL_MATRICULAS && r.method === 'GET');
    expect(consulta.request.params.get('asignaturaId')).toBe('a1');
    expect(consulta.request.params.get('semestreId')).toBe('s1');
    consulta.flush([
      {
        matriculaId: 'm2',
        numeroDocumento: ANA.numeroDocumento,
        nombreCompleto: ANA.nombreCompleto,
        estado: 'ACTIVO',
      },
    ]);
    await fixtureMatriculados.whenStable();

    const filaAna = Array.from(htmlMatriculados.querySelectorAll('tbody tr')).find((tr) =>
      tr.textContent?.includes(ANA.nombreCompleto),
    );
    expect(filaAna).toBeTruthy();
    expect(filaAna?.textContent).toContain('Activa');

    htmlMatriculados.remove();
  });
});
