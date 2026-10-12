import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { ResultadoAprendizaje } from '../../models/resultado-aprendizaje.model';
import {
  ResultadoAprendizajeFormDialog,
  ResultadoFormularioRa,
} from './resultado-aprendizaje-form-dialog';

const API = `${environment.apiUrl}/v1`;
const ASIGNATURA_ID = 'asig-1';
const URL_CREAR = `${API}/asignaturas/${ASIGNATURA_ID}/resultados-aprendizaje`;

const EXISTENTE: ResultadoAprendizaje = {
  id: 'ra-1',
  asignaturaId: ASIGNATURA_ID,
  codigo: 'RA1',
  descripcion: 'Analiza requisitos.',
  estado: 'ACTIVO',
};

describe('ResultadoAprendizajeFormDialog', () => {
  let fixture: ComponentFixture<ResultadoAprendizajeFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;
  let guardados: ResultadoFormularioRa[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ResultadoAprendizajeFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResultadoAprendizajeFormDialog);
    fixture.componentRef.setInput('asignaturaId', ASIGNATURA_ID);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    guardados = [];
    fixture.componentInstance.guardado.subscribe((r) => guardados.push(r));
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const campo = <T extends HTMLElement>(id: string) => html.querySelector(`#${id}`) as T;
  const enviarBoton = () => html.querySelector('button[type="submit"]') as HTMLButtonElement;

  async function abrir(resultado: ResultadoAprendizaje | null = null): Promise<void> {
    fixture.componentRef.setInput('resultado', resultado);
    fixture.componentRef.setInput('abierto', true);
    await fixture.whenStable();
  }

  async function escribir(id: string, valor: string): Promise<void> {
    const control = campo<HTMLInputElement | HTMLTextAreaElement>(id);
    control.value = valor;
    control.dispatchEvent(new Event('input'));
    control.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function enviar(): Promise<void> {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  }

  describe('modo crear', () => {
    it('pide código y descripción, ambos obligatorios', async () => {
      await abrir();

      expect(html.querySelector('h2')?.textContent).toContain('Registrar resultado de aprendizaje');
      expect(campo('ra-codigo')).not.toBeNull();
      expect(campo('ra-descripcion')).not.toBeNull();
      expect(html.querySelectorAll('.obligatorio').length).toBe(2);
    });

    it('con el formulario vacío no envía y muestra los errores', async () => {
      await abrir();

      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
      await enviar();

      http.expectNone(URL_CREAR);
      expect(html.textContent).toContain('Escribe el código del RA.');
      expect(html.textContent).toContain('Escribe la descripción del RA.');
    });

    it.each(['RA 1', 'RÁ1', 'RA_1', '-RA1', 'RA--1', 'RA1-'])(
      'rechaza el código «%s» por formato',
      async (codigo) => {
        await abrir();
        await escribir('ra-codigo', codigo);
        expect(html.textContent).toContain(
          'Usa letras sin tilde, números y guiones entre ellos (por ejemplo RA-01).',
        );
      },
    );

    it('acepta códigos como ra-01 y rechaza los de más de 10 caracteres', async () => {
      await abrir();

      await escribir('ra-codigo', ' ra-01 ');
      expect(campo('ra-codigo').getAttribute('aria-invalid')).toBe('false');
      await escribir('ra-codigo', 'A'.repeat(11));
      expect(html.textContent).toContain('El código no puede superar los 10 caracteres.');
    });

    it('exige entre 10 y 100 caracteres en la descripción y muestra el contador', async () => {
      await abrir();

      await escribir('ra-descripcion', 'Corta');
      expect(html.textContent).toContain('La descripción debe tener al menos 10 caracteres.');
      await escribir('ra-descripcion', 'A'.repeat(101));
      expect(html.textContent).toContain('La descripción no puede superar los 100 caracteres.');
      expect(html.textContent).toContain('101 / 100');
      await escribir('ra-descripcion', 'A'.repeat(100));
      expect(campo('ra-descripcion').getAttribute('aria-invalid')).toBe('false');
    });

    it('cuenta la descripción normalizada: los espacios repetidos no suman', async () => {
      await abrir();

      await escribir('ra-descripcion', '  Analiza     requisitos  ');
      expect(html.textContent).toContain('18 / 100');
    });

    it('rechaza los caracteres < y > en la descripción', async () => {
      await abrir();

      await escribir('ra-descripcion', '<b>Analiza requisitos</b>');
      expect(html.textContent).toContain(
        'La descripción no puede contener los caracteres < o > ni caracteres de control.',
      );
    });

    it('envía el código en mayúsculas y la descripción normalizada', async () => {
      await abrir();
      await escribir('ra-codigo', '  ra1 ');
      await escribir('ra-descripcion', '  Analiza\n   requisitos.  ');
      await enviar();

      const req = http.expectOne(URL_CREAR);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ codigo: 'RA1', descripcion: 'Analiza requisitos.' });
      req.flush(EXISTENTE, { status: 201, statusText: 'Created' });
      await fixture.whenStable();

      expect(guardados).toEqual([{ resultado: EXISTENTE, modo: 'crear' }]);
    });

    it('ante un 409 muestra el mensaje del backend y marca el código como duplicado', async () => {
      await abrir();
      await escribir('ra-codigo', 'RA1');
      await escribir('ra-descripcion', 'Analiza requisitos.');
      await enviar();

      http
        .expectOne(URL_CREAR)
        .flush(
          { mensaje: 'Ya existe un RA con el código RA1.' },
          { status: 409, statusText: 'Conflict' },
        );
      await fixture.whenStable();

      expect(html.querySelector('[role="alert"]')?.textContent).toContain(
        'Ya existe un RA con el código RA1.',
      );
      expect(html.textContent).toContain('Ya existe un RA con este código en la materia.');
      expect(guardados).toEqual([]);
    });

    it('ante una regla de negocio (400) conserva lo escrito y muestra el mensaje', async () => {
      await abrir();
      await escribir('ra-codigo', 'RA8');
      await escribir('ra-descripcion', 'Otro resultado de aprendizaje.');
      await enviar();

      http
        .expectOne(URL_CREAR)
        .flush({ mensaje: 'Máximo 7 RA activos.' }, { status: 400, statusText: 'Bad Request' });
      await fixture.whenStable();

      expect(html.querySelector('[role="alert"]')?.textContent).toContain('Máximo 7 RA activos.');
      expect(campo<HTMLInputElement>('ra-codigo').value).toBe('RA8');
    });
  });

  describe('modo editar', () => {
    it('muestra el código bloqueado y la descripción actual', async () => {
      await abrir(EXISTENTE);

      expect(html.querySelector('h2')?.textContent).toContain('Modificar descripción');
      expect(campo('ra-codigo')).toBeNull();
      const codigo = campo<HTMLInputElement>('ra-codigo-fijo');
      expect(codigo.readOnly).toBe(true);
      expect(codigo.value).toBe('RA1');
      expect(campo<HTMLTextAreaElement>('ra-descripcion').value).toBe('Analiza requisitos.');
    });

    it('envía solo la descripción con PUT y emite el modo editar', async () => {
      await abrir(EXISTENTE);
      await escribir('ra-descripcion', ' Nueva descripción. ');
      await enviar();

      const req = http.expectOne(`${API}/resultados-aprendizaje/ra-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ descripcion: 'Nueva descripción.' });
      const actualizado = { ...EXISTENTE, descripcion: 'Nueva descripción.' };
      req.flush(actualizado);
      await fixture.whenStable();

      expect(guardados).toEqual([{ resultado: actualizado, modo: 'editar' }]);
    });
  });
});
