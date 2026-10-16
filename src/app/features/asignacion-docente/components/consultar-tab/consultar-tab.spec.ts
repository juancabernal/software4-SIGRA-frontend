import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { AsignaturaProfesor, Profesor } from '../../../profesores/models/profesor.model';
import { ConsultarTab } from './consultar-tab';

const URL_PROFESORES = `${environment.apiUrl}/v1/profesores`;
const URL_ASIGNACIONES = `${environment.apiUrl}/v1/asignaciones-docentes`;

const PROFESOR_ACTIVO: Profesor = {
  id: 'prof-activo',
  tipoDocumentoNombre: 'CC',
  numeroDocumento: '123456',
  nombreCompleto: 'Ana Activa',
  correoInstitucional: 'ana.activa@uco.net.co',
  estado: 'ACTIVO',
  tieneAsignacionesActivas: true,
};

describe('ConsultarTab', () => {
  let fixture: ComponentFixture<ConsultarTab>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ConsultarTab],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConsultarTab);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    fixture.detectChanges();
    http.expectOne(URL_PROFESORES).flush([PROFESOR_ACTIVO]);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  it('no muestra materias hasta elegir un profesor', () => {
    expect(html.textContent).toContain('Elige un profesor para ver sus materias asignadas');
  });

  it('al elegir un profesor, consulta y muestra sus materias', async () => {
    const select = html.querySelector('#profesor-elegido') as HTMLSelectElement;
    select.value = PROFESOR_ACTIVO.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const asignaciones: AsignaturaProfesor[] = [
      {
        asignacionId: 'asig-doc-1',
        asignaturaId: 'asig-1',
        codigoAsignatura: 'MAT101',
        nombreAsignatura: 'Cálculo',
        estadoAsignatura: 'ACTIVO',
      },
    ];
    http
      .expectOne((r) => r.url === `${URL_PROFESORES}/${PROFESOR_ACTIVO.id}/asignaturas`)
      .flush(asignaciones);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.textContent).toContain('Cálculo');
  });

  it('desasigna una materia y vuelve a consultar', async () => {
    const select = html.querySelector('#profesor-elegido') as HTMLSelectElement;
    select.value = PROFESOR_ACTIVO.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    http
      .expectOne((r) => r.url === `${URL_PROFESORES}/${PROFESOR_ACTIVO.id}/asignaturas`)
      .flush([
        {
          asignacionId: 'asig-doc-1',
          asignaturaId: 'asig-1',
          codigoAsignatura: 'MAT101',
          nombreAsignatura: 'Cálculo',
          estadoAsignatura: 'ACTIVO',
        },
      ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const botonDesasignar = html.querySelector('.btn--peligro') as HTMLButtonElement;
    botonDesasignar.click();

    http.expectOne(`${URL_ASIGNACIONES}/asig-doc-1/desasignar`).flush(null);
    http.expectOne((r) => r.url === `${URL_PROFESORES}/${PROFESOR_ACTIVO.id}/asignaturas`).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.textContent).toContain('no tiene materias asignadas');
  });
});
