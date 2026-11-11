import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Facultad } from '../../models/facultad.model';
import { FacultadFormDialog } from './facultad-form-dialog';

const URL = `${environment.apiUrl}/v1/facultades`;

const EXISTENTE: Facultad = { id: 'f1', nombre: 'Facultad de Ingeniería', estado: 'ACTIVO' };

describe('FacultadFormDialog', () => {
  let fixture: ComponentFixture<FacultadFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;
  let guardadas: Facultad[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FacultadFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FacultadFormDialog);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    guardadas = [];
    fixture.componentInstance.guardado.subscribe((f) => guardadas.push(f));
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const nombre = () => html.querySelector('#facultad-nombre') as HTMLInputElement;
  const enviarBoton = () => html.querySelector('button[type="submit"]') as HTMLButtonElement;
  const errorModal = () => html.querySelector('.modal__error')?.textContent?.trim() ?? null;

  async function abrir(facultad: Facultad | null = null): Promise<void> {
    fixture.componentRef.setInput('facultad', facultad);
    fixture.componentRef.setInput('abierto', true);
    await fixture.whenStable();
  }

  async function escribirNombre(valor: string): Promise<void> {
    nombre().value = valor;
    nombre().dispatchEvent(new Event('input'));
    nombre().dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function enviar(): Promise<void> {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  }

  it('al registrar envía el nombre recortado y emite la facultad creada', async () => {
    await abrir();
    expect(html.querySelector('h2')?.textContent).toContain('Registrar facultad');

    await escribirNombre('  Facultad de Artes  ');
    await enviar();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Facultad de Artes' });
    const creada: Facultad = { id: 'f2', nombre: 'Facultad de Artes', estado: 'ACTIVO' };
    req.flush(creada, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(guardadas).toEqual([creada]);
  });

  it('con el nombre vacío no envía y muestra el error del campo', async () => {
    await abrir();
    await escribirNombre('   ');

    expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
    await enviar();
    http.expectNone(URL);
    expect(html.textContent).toContain('El nombre es obligatorio');
  });

  it('al modificar precarga el nombre y envía PUT', async () => {
    await abrir(EXISTENTE);
    expect(html.querySelector('h2')?.textContent).toContain('Modificar facultad');
    expect(nombre().value).toBe(EXISTENTE.nombre);

    await escribirNombre('Ingeniería');
    await enviar();

    const req = http.expectOne(`${URL}/${EXISTENTE.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'Ingeniería' });
    req.flush({ ...EXISTENTE, nombre: 'Ingeniería' });
    await fixture.whenStable();
    expect(guardadas.length).toBe(1);
  });

  it('un 400 muestra el mensaje y los detalles por campo', async () => {
    await abrir();
    await escribirNombre('Artes');
    await enviar();

    http.expectOne(URL).flush(
      {
        status: 400,
        error: 'BAD_REQUEST',
        mensaje: 'Los datos de entrada no cumplen con las validaciones requeridas',
        detalles: { nombre: 'El nombre no puede superar los 150 caracteres' },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();

    expect(errorModal()).toContain('Los datos de entrada no cumplen con las validaciones requeridas');
    expect(errorModal()).toContain('El nombre no puede superar los 150 caracteres');
    expect(nombre().value).toBe('Artes');
    expect(guardadas).toEqual([]);
  });

  it.each([
    [404, 'No existe la facultad con el identificador indicado'],
    [409, "Ya existe una facultad con el nombre 'Facultad de Artes'"],
  ])('un %s al modificar muestra el mensaje del backend', async (status, mensaje) => {
    await abrir(EXISTENTE);
    await escribirNombre('Facultad de Artes');
    await enviar();

    http
      .expectOne(`${URL}/${EXISTENTE.id}`)
      .flush({ status, error: 'X', mensaje }, { status, statusText: 'X' });
    await fixture.whenStable();

    expect(errorModal()).toContain(mensaje);
    expect(guardadas).toEqual([]);
  });
});
