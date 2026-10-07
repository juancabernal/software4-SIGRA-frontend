import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Estudiante, EstudianteRequest } from '../../models/estudiante.model';
import { TIPOS_DOCUMENTO } from '../../models/tipos-documento';
import { EstudianteFormDialog } from './estudiante-form-dialog';

const URL = `${environment.apiUrl}/v1/estudiantes`;

const ESTUDIANTE: Estudiante = {
  id: '00000000-0000-4000-c000-000000000010',
  tipoDocumentoNombre: TIPOS_DOCUMENTO[0].nombre,
  numeroDocumento: '1234567890',
  nombreCompleto: 'Ana María Gómez',
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

  async function abrirCrear(): Promise<void> {
    await fixture.whenStable();
  }

  async function abrirEditar(estudiante: Estudiante = ESTUDIANTE): Promise<void> {
    fixture.componentRef.setInput('estudiante', estudiante);
    await fixture.whenStable();
  }

  async function llenarValido(): Promise<void> {
    await abrirCrear();
    escribir('estudiante-tipo-documento', TIPOS_DOCUMENTO[0].id);
    escribir('estudiante-numero-documento', '1234567890');
    escribir('estudiante-nombre', 'Ana María Gómez');
    escribir('estudiante-correo', 'ana@uco.net.co');
    await fixture.whenStable();
  }

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
      nombreCompleto: 'Ana María Gómez',
      correoInstitucional: 'ana@uco.net.co',
    };
    expect(req.request.body).toEqual(esperado);
    req.flush(ESTUDIANTE, { status: 201, statusText: 'Created' });
    expect(creado).toEqual(ESTUDIANTE);
  });

  it('deja el documento y el tipo de documento no editables en modificación', async () => {
    await abrirEditar();

    expect(html.querySelector('h2')?.textContent).toContain('Modificar estudiante');
    expect(campo<HTMLSelectElement>('estudiante-tipo-documento').disabled).toBe(true);
    expect(campo<HTMLSelectElement>('estudiante-tipo-documento').value).toBe(
      TIPOS_DOCUMENTO[0].id,
    );
    expect(campo<HTMLInputElement>('estudiante-numero-documento').disabled).toBe(true);
    expect(campo<HTMLInputElement>('estudiante-numero-documento').value).toBe('1234567890');
    expect(campo<HTMLInputElement>('estudiante-nombre').disabled).toBe(false);
  });

  it('muestra el mensaje del servidor ante un 409 de documento duplicado', async () => {
    await llenarValido();
    await enviar();

    http
      .expectOne(URL)
      .flush(
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

  it('avisa y no envía cuando el tipo de documento no resuelve a ningún id (D3)', async () => {
    await abrirEditar({ ...ESTUDIANTE, tipoDocumentoNombre: 'Pasaporte' });

    expect(html.textContent).toContain('no se pudo resolver');
    expect((html.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
    await enviar();
    http.expectNone(URL);
  });
});
