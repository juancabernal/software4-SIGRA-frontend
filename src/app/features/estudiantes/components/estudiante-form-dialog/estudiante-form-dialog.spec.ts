import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Estudiante, EstudianteRequest } from '../../models/estudiante.model';
import { EstudianteFormDialog } from './estudiante-form-dialog';

const URL = `${environment.apiUrl}/v1/estudiantes`;
const URL_TIPOS_DOCUMENTO = `${environment.apiUrl}/v1/tipos-documento`;

/** El selector se llena con lo que sirve el backend, no con un catálogo fijo del front. */
const TIPOS_DOCUMENTO = [
  { id: 'td1', nombre: 'Cédula de Ciudadanía' },
  { id: 'td2', nombre: 'Tarjeta de Identidad' },
];

const ESTUDIANTE: Estudiante = {
  id: '00000000-0000-4000-c000-000000000010',
  tipoDocumentoNombre: TIPOS_DOCUMENTO[0].nombre,
  numeroDocumento: '1234567890',
  primerNombre: 'Ana',
  segundoNombre: 'María',
  primerApellido: 'Gómez',
  segundoApellido: 'Ruiz',
  nombreCompleto: 'Ana María Gómez Ruiz',
  correoInstitucional: 'ana@uco.net.co',
  estado: 'ACTIVO',
};

describe('EstudianteFormDialog', () => {
  let fixture: ComponentFixture<EstudianteFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EstudianteFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EstudianteFormDialog);
    html = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  function campo<T extends HTMLElement>(id: string): T {
    return html.querySelector(`#${id}`) as T;
  }

  function escribir(id: string, valor: string): void {
    const control = campo<HTMLInputElement | HTMLSelectElement>(id);
    control.value = valor;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
    control.dispatchEvent(new Event('blur'));
  }

  async function enviar(): Promise<void> {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  /** El catálogo del selector llega del servidor al abrir el diálogo. */
  function servirTiposDocumento(tipos = TIPOS_DOCUMENTO): void {
    http.expectOne((r) => r.url === URL_TIPOS_DOCUMENTO).flush(tipos);
  }

  async function abrirCrear(): Promise<void> {
    await fixture.whenStable();
    servirTiposDocumento();
    await fixture.whenStable();
  }

  async function abrirEditar(estudiante: Estudiante = ESTUDIANTE): Promise<void> {
    fixture.componentRef.setInput('estudiante', estudiante);
    await fixture.whenStable();
    servirTiposDocumento();
    await fixture.whenStable();
  }

  async function llenarValido(): Promise<void> {
    await abrirCrear();
    escribir('estudiante-tipo-documento', TIPOS_DOCUMENTO[0].id);
    escribir('estudiante-numero-documento', '1234567890');
    escribir('estudiante-primer-nombre', 'Ana');
    escribir('estudiante-segundo-nombre', 'María');
    escribir('estudiante-primer-apellido', 'Gómez');
    escribir('estudiante-segundo-apellido', 'Ruiz');
    escribir('estudiante-correo', 'ana@uco.net.co');
    await fixture.whenStable();
  }

  const MENSAJE_PARTE = 'Usa solo letras, sin espacios, números ni símbolos (máximo 50).';

  it('rechaza un documento de 5 dígitos', async () => {
    await llenarValido();
    escribir('estudiante-numero-documento', '12345');
    await fixture.whenStable();
    expect(html.textContent).toContain('Usa solo dígitos, entre 6 y 10 caracteres.');
  });

  it('rechaza un documento de 11 dígitos', async () => {
    await llenarValido();
    escribir('estudiante-numero-documento', '12345678901');
    await fixture.whenStable();
    expect(html.textContent).toContain('Usa solo dígitos, entre 6 y 10 caracteres.');
  });

  it('rechaza un documento con letras', async () => {
    await llenarValido();
    escribir('estudiante-numero-documento', '12345a');
    await fixture.whenStable();
    expect(html.textContent).toContain('Usa solo dígitos, entre 6 y 10 caracteres.');
  });

  it('rechaza un nombre con dígitos', async () => {
    await llenarValido();
    escribir('estudiante-primer-nombre', 'Ana2');
    await fixture.whenStable();
    expect(html.textContent).toContain(MENSAJE_PARTE);
  });

  it('rechaza un nombre con espacios', async () => {
    await llenarValido();
    escribir('estudiante-primer-apellido', 'De La Cruz');
    await fixture.whenStable();
    expect(html.textContent).toContain(MENSAJE_PARTE);
  });

  it('rechaza una parte del nombre de más de 50 caracteres', async () => {
    await llenarValido();
    escribir('estudiante-segundo-nombre', 'a'.repeat(51));
    await fixture.whenStable();
    expect(html.textContent).toContain(MENSAJE_PARTE);
  });

  it.each([
    ['estudiante-primer-nombre', 'Escribe el primer nombre.'],
    ['estudiante-primer-apellido', 'Escribe el primer apellido.'],
    ['estudiante-segundo-apellido', 'Escribe el segundo apellido.'],
  ])('%s vacío muestra su error', async (id, mensaje) => {
    await llenarValido();
    escribir(id, '');
    await fixture.whenStable();
    expect(html.textContent).toContain(mensaje);
  });

  it('el segundo nombre es opcional', async () => {
    await llenarValido();
    escribir('estudiante-segundo-nombre', '');
    await fixture.whenStable();
    expect(html.querySelector('.error-campo')).toBeNull();
  });

  it('acepta partes con tildes y Ñ', async () => {
    await llenarValido();
    escribir('estudiante-primer-nombre', 'José');
    escribir('estudiante-primer-apellido', 'Ñústes');
    await fixture.whenStable();
    expect(html.querySelector('.error-campo')).toBeNull();
  });

  it('rechaza un correo de un dominio ajeno', async () => {
    await llenarValido();
    escribir('estudiante-correo', 'ana@gmail.com');
    await fixture.whenStable();
    expect(html.textContent).toContain('Usa el formato usuario@uco.net.co.');
  });

  it('acepta un correo con mayúsculas y espacios alrededor', async () => {
    await llenarValido();
    escribir('estudiante-correo', '  ANA@UCO.NET.CO  ');
    await fixture.whenStable();
    expect(html.querySelector('.error-campo')).toBeNull();
  });

  it('envía el cuerpo exacto al registrar', async () => {
    let creado: Estudiante | undefined;
    fixture.componentInstance.guardado.subscribe((e) => (creado = e));
    await llenarValido();
    await enviar();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    const esperado: EstudianteRequest = {
      tipoDocumentoId: TIPOS_DOCUMENTO[0].id,
      numeroDocumento: '1234567890',
      primerNombre: 'Ana',
      segundoNombre: 'María',
      primerApellido: 'Gómez',
      segundoApellido: 'Ruiz',
      correoInstitucional: 'ana@uco.net.co',
    };
    expect(req.request.body).toEqual(esperado);
    expect(req.request.body).not.toHaveProperty('nombreCompleto');
    req.flush(ESTUDIANTE, { status: 201, statusText: 'Created' });
    expect(creado).toEqual(ESTUDIANTE);
  });

  it('omite el segundo nombre del cuerpo cuando se deja vacío', async () => {
    await llenarValido();
    escribir('estudiante-segundo-nombre', '');
    await enviar();

    const req = http.expectOne(URL);
    expect(req.request.body).not.toHaveProperty('segundoNombre');
    expect(req.request.body.primerNombre).toBe('Ana');
    req.flush(ESTUDIANTE, { status: 201, statusText: 'Created' });
  });

  it('en modificación precarga las cuatro partes del nombre desde la respuesta', async () => {
    await abrirEditar();

    expect(campo<HTMLInputElement>('estudiante-primer-nombre').value).toBe('Ana');
    expect(campo<HTMLInputElement>('estudiante-segundo-nombre').value).toBe('María');
    expect(campo<HTMLInputElement>('estudiante-primer-apellido').value).toBe('Gómez');
    expect(campo<HTMLInputElement>('estudiante-segundo-apellido').value).toBe('Ruiz');
  });

  it('en modificación deja vacío el segundo nombre si la respuesta no lo trae', async () => {
    await abrirEditar({ ...ESTUDIANTE, segundoNombre: null, nombreCompleto: 'Ana Gómez Ruiz' });

    expect(campo<HTMLInputElement>('estudiante-segundo-nombre').value).toBe('');
  });

  it('deja el documento y el tipo de documento no editables en modificación', async () => {
    await abrirEditar();

    expect(html.querySelector('h2')?.textContent).toContain('Modificar estudiante');
    expect(campo<HTMLSelectElement>('estudiante-tipo-documento').disabled).toBe(true);
    expect(campo<HTMLSelectElement>('estudiante-tipo-documento').value).toBe(TIPOS_DOCUMENTO[0].id);
    expect(campo<HTMLInputElement>('estudiante-numero-documento').disabled).toBe(true);
    expect(campo<HTMLInputElement>('estudiante-numero-documento').value).toBe('1234567890');
    expect(campo<HTMLInputElement>('estudiante-primer-nombre').disabled).toBe(false);
  });

  it('muestra el mensaje del servidor ante un 409 de documento duplicado', async () => {
    await llenarValido();
    await enviar();

    http.expectOne(URL).flush(
      {
        status: 409,
        error: 'CONFLICT',
        mensaje: 'Ya existe un estudiante registrado con ese documento',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'Ya existe un estudiante registrado con ese documento',
    );
  });

  it('avisa y no envía cuando el tipo de documento no está en el catálogo del servidor (D3)', async () => {
    await abrirEditar({ ...ESTUDIANTE, tipoDocumentoNombre: 'Pasaporte' });

    expect(html.textContent).toContain('no figura en el catálogo del servidor');
    expect((html.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    await enviar();
    http.expectNone(URL);
  });

  it('el selector ofrece los tipos que sirve el servidor, no una lista fija', async () => {
    await abrirCrear();

    const opciones = Array.from(campo<HTMLSelectElement>('estudiante-tipo-documento').options)
      .filter((o) => o.value)
      .map((o) => ({ id: o.value, nombre: o.textContent?.trim() }));

    expect(opciones).toEqual([
      { id: 'td1', nombre: 'Cédula de Ciudadanía' },
      { id: 'td2', nombre: 'Tarjeta de Identidad' },
    ]);
  });

  it('resuelve el tipo por su nombre aunque difieran las tildes', async () => {
    await abrirEditar({ ...ESTUDIANTE, tipoDocumentoNombre: 'Cedula de Ciudadania' });

    expect(html.textContent).not.toContain('no figura en el catálogo');
    expect(campo<HTMLSelectElement>('estudiante-tipo-documento').value).toBe('td1');
  });

  it('si el catálogo no carga lo dice en lugar de ofrecer un selector vacío', async () => {
    await fixture.whenStable();
    http
      .expectOne((r) => r.url === URL_TIPOS_DOCUMENTO)
      .flush(null, { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();

    expect(html.textContent).toContain('No se pudieron cargar los tipos de documento');
  });

  it('el primer nombre vacío muestra su error y no permite enviar', async () => {
    await llenarValido();
    escribir('estudiante-primer-nombre', '');
    await fixture.whenStable();

    expect(html.textContent).toContain('Escribe el primer nombre.');

    await enviar();
    http.expectNone(URL);
  });

  it('el botón "Cancelar" cierra el diálogo y emite "cerrado"', async () => {
    let cerrado = false;
    fixture.componentInstance.cerrado.subscribe(() => (cerrado = true));
    await llenarValido();

    (html.querySelector('button[type="button"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(cerrado).toBe(true);
    http.expectNone(URL);
  });

  it('el evento nativo "cancel" del <dialog> también cierra y emite "cerrado"', async () => {
    let cerrado = false;
    fixture.componentInstance.cerrado.subscribe(() => (cerrado = true));
    await llenarValido();

    const dialogo = html.querySelector('dialog') as HTMLDialogElement;
    dialogo.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();

    expect(cerrado).toBe(true);
    http.expectNone(URL);
  });

  it('mientras se registra, el botón de envío muestra "Registrando…" y queda deshabilitado', async () => {
    await llenarValido();
    await enviar();

    const submit = html.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.textContent?.trim()).toBe('Registrando…');
    expect(submit.disabled).toBe(true);

    http.expectOne(URL).flush(ESTUDIANTE, { status: 201, statusText: 'Created' });
  });

  it('mientras se modifica, el botón de envío muestra "Guardando…" y queda deshabilitado', async () => {
    await abrirEditar();
    escribir('estudiante-primer-apellido', 'Actualizado');
    await enviar();

    const submit = html.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.textContent?.trim()).toBe('Guardando…');
    expect(submit.disabled).toBe(true);

    http.expectOne(`${URL}/${ESTUDIANTE.id}`).flush(ESTUDIANTE, { status: 200, statusText: 'OK' });
  });

  it('un error 500 del backend muestra el mensaje genérico, sin detalles técnicos', async () => {
    await llenarValido();
    await enviar();

    http.expectOne(URL).flush(
      {
        status: 500,
        error: 'INTERNAL_SERVER_ERROR',
        mensaje: 'NullPointerException en co.edu.uco.sigra.EstudianteService:42',
      },
      { status: 500, statusText: 'Internal Server Error' },
    );
    await fixture.whenStable();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'Ocurrió un error inesperado. Intenta de nuevo en unos minutos.',
    );
    expect(html.textContent).not.toContain('NullPointerException');
  });
});
