import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { Estudiante } from '../../models/estudiante.model';
import { AsignaturaDeEstudiante } from '../../models/matricula.model';
import { EstudianteDetallePage } from './estudiante-detalle-page';

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

const MATRICULA: AsignaturaDeEstudiante = {
  matriculaId: 'm1',
  asignaturaNombre: 'Cálculo I',
  semestreCodigo: '2026-1',
  estado: 'ACTIVA',
};

describe('EstudianteDetallePage', () => {
  let fixture: ComponentFixture<EstudianteDetallePage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EstudianteDetallePage],
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

  const ficha = () => http.expectOne((r) => r.url === `${URL_ESTUDIANTES}/e1`);
  const historial = () => http.expectOne((r) => r.url === `${URL_ESTUDIANTES}/e1/asignaturas`);
  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  async function abrir(): Promise<void> {
    fixture.componentRef.setInput('id', 'e1');
    await fixture.whenStable();
  }

  it('pinta la ficha y el historial de asignaturas', async () => {
    await abrir();
    ficha().flush(ANA);
    await fixture.whenStable();
    historial().flush([MATRICULA]);
    await fixture.whenStable();

    expect(html.querySelector('h1')?.textContent).toContain('Ana María Gómez');
    expect(html.textContent).toContain('Cédula de ciudadanía 1234567890');
    expect(html.textContent).toContain('ana@uco.net.co');
    expect(html.querySelectorAll('tbody tr').length).toBe(1);
    expect(html.textContent).toContain('Cálculo I');
    expect(html.textContent).toContain('2026-1');
  });

  it('muestra el estado vacío cuando no hay matrículas', async () => {
    await abrir();
    ficha().flush(ANA);
    await fixture.whenStable();
    historial().flush([]);
    await fixture.whenStable();

    expect(html.textContent).toContain('Aún no tiene asignaturas matriculadas');
  });

  it('un 404 en la ficha muestra el mensaje general y no consulta el historial', async () => {
    await abrir();
    ficha().flush(
      { mensaje: 'No existe un estudiante con ese identificador' },
      { status: 404, statusText: 'Not Found' },
    );
    await fixture.whenStable();

    expect(html.textContent).toContain('Este estudiante no existe');
    http.expectNone((r) => r.url === `${URL_ESTUDIANTES}/e1/asignaturas`);
  });

  it('desvincular pide confirmación y luego relee el historial', async () => {
    await abrir();
    ficha().flush(ANA);
    await fixture.whenStable();
    historial().flush([MATRICULA]);
    await fixture.whenStable();

    boton(html.querySelector('tbody tr')!, 'Desvincular').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-dialogo-confirmacion dialog') as HTMLDialogElement;
    expect(dialogo.textContent).toContain('Cálculo I');
    expect(dialogo.textContent).toContain('se conservan');

    boton(dialogo, 'Desvincular').click();
    await fixture.whenStable();

    const req = http.expectOne(`${URL_MATRICULAS}/m1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(html.querySelector('.aviso-zona')?.textContent).toContain('Desvinculado de «Cálculo I»');
    historial().flush([{ ...MATRICULA, estado: 'DESVINCULADA' }]);
    await fixture.whenStable();
    expect(html.textContent).toContain('Ya desvinculada');
  });

  it('cancelar la desvinculación no llama al servicio', async () => {
    await abrir();
    ficha().flush(ANA);
    await fixture.whenStable();
    historial().flush([MATRICULA]);
    await fixture.whenStable();

    boton(html.querySelector('tbody tr')!, 'Desvincular').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-dialogo-confirmacion dialog') as HTMLDialogElement;
    boton(dialogo, 'Cancelar').click();
    await fixture.whenStable();

    http.expectNone((r) => r.url === `${URL_MATRICULAS}/m1`);
  });

  it('abrir "Matricular" deja el diálogo abierto, y cancelarlo no llama al servicio de matrícula', async () => {
    await abrir();
    ficha().flush(ANA);
    await fixture.whenStable();
    historial().flush([MATRICULA]);
    await fixture.whenStable();

    boton(html, 'Matricular').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-matricula-form-dialog dialog') as HTMLDialogElement;
    expect(dialogo).toBeTruthy();

    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush([]);
    http.expectOne((r) => r.url === URL_SEMESTRES).flush([]);
    await fixture.whenStable();

    boton(dialogo, 'Cancelar').click();
    await fixture.whenStable();

    expect(html.querySelector('app-matricula-form-dialog')).toBeNull();
    http.expectNone((r) => r.url === URL_MATRICULAS && r.method === 'POST');
  });

  // Las dos ramas de la fecha en el historial (D13). Hoy el backend no la manda: corre la segunda.
  describe('columna de fecha de matrícula en el historial', () => {
    const encabezados = () =>
      Array.from(html.querySelectorAll('thead th')).map((th) => th.textContent?.trim());

    async function abrirCon(matricula: AsignaturaDeEstudiante): Promise<void> {
      await abrir();
      ficha().flush(ANA);
      await fixture.whenStable();
      historial().flush([matricula]);
      await fixture.whenStable();
    }

    it('aparece con la fecha legible cuando el servidor la manda', async () => {
      await abrirCon({ ...MATRICULA, fechaMatricula: '2026-02-03' });

      expect(encabezados()).toContain('Fecha de matrícula');
      const celda = html.querySelector('tbody .fecha') as HTMLElement;
      expect(celda.textContent?.trim()).toBe('03 de febrero de 2026');
    });

    it('no existe en el DOM cuando el servidor no la manda, y el resto se pinta igual', async () => {
      await abrirCon(MATRICULA);

      expect(encabezados()).not.toContain('Fecha de matrícula');
      expect(html.querySelector('tbody .fecha')).toBeNull();
      expect(html.querySelectorAll('tbody tr:first-child > *').length).toBe(encabezados().length);
      expect(html.textContent).toContain('Cálculo I');
      expect(html.textContent).toContain('2026-1');
    });
  });

  // Mismo refuerzo desde el historial: no depende de por dónde entró el usuario (D13/D15).
  describe('confirmación reforzada al desvincular desde el historial', () => {
    const dialogoDesvincular = () =>
      html.querySelector('app-dialogo-confirmacion dialog') as HTMLDialogElement;
    const casilla = () =>
      dialogoDesvincular().querySelector('input[type="checkbox"]') as HTMLInputElement;

    async function pedirDesvincular(matricula: AsignaturaDeEstudiante): Promise<void> {
      await abrir();
      ficha().flush(ANA);
      await fixture.whenStable();
      historial().flush([matricula]);
      await fixture.whenStable();
      boton(html.querySelector('tbody tr')!, 'Desvincular').click();
      await fixture.whenStable();
    }

    it('con calificaciones pide el gesto y no llama al servicio hasta marcarlo', async () => {
      await pedirDesvincular({ ...MATRICULA, tieneCalificaciones: true });

      expect(dialogoDesvincular().textContent).toContain('ya tiene calificaciones registradas');

      const confirmar = boton(dialogoDesvincular(), 'Desvincular');
      expect(confirmar.disabled).toBe(true);
      confirmar.click();
      await fixture.whenStable();
      http.expectNone(`${URL_MATRICULAS}/m1`);

      casilla().checked = true;
      casilla().dispatchEvent(new Event('change'));
      await fixture.whenStable();

      boton(dialogoDesvincular(), 'Desvincular').click();
      await fixture.whenStable();

      http.expectOne(`${URL_MATRICULAS}/m1`).flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();

      // Tras desvincular se relee el historial (D9).
      historial().flush([{ ...MATRICULA, estado: 'DESVINCULADA' }]);
    });

    it('sin el dato del servidor confirma directamente, sin gesto', async () => {
      await pedirDesvincular(MATRICULA);

      expect(casilla()).toBeNull();
      boton(dialogoDesvincular(), 'Desvincular').click();
      await fixture.whenStable();

      http.expectOne(`${URL_MATRICULAS}/m1`).flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();
      historial().flush([{ ...MATRICULA, estado: 'DESVINCULADA' }]);
    });
  });
});
