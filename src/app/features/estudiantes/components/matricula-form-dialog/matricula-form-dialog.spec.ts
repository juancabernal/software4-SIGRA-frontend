import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Estudiante } from '../../models/estudiante.model';
import { MatriculaRequest } from '../../models/matricula.model';
import { MatriculaFormDialog } from './matricula-form-dialog';

const URL_ASIGNATURAS = `${environment.apiUrl}/v1/asignaturas`;
const URL_SEMESTRES = `${environment.apiUrl}/v1/semestres`;
const URL_MATRICULAS = `${environment.apiUrl}/v1/matriculas`;
const URL_ESTUDIANTES = `${environment.apiUrl}/v1/estudiantes`;
const URL_TIPOS_DOCUMENTO = `${environment.apiUrl}/v1/tipos-documento`;

/** El selector se llena con lo que sirve el backend, no con un catálogo fijo del front. */
const TIPOS = [
  { id: 'td1', nombre: 'Cédula de Ciudadanía' },
  { id: 'td2', nombre: 'Tarjeta de Identidad' },
];

const ASIGNATURAS = [
  { id: 'a1', nombre: 'Cálculo I', estado: 'ACTIVA' as const },
  { id: 'a2', nombre: 'Física I', estado: 'BORRADOR' as const },
];

const SEMESTRES = [
  { id: 's1', codigo: '2026-1', estado: 'ACTIVO' as const },
  { id: 's2', codigo: '2025-2', estado: 'INACTIVO' as const },
];

describe('MatriculaFormDialog', () => {
  let fixture: ComponentFixture<MatriculaFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatriculaFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MatriculaFormDialog);
    fixture.componentRef.setInput('estudianteId', 'e1');
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const catalogoAsignaturas = () => http.expectOne((r) => r.url === URL_ASIGNATURAS);
  const catalogoSemestres = () => http.expectOne((r) => r.url === URL_SEMESTRES);

  async function abrirConCatalogos(): Promise<void> {
    await fixture.whenStable();
    catalogoAsignaturas().flush(ASIGNATURAS);
    catalogoSemestres().flush(SEMESTRES);
    await fixture.whenStable();
  }

  function boton(texto: string): HTMLButtonElement {
    return Array.from(html.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;
  }

  function enviar(): void {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  }

  it('no envía sin haber elegido asignatura o semestre', async () => {
    await abrirConCatalogos();
    enviar();
    await fixture.whenStable();

    http.expectNone(URL_MATRICULAS);
    expect(html.textContent).toContain('Selecciona una asignatura.');
    expect(html.textContent).toContain('Selecciona un semestre.');
  });

  it('envía la terna exacta al confirmar', async () => {
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();

    const req = http.expectOne(URL_MATRICULAS);
    expect(req.request.method).toBe('POST');
    const esperado: MatriculaRequest = { estudianteId: 'e1', asignaturaId: 'a1', semestreId: 's1' };
    expect(req.request.body).toEqual(esperado);
  });

  it('un 201 emite el mensaje de matriculado y un 200 el de reactivada', async () => {
    let avisos: string[] = [];
    fixture.componentInstance.matriculado.subscribe((texto) => avisos.push(texto));
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();
    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { id: 'm1', estudianteId: 'e1', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVA' },
        { status: 201, statusText: 'Created' },
      );
    await fixture.whenStable();

    expect(avisos).toEqual(['Estudiante matriculado.']);
  });

  it('un 200 emite el mensaje de matrícula reactivada', async () => {
    let avisos: string[] = [];
    fixture.componentInstance.matriculado.subscribe((texto) => avisos.push(texto));
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();
    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { id: 'm1', estudianteId: 'e1', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVA' },
        { status: 200, statusText: 'OK' },
      );
    await fixture.whenStable();

    expect(avisos).toEqual(['Matrícula reactivada.']);
  });

  it('muestra el mensaje del servidor ante un 409 de terna ya activa, sin cerrar el diálogo', async () => {
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();
    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { status: 409, error: 'CONFLICT', mensaje: 'El estudiante ya está matriculado' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'El estudiante ya está matriculado',
    );
    expect(html.querySelector('dialog')).toBeTruthy();
  });

  it('muestra el mensaje del servidor ante un 400 de asignatura no activa', async () => {
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a2';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();
    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { status: 400, error: 'BAD_REQUEST', mensaje: 'La asignatura no está activa' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'La asignatura no está activa',
    );
  });

  it('muestra el reintento cuando falla la carga de catálogos', async () => {
    await fixture.whenStable();
    catalogoAsignaturas().flush(null, { status: 0, statusText: 'Unknown Error' });
    catalogoSemestres().flush(SEMESTRES);
    await fixture.whenStable();

    expect(html.textContent).toContain('No se pudieron cargar las opciones');
    expect(boton('Matricular').disabled).toBe(true);

    boton('Reintentar').click();
    await fixture.whenStable();
    catalogoAsignaturas().flush(ASIGNATURAS);
    catalogoSemestres().flush(SEMESTRES);
    await fixture.whenStable();

    expect(html.textContent).not.toContain('No se pudieron cargar las opciones');
    expect(boton('Matricular').disabled).toBe(false);
  });

  it('el botón "Cancelar" cierra el diálogo y emite "cerrado"', async () => {
    let cerrado = false;
    fixture.componentInstance.cerrado.subscribe(() => (cerrado = true));
    await abrirConCatalogos();

    boton('Cancelar').click();
    await fixture.whenStable();

    expect(cerrado).toBe(true);
    http.expectNone(URL_MATRICULAS);
  });

  it('el evento nativo "cancel" del <dialog> también cierra y emite "cerrado"', async () => {
    let cerrado = false;
    fixture.componentInstance.cerrado.subscribe(() => (cerrado = true));
    await abrirConCatalogos();

    const dialogo = html.querySelector('dialog') as HTMLDialogElement;
    dialogo.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();

    expect(cerrado).toBe(true);
    http.expectNone(URL_MATRICULAS);
  });

  it('mientras se matricula, el botón de envío queda deshabilitado y muestra "Matriculando…"', async () => {
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();

    const submit = html.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.textContent?.trim()).toBe('Matriculando…');
    expect(submit.disabled).toBe(true);

    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { id: 'm1', estudianteId: 'e1', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVA' },
        { status: 201, statusText: 'Created' },
      );
  });

  it('con estudianteId fijado por el padre no aparece ningún campo de búsqueda', async () => {
    await abrirConCatalogos();

    expect(html.querySelector('#matricula-buscar-criterio')).toBeNull();
    expect(html.querySelector('#matricula-nuevo-documento')).toBeNull();
    expect(boton('Matricular').disabled).toBe(false);
  });

  it('si fallan los dos catálogos a la vez, muestra un solo aviso de reintento', async () => {
    await fixture.whenStable();
    catalogoAsignaturas().flush(null, { status: 0, statusText: 'Unknown Error' });
    catalogoSemestres().flush(null, { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();

    expect(html.querySelectorAll('.alerta').length).toBe(1);
    expect(html.textContent).toContain('No se pudieron cargar las opciones');
  });
});

// ── Sin estudiante fijado por el padre: se abre desde la vista de matriculados ──
describe('MatriculaFormDialog sin estudiante fijado', () => {
  let fixture: ComponentFixture<MatriculaFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;

  const ANA: Estudiante = {
    id: 'e9',
    tipoDocumentoNombre: 'Cédula de ciudadanía',
    numeroDocumento: '1234567890',
    nombreCompleto: 'Ana María Gómez',
    correoInstitucional: 'ana@uco.net.co',
    estado: 'ACTIVO',
  };

  const CREADO: Estudiante = {
    id: 'e10',
    tipoDocumentoNombre: TIPOS[0].nombre,
    numeroDocumento: '9876543210',
    nombreCompleto: 'Carlos Ruiz',
    correoInstitucional: 'carlos@uco.net.co',
    estado: 'ACTIVO',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatriculaFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MatriculaFormDialog);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  function boton(texto: string): HTMLButtonElement {
    return Array.from(html.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;
  }

  function enviar(): void {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  }

  function escribir(selector: string, valor: string): void {
    const campo = html.querySelector(selector) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function elegir(selector: string, valor: string): void {
    const select = html.querySelector(selector) as HTMLSelectElement;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  }

  async function abrirConCatalogos(): Promise<void> {
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush(ASIGNATURAS);
    http.expectOne((r) => r.url === URL_SEMESTRES).flush(SEMESTRES);
    await fixture.whenStable();
  }

  /** El catálogo de tipos se pide al entrar al modo «nuevo», no al abrir el diálogo. */
  async function pasarARegistrar(): Promise<void> {
    boton('Registrarlo y matricularlo').click();
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_TIPOS_DOCUMENTO).flush(TIPOS);
    await fixture.whenStable();
  }

  const busquedaDe = (documento: string) =>
    http.expectOne((r) => r.url === URL_ESTUDIANTES && r.params.get('filtro') === documento);

  const alta = () => http.expectOne((r) => r.url === URL_ESTUDIANTES && r.method === 'POST');

  async function elegirAsignaturaYSemestre(): Promise<void> {
    elegir('#matricula-asignatura', 'a1');
    elegir('#matricula-semestre', 's1');
    await fixture.whenStable();
  }

  describe('identificar al estudiante (D18)', () => {
    /** El campo consulta solo, tras la pausa al teclear. */
    async function esperarPausaDeTecleo(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await fixture.whenStable();
    }

    it('no busca con el criterio vacío ni con menos de 3 caracteres', async () => {
      await abrirConCatalogos();

      boton('Buscar').click();
      await fixture.whenStable();
      expect(html.textContent).toContain(
        'Escribe al menos 3 caracteres del nombre, el apellido o el documento.',
      );

      escribir('#matricula-buscar-criterio', 'ab');
      boton('Buscar').click();
      await esperarPausaDeTecleo();

      http.expectNone((r) => r.url === URL_ESTUDIANTES);
    });

    it('busca sola al teclear, sin pulsar el botón', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', 'Ana');
      await esperarPausaDeTecleo();

      busquedaDe('Ana').flush([ANA]);
      await fixture.whenStable();

      expect(html.querySelectorAll('.resultado').length).toBe(1);
      expect(html.textContent).toContain('Ana María Gómez');
    });

    it('pulsar el botón y la pausa posterior no repiten la misma consulta', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', 'Ana');
      boton('Buscar').click();
      await fixture.whenStable();

      busquedaDe('Ana').flush([ANA]);
      await esperarPausaDeTecleo();

      http.expectNone((r) => r.url.startsWith(URL_ESTUDIANTES));
    });

    it('borrar lo escrito deja de mostrar las coincidencias anteriores', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', 'Ana');
      await esperarPausaDeTecleo();
      busquedaDe('Ana').flush([ANA]);
      await fixture.whenStable();
      expect(html.querySelectorAll('.resultado').length).toBe(1);

      escribir('#matricula-buscar-criterio', 'A');
      await esperarPausaDeTecleo();

      http.expectNone((r) => r.url.startsWith(URL_ESTUDIANTES));
      expect(html.querySelectorAll('.resultado').length).toBe(0);
    });

    it('la confirmación está deshabilitada mientras no haya estudiante identificado', async () => {
      await abrirConCatalogos();
      await elegirAsignaturaYSemestre();

      expect(boton('Matricular').disabled).toBe(true);
    });

    it('una coincidencia exacta habilita la matrícula y envía ese estudianteId', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', '1234567890');
      boton('Buscar').click();
      await fixture.whenStable();

      const req = busquedaDe('1234567890');
      expect(req.request.method).toBe('GET');
      req.flush([ANA]);
      await fixture.whenStable();

      expect(html.textContent).toContain('Estudiante encontrado');
      expect(html.textContent).toContain('Ana María Gómez');
      expect(html.textContent).toContain('ana@uco.net.co');

      await elegirAsignaturaYSemestre();
      expect(boton('Matricular').disabled).toBe(false);
      enviar();
      await fixture.whenStable();

      const esperado: MatriculaRequest = {
        estudianteId: 'e9',
        asignaturaId: 'a1',
        semestreId: 's1',
      };
      const matricula = http.expectOne(URL_MATRICULAS);
      expect(matricula.request.body).toEqual(esperado);
      matricula.flush(
        { id: 'm1', ...esperado, estado: 'ACTIVA' },
        { status: 201, statusText: 'Created' },
      );
    });

    it('las coincidencias parciales se listan pero no preseleccionan a nadie', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', '123456');
      boton('Buscar').click();
      await fixture.whenStable();

      // El backend busca con LIKE: devuelve a alguien cuyo documento *contiene* lo escrito.
      busquedaDe('123456').flush([ANA]);
      await fixture.whenStable();

      // Aparece como opción, pero nadie queda elegido: elegir por él matricularía a otra persona.
      expect(html.querySelector('.resultados')).toBeTruthy();
      expect(html.textContent).toContain('Ana María Gómez');
      expect(html.textContent).not.toContain('Estudiante encontrado');

      await elegirAsignaturaYSemestre();
      expect(boton('Matricular').disabled).toBe(true);
    });

    it('busca por nombre y al elegir una coincidencia queda identificada', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', 'Ana');
      boton('Buscar').click();
      await fixture.whenStable();

      busquedaDe('Ana').flush([ANA, { ...ANA, id: 'e8', nombreCompleto: 'Ana Lucía Soto' }]);
      await fixture.whenStable();

      const opciones = html.querySelectorAll('.resultado');
      expect(opciones.length).toBe(2);

      (opciones[0] as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(html.textContent).toContain('Estudiante encontrado');
      expect(html.textContent).toContain('Ana María Gómez');

      await elegirAsignaturaYSemestre();
      expect(boton('Matricular').disabled).toBe(false);
      enviar();
      await fixture.whenStable();

      const matricula = http.expectOne(URL_MATRICULAS);
      expect(matricula.request.body).toEqual({
        estudianteId: 'e9',
        asignaturaId: 'a1',
        semestreId: 's1',
      });
      matricula.flush(
        { id: 'm1', estudianteId: 'e9', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVA' },
        { status: 201, statusText: 'Created' },
      );
    });

    it('el filtro de estado esconde las coincidencias que no lo cumplen', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', 'Ana');
      boton('Buscar').click();
      await fixture.whenStable();

      busquedaDe('Ana').flush([
        ANA,
        { ...ANA, id: 'e8', nombreCompleto: 'Ana Lucía Soto', estado: 'INACTIVO' as const },
      ]);
      await fixture.whenStable();
      expect(html.querySelectorAll('.resultado').length).toBe(2);

      elegir('#matricula-filtro-estado', 'INACTIVO');
      await fixture.whenStable();

      expect(html.querySelectorAll('.resultado').length).toBe(1);
      expect(html.textContent).toContain('Ana Lucía Soto');
      expect(html.textContent).not.toContain('Ana María Gómez');
    });

    it('un estudiante inactivo se muestra con su estado y deja intentar la matrícula', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', '1234567890');
      boton('Buscar').click();
      await fixture.whenStable();
      busquedaDe('1234567890').flush([{ ...ANA, estado: 'INACTIVO' }]);
      await fixture.whenStable();

      expect(html.textContent).toContain('Este estudiante está inactivo');
      await elegirAsignaturaYSemestre();
      expect(boton('Matricular').disabled).toBe(false);
    });

    it('el fallo de la búsqueda deja mensaje y reintento, sin perder lo escrito', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', '1234567890');
      boton('Buscar').click();
      await fixture.whenStable();
      busquedaDe('1234567890').flush(null, { status: 0, statusText: 'Unknown Error' });
      await fixture.whenStable();

      expect(html.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudo conectar con el servidor',
      );
      const campo = html.querySelector('#matricula-buscar-criterio') as HTMLInputElement;
      expect(campo.value).toBe('1234567890');

      boton('Reintentar').click();
      await fixture.whenStable();
      busquedaDe('1234567890').flush([ANA]);
      await fixture.whenStable();

      expect(html.textContent).toContain('Ana María Gómez');
    });

    it('al pasar a registrar conserva el documento que ya escribió', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', '9876543210');
      boton('Buscar').click();
      await fixture.whenStable();
      busquedaDe('9876543210').flush([]);
      await fixture.whenStable();

      await pasarARegistrar();

      const campo = html.querySelector('#matricula-nuevo-documento') as HTMLInputElement;
      expect(campo.value).toBe('9876543210');
    });

    it('si falla el catálogo de tipos de documento, avisa y «Reintentar» lo repite', async () => {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', '9876543210');
      boton('Buscar').click();
      await fixture.whenStable();
      busquedaDe('9876543210').flush([]);
      await fixture.whenStable();

      boton('Registrarlo y matricularlo').click();
      await fixture.whenStable();
      http
        .expectOne((r) => r.url === URL_TIPOS_DOCUMENTO)
        .flush('error', { status: 500, statusText: 'Error interno' });
      await fixture.whenStable();

      expect(html.textContent).toContain('No se pudieron cargar los tipos de documento.');

      boton('Reintentar').click();
      await fixture.whenStable();
      http.expectOne((r) => r.url === URL_TIPOS_DOCUMENTO).flush(TIPOS);
      await fixture.whenStable();

      expect(html.textContent).not.toContain('No se pudieron cargar los tipos de documento.');
      const opciones = Array.from(
        (html.querySelector('#matricula-nuevo-tipo') as HTMLSelectElement).options,
      ).map((o) => o.textContent?.trim());
      expect(opciones).toContain(TIPOS[0].nombre);
    });
  });

  describe('registrar y matricular en un paso (RF-09a, D14)', () => {
    async function irAEstudianteNuevo(): Promise<void> {
      await abrirConCatalogos();
      escribir('#matricula-buscar-criterio', '9876543210');
      boton('Buscar').click();
      await fixture.whenStable();
      busquedaDe('9876543210').flush([]);
      await fixture.whenStable();
      await pasarARegistrar();
    }

    async function completarEstudianteNuevo(): Promise<void> {
      elegir('#matricula-nuevo-tipo', TIPOS[0].id);
      escribir('#matricula-nuevo-documento', '9876543210');
      escribir('#matricula-nuevo-nombre', 'Carlos Ruiz');
      escribir('#matricula-nuevo-correo', 'carlos@uco.net.co');
      await fixture.whenStable();
    }

    it('no envía nada si faltan el nombre o el correo', async () => {
      await irAEstudianteNuevo();
      await elegirAsignaturaYSemestre();

      enviar();
      await fixture.whenStable();

      expect(html.textContent).toContain('Escribe el nombre completo.');
      expect(html.textContent).toContain('El correo debe ser del dominio institucional');
      http.expectNone((r) => r.method === 'POST');
    });

    it('rechaza un correo de otro dominio', async () => {
      await irAEstudianteNuevo();
      elegir('#matricula-nuevo-tipo', TIPOS[0].id);
      escribir('#matricula-nuevo-nombre', 'Carlos Ruiz');
      escribir('#matricula-nuevo-correo', 'carlos@gmail.com');
      await elegirAsignaturaYSemestre();

      enviar();
      await fixture.whenStable();

      expect(html.textContent).toContain('El correo debe ser del dominio institucional');
      http.expectNone((r) => r.method === 'POST');
    });

    it('rechaza un nombre con dígitos o símbolos', async () => {
      await irAEstudianteNuevo();
      await completarEstudianteNuevo();
      escribir('#matricula-nuevo-nombre', 'Carlos2 Ruiz');
      await elegirAsignaturaYSemestre();

      enviar();
      await fixture.whenStable();

      expect(html.textContent).toContain(
        'Usa solo letras y un único espacio entre cada palabra, sin números ni símbolos.',
      );
      http.expectNone((r) => r.method === 'POST');
    });

    it('envía el alta y luego la matrícula con el id devuelto, con un solo aviso', async () => {
      const avisos: string[] = [];
      fixture.componentInstance.matriculado.subscribe((t) => avisos.push(t));

      await irAEstudianteNuevo();
      await completarEstudianteNuevo();
      await elegirAsignaturaYSemestre();

      expect(boton('Registrar y matricular')).toBeTruthy();
      enviar();
      await fixture.whenStable();

      const peticionAlta = alta();
      expect(peticionAlta.request.body).toEqual({
        tipoDocumentoId: TIPOS[0].id,
        numeroDocumento: '9876543210',
        nombreCompleto: 'Carlos Ruiz',
        correoInstitucional: 'carlos@uco.net.co',
      });
      peticionAlta.flush(CREADO, { status: 201, statusText: 'Created' });
      await fixture.whenStable();

      const matricula = http.expectOne(URL_MATRICULAS);
      expect(matricula.request.body).toEqual({
        estudianteId: 'e10',
        asignaturaId: 'a1',
        semestreId: 's1',
      });
      matricula.flush(
        { id: 'm2', estudianteId: 'e10', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVA' },
        { status: 201, statusText: 'Created' },
      );
      await fixture.whenStable();

      expect(avisos).toEqual(['Estudiante registrado y matriculado.']);
    });

    it('si el alta funciona y la matrícula falla, lo dice en dos partes y el reintento no repite el alta', async () => {
      await irAEstudianteNuevo();
      await completarEstudianteNuevo();
      await elegirAsignaturaYSemestre();
      enviar();
      await fixture.whenStable();

      alta().flush(CREADO, { status: 201, statusText: 'Created' });
      await fixture.whenStable();
      http
        .expectOne(URL_MATRICULAS)
        .flush(
          { status: 400, error: 'BAD_REQUEST', mensaje: 'El semestre no está activo' },
          { status: 400, statusText: 'Bad Request' },
        );
      await fixture.whenStable();

      const alerta = html.querySelector('.alerta--parcial') as HTMLElement;
      expect(alerta.textContent).toContain('Carlos Ruiz quedó registrado');
      expect(alerta.textContent).toContain('la matrícula no se realizó');
      expect(alerta.textContent).toContain('El semestre no está activo');
      // El estudiante ya existe: la vista lo muestra como registrado.
      expect(html.textContent).toContain('Estudiante registrado');

      // Reintento: solo la matrícula, nunca un segundo POST /v1/estudiantes.
      elegir('#matricula-semestre', 's2');
      await fixture.whenStable();
      enviar();
      await fixture.whenStable();

      http.expectNone((r) => r.url === URL_ESTUDIANTES && r.method === 'POST');
      const reintento = http.expectOne(URL_MATRICULAS);
      expect(reintento.request.body).toEqual({
        estudianteId: 'e10',
        asignaturaId: 'a1',
        semestreId: 's2',
      });
      reintento.flush(
        { id: 'm3', estudianteId: 'e10', asignaturaId: 'a1', semestreId: 's2', estado: 'ACTIVA' },
        { status: 201, statusText: 'Created' },
      );
    });

    it('un 409 en el alta conserva lo escrito y deja buscar al que ya existe', async () => {
      await irAEstudianteNuevo();
      await completarEstudianteNuevo();
      await elegirAsignaturaYSemestre();
      enviar();
      await fixture.whenStable();

      alta().flush(
        { status: 409, error: 'CONFLICT', mensaje: 'El estudiante ya está registrado' },
        { status: 409, statusText: 'Conflict' },
      );
      await fixture.whenStable();

      expect(html.querySelector('[role="alert"]')?.textContent).toContain(
        'El estudiante ya está registrado',
      );
      const nombre = html.querySelector('#matricula-nuevo-nombre') as HTMLInputElement;
      expect(nombre.value).toBe('Carlos Ruiz');

      // Sin volver a teclear: pasa a buscar con el mismo documento y lo matricula.
      boton('Buscar ese estudiante y matricularlo').click();
      await fixture.whenStable();
      busquedaDe('9876543210').flush([{ ...CREADO, id: 'e11' }]);
      await fixture.whenStable();

      expect(html.textContent).toContain('Estudiante encontrado');
      enviar();
      await fixture.whenStable();
      const matricula = http.expectOne(URL_MATRICULAS);
      expect(matricula.request.body).toEqual({
        estudianteId: 'e11',
        asignaturaId: 'a1',
        semestreId: 's1',
      });
      matricula.flush(
        { id: 'm4', estudianteId: 'e11', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVA' },
        { status: 201, statusText: 'Created' },
      );
    });

    it('abre con los filtros heredados ya puestos (D16)', async () => {
      fixture.componentRef.setInput('asignaturaIdInicial', 'a1');
      fixture.componentRef.setInput('semestreIdInicial', 's1');
      await abrirConCatalogos();

      expect((html.querySelector('#matricula-asignatura') as HTMLSelectElement).value).toBe('a1');
      expect((html.querySelector('#matricula-semestre') as HTMLSelectElement).value).toBe('s1');
    });
  });
});
