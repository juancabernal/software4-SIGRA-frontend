import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { EstudianteMatriculado } from '../../models/matricula.model';
import { MatriculadosPage } from './matriculados-page';

const URL_ASIGNATURAS = `${environment.apiUrl}/v1/asignaturas`;
const URL_SEMESTRES = `${environment.apiUrl}/v1/semestres`;
const URL_MATRICULAS = `${environment.apiUrl}/v1/matriculas`;

const ASIGNATURAS = [{ id: 'a1', nombre: 'Cálculo I', estado: 'ACTIVA' as const }];
const SEMESTRES = [{ id: 's1', codigo: '2026-1', estado: 'ACTIVO' as const }];

const ANA: EstudianteMatriculado = {
  matriculaId: 'm1',
  numeroDocumento: '1234567890',
  nombreCompleto: 'Ana María Gómez',
  estado: 'ACTIVO',
};

describe('MatriculadosPage', () => {
  let fixture: ComponentFixture<MatriculadosPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatriculadosPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MatriculadosPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const consultaMatriculados = () => http.expectOne((r) => r.url === URL_MATRICULAS);
  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  async function iniciar(): Promise<void> {
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush(ASIGNATURAS);
    http.expectOne((r) => r.url === URL_SEMESTRES).flush(SEMESTRES);
    await fixture.whenStable();
  }

  function elegirAsignatura(): void {
    const select = html.querySelector('#filtro-asignatura') as HTMLSelectElement;
    select.value = 'a1';
    select.dispatchEvent(new Event('change'));
  }

  function elegirSemestre(): void {
    const select = html.querySelector('#filtro-semestre') as HTMLSelectElement;
    select.value = 's1';
    select.dispatchEvent(new Event('change'));
  }

  async function elegirAmbos(): Promise<void> {
    await iniciar();
    elegirAsignatura();
    await fixture.whenStable();
    elegirSemestre();
    await fixture.whenStable();
  }

  it('no consulta mientras falte elegir la asignatura o el semestre', async () => {
    await iniciar();
    expect(html.textContent).toContain('Elige una asignatura y un semestre');

    elegirAsignatura();
    await fixture.whenStable();

    http.expectNone(URL_MATRICULAS);
    expect(html.textContent).toContain('Elige una asignatura y un semestre');
  });

  it('consulta al completar ambos filtros', async () => {
    await elegirAmbos();

    const req = consultaMatriculados();
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('asignaturaId')).toBe('a1');
    expect(req.request.params.get('semestreId')).toBe('s1');
    expect(req.request.params.has('incluirInactivas')).toBe(false);
    req.flush([ANA]);
    await fixture.whenStable();

    expect(html.querySelectorAll('tbody tr').length).toBe(1);
    expect(html.textContent).toContain('Ana María Gómez');
  });

  it('el interruptor de inactivas cambia el parámetro de la petición', async () => {
    await elegirAmbos();
    consultaMatriculados().flush([ANA]);
    await fixture.whenStable();

    const interruptor = html.querySelector('.interruptor input') as HTMLInputElement;
    interruptor.checked = true;
    interruptor.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const req = consultaMatriculados();
    expect(req.request.params.get('incluirInactivas')).toBe('true');
    req.flush([ANA]);
  });

  it('una colección vacía muestra el estado de nadie matriculado', async () => {
    await elegirAmbos();
    consultaMatriculados().flush([]);
    await fixture.whenStable();

    expect(html.textContent).toContain('Nadie matriculado en esa asignatura y semestre');
  });

  it('desvincular una matrícula ya inactiva muestra el mensaje del servidor en vez de un fallo genérico', async () => {
    await elegirAmbos();
    consultaMatriculados().flush([ANA]);
    await fixture.whenStable();

    boton(html.querySelector('tbody tr')!, 'Desvincular').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-dialogo-confirmacion dialog') as HTMLDialogElement;
    boton(dialogo, 'Desvincular').click();
    await fixture.whenStable();

    http
      .expectOne(`${URL_MATRICULAS}/m1`)
      .flush(
        { status: 409, error: 'CONFLICT', mensaje: 'La matrícula ya estaba desvinculada' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(dialogo.textContent).toContain('La matrícula ya estaba desvinculada');
    consultaMatriculados().flush([{ ...ANA, estado: 'INACTIVO' }]);
  });
});
