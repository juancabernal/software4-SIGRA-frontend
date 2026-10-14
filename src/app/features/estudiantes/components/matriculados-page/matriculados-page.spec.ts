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
  estado: 'ACTIVA',
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
    expect(dialogo.hasAttribute('open')).toBe(true);
    consultaMatriculados().flush([{ ...ANA, estado: 'DESVINCULADA' }]);
  });

  // Las dos ramas de la fecha (D13). Hoy el backend no la manda: corre la segunda.
  describe('columna de fecha de matrícula', () => {
    const encabezados = () =>
      Array.from(html.querySelectorAll('thead th')).map((th) => th.textContent?.trim());

    it('aparece con la fecha legible cuando el servidor la manda', async () => {
      await elegirAmbos();
      consultaMatriculados().flush([{ ...ANA, fechaMatricula: '2026-02-03' }]);
      await fixture.whenStable();

      expect(encabezados()).toContain('Fecha de matrícula');
      const celda = html.querySelector('tbody .fecha') as HTMLElement;
      expect(celda.textContent?.trim()).toBe('03 de febrero de 2026');
    });

    it('no existe en el DOM cuando el servidor no la manda, y el resto se pinta igual', async () => {
      await elegirAmbos();
      consultaMatriculados().flush([ANA]);
      await fixture.whenStable();

      expect(encabezados()).not.toContain('Fecha de matrícula');
      expect(html.querySelector('tbody .fecha')).toBeNull();
      // Misma cantidad de celdas que de encabezados: ninguna fila queda descuadrada.
      expect(html.querySelectorAll('tbody tr:first-child > *').length).toBe(encabezados().length);
      expect(html.textContent).toContain('Ana María Gómez');
      expect(html.textContent).toContain('1234567890');
    });
  });

  // Confirmación reforzada (D13/D15). Hoy el backend no manda `tieneCalificaciones`: corre la
  // rama de `undefined`, que debe comportarse como siempre.
  describe('confirmación reforzada al desvincular', () => {
    const dialogoDesvincular = () =>
      html.querySelector('app-dialogo-confirmacion dialog') as HTMLDialogElement;
    const casilla = () =>
      dialogoDesvincular().querySelector('input[type="checkbox"]') as HTMLInputElement;

    async function pedirDesvincular(fila: EstudianteMatriculado): Promise<void> {
      await elegirAmbos();
      consultaMatriculados().flush([fila]);
      await fixture.whenStable();
      boton(html.querySelector('tbody tr')!, 'Desvincular').click();
      await fixture.whenStable();
    }

    it('con calificaciones pide el gesto y no llama al servicio hasta marcarlo', async () => {
      await pedirDesvincular({ ...ANA, tieneCalificaciones: true });

      expect(dialogoDesvincular().textContent).toContain('ya tiene calificaciones registradas');
      expect(casilla()).toBeTruthy();

      const confirmar = boton(dialogoDesvincular(), 'Desvincular');
      expect(confirmar.disabled).toBe(true);
      confirmar.click();
      await fixture.whenStable();
      http.expectNone(`${URL_MATRICULAS}/m1`);

      casilla().checked = true;
      casilla().dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(boton(dialogoDesvincular(), 'Desvincular').disabled).toBe(false);
      boton(dialogoDesvincular(), 'Desvincular').click();
      await fixture.whenStable();

      http.expectOne(`${URL_MATRICULAS}/m1`).flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();

      expect(html.textContent).toContain('Desvinculado: Ana María Gómez.');
      // Tras desvincular se relee del servidor (D9).
      consultaMatriculados().flush([{ ...ANA, estado: 'DESVINCULADA' }]);
    });

    it('cancelar la confirmación reforzada no llama al servicio', async () => {
      await pedirDesvincular({ ...ANA, tieneCalificaciones: true });

      casilla().checked = true;
      casilla().dispatchEvent(new Event('change'));
      await fixture.whenStable();

      boton(dialogoDesvincular(), 'Cancelar').click();
      await fixture.whenStable();

      http.expectNone(`${URL_MATRICULAS}/m1`);
    });

    it('sin calificaciones confirma directamente, sin gesto', async () => {
      await pedirDesvincular({ ...ANA, tieneCalificaciones: false });

      expect(casilla()).toBeNull();
      expect(dialogoDesvincular().textContent).toContain(
        'Las calificaciones registradas en esta matrícula se conservan.',
      );

      const confirmar = boton(dialogoDesvincular(), 'Desvincular');
      expect(confirmar.disabled).toBe(false);
      confirmar.click();
      await fixture.whenStable();

      http.expectOne(`${URL_MATRICULAS}/m1`).flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();
      consultaMatriculados().flush([{ ...ANA, estado: 'DESVINCULADA' }]);
    });

    it('cuando el servidor no informa nada confirma igual, sin gesto y sin bloquearse', async () => {
      await pedirDesvincular(ANA);

      expect(casilla()).toBeNull();
      expect(dialogoDesvincular().textContent).toContain(
        'Las calificaciones registradas en esta matrícula se conservan.',
      );

      boton(dialogoDesvincular(), 'Desvincular').click();
      await fixture.whenStable();

      http.expectOne(`${URL_MATRICULAS}/m1`).flush(null, { status: 204, statusText: 'No Content' });
      await fixture.whenStable();
      consultaMatriculados().flush([{ ...ANA, estado: 'DESVINCULADA' }]);
    });
  });

  // Matricular desde esta vista, sin pasar por la ficha de nadie (D16).
  describe('matricular desde la vista de matriculados', () => {
    const URL_ESTUDIANTES = `${environment.apiUrl}/v1/estudiantes`;
    const dialogoMatricula = () =>
      html.querySelector('app-matricula-form-dialog dialog') as HTMLDialogElement;

    // El diálogo hijo pide sus propios catálogos al abrirse.
    async function abrirDialogo(): Promise<void> {
      boton(html, 'Matricular').click();
      await fixture.whenStable();
      http.expectOne((r) => r.url === URL_ASIGNATURAS).flush(ASIGNATURAS);
      http.expectOne((r) => r.url === URL_SEMESTRES).flush(SEMESTRES);
      await fixture.whenStable();
    }

    it('abre el diálogo con la asignatura y el semestre de los filtros preseleccionados', async () => {
      await elegirAmbos();
      consultaMatriculados().flush([ANA]);
      await fixture.whenStable();

      await abrirDialogo();

      const asignatura = dialogoMatricula().querySelector(
        '#matricula-asignatura',
      ) as HTMLSelectElement;
      const semestre = dialogoMatricula().querySelector('#matricula-semestre') as HTMLSelectElement;
      expect(asignatura.value).toBe('a1');
      expect(semestre.value).toBe('s1');
      // Sin estudiante fijado: toca identificarlo aquí.
      expect(dialogoMatricula().querySelector('#matricula-buscar-documento')).toBeTruthy();
    });

    it('con los filtros vacíos abre sin preselección', async () => {
      await iniciar();
      await abrirDialogo();

      const asignatura = dialogoMatricula().querySelector(
        '#matricula-asignatura',
      ) as HTMLSelectElement;
      const semestre = dialogoMatricula().querySelector('#matricula-semestre') as HTMLSelectElement;
      expect(asignatura.value).toBe('');
      expect(semestre.value).toBe('');
    });

    it('tras matricular vuelve a consultar la lista y el estudiante nuevo aparece', async () => {
      await elegirAmbos();
      consultaMatriculados().flush([]);
      await fixture.whenStable();
      expect(html.textContent).toContain('Nadie matriculado en esa asignatura y semestre');

      await abrirDialogo();

      const campo = dialogoMatricula().querySelector(
        '#matricula-buscar-documento',
      ) as HTMLInputElement;
      campo.value = '1234567890';
      campo.dispatchEvent(new Event('input'));
      boton(dialogoMatricula(), 'Buscar').click();
      await fixture.whenStable();

      http
        .expectOne((r) => r.url === URL_ESTUDIANTES && r.params.get('filtro') === '1234567890')
        .flush([
          {
            id: 'e9',
            tipoDocumentoNombre: 'Cédula de ciudadanía',
            numeroDocumento: '1234567890',
            nombreCompleto: 'Ana María Gómez',
            correoInstitucional: 'ana@uco.net.co',
            estado: 'ACTIVO',
          },
        ]);
      await fixture.whenStable();

      (dialogoMatricula().querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit'),
      );
      await fixture.whenStable();

      http
        .expectOne((r) => r.url === URL_MATRICULAS && r.method === 'POST')
        .flush(
          { id: 'm1', estudianteId: 'e9', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVA' },
          { status: 201, statusText: 'Created' },
        );
      await fixture.whenStable();

      expect(html.textContent).toContain('Estudiante matriculado.');
      // Se relee del servidor (D9): la fila nueva llega de la consulta, no de un parche en memoria.
      consultaMatriculados().flush([ANA]);
      await fixture.whenStable();

      expect(html.querySelectorAll('tbody tr').length).toBe(1);
      expect(html.textContent).toContain('Ana María Gómez');
    });

    it('cancelar el diálogo no matricula ni recarga', async () => {
      await elegirAmbos();
      consultaMatriculados().flush([ANA]);
      await fixture.whenStable();

      await abrirDialogo();
      boton(dialogoMatricula(), 'Cancelar').click();
      await fixture.whenStable();

      expect(html.querySelector('app-matricula-form-dialog')).toBeNull();
      http.expectNone((r) => r.url === URL_MATRICULAS && r.method === 'POST');
    });
  });
});
