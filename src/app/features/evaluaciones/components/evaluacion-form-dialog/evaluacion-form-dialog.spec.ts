import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Evaluacion, HOY_ISO, SemestreOpcion } from '../../models/evaluacion.model';
import { EvaluacionFormDialog, ResultadoFormularioEvaluacion } from './evaluacion-form-dialog';

const API = `${environment.apiUrl}/v1`;
const URL_CREAR = `${API}/resultados-aprendizaje/ra-1/evaluaciones`;

/** Hoy fijo de las pruebas: las fechas de abajo son relativas a él. */
const HOY = '2026-09-01';

const SEMESTRE: SemestreOpcion = {
  id: 's1',
  codigo: '2026-2',
  fechaInicio: '2026-07-20',
  fechaFin: '2026-12-10',
};

const EXISTENTE: Evaluacion = {
  id: 'ev-1',
  resultadoAprendizajeId: 'ra-1',
  semestreId: 's1',
  semestreCodigo: '2026-2',
  nombre: 'Parcial 1',
  fechaTentativa: '2026-09-15',
  porcentaje: 30,
  descripcion: 'Evaluación escrita.',
  estado: 'ACTIVA',
  tieneCalificaciones: false,
};

describe('EvaluacionFormDialog', () => {
  let fixture: ComponentFixture<EvaluacionFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;
  let guardados: ResultadoFormularioEvaluacion[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EvaluacionFormDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: HOY_ISO, useValue: () => HOY },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EvaluacionFormDialog);
    fixture.componentRef.setInput('raId', 'ra-1');
    fixture.componentRef.setInput('semestre', SEMESTRE);
    fixture.componentRef.setInput('porcentajeDisponible', 40);
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

  async function abrir(evaluacion: Evaluacion | null = null): Promise<void> {
    fixture.componentRef.setInput('evaluacion', evaluacion);
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

  async function llenarValido(): Promise<void> {
    await escribir('evaluacion-nombre', '  Parcial   1 ');
    await escribir('evaluacion-fecha', '2026-09-15');
    await escribir('evaluacion-porcentaje', '25.5');
    await escribir('evaluacion-descripcion', ' Evaluación\n escrita. ');
  }

  async function enviar(): Promise<void> {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  }

  describe('modo crear', () => {
    it('pide los 4 campos obligatorios y no envía el formulario vacío', async () => {
      await abrir();

      expect(html.querySelector('h2')?.textContent).toContain('Registrar evaluación');
      expect(html.querySelectorAll('.obligatorio').length).toBe(4);
      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
      await enviar();

      http.expectNone(URL_CREAR);
      expect(html.textContent).toContain('Escribe el nombre de la evaluación.');
      expect(html.textContent).toContain('Selecciona la fecha tentativa.');
      expect(html.textContent).toContain('Escribe el porcentaje.');
      expect(html.textContent).toContain('Escribe la descripción de la evaluación.');
    });

    it('limita la fecha al semestre en curso', async () => {
      await abrir();

      const fecha = campo<HTMLInputElement>('evaluacion-fecha');
      expect(fecha.min).toBe('2026-09-02');
      expect(fecha.max).toBe('2026-12-10');
      await escribir('evaluacion-fecha', '2026-12-20');
      expect(html.textContent).toContain('La fecha debe estar dentro del semestre 2026-2.');
    });

    it('rechaza la fecha de hoy y las pasadas: debe ser posterior a hoy', async () => {
      await abrir();

      await escribir('evaluacion-fecha', HOY);
      expect(html.textContent).toContain('La fecha debe ser posterior a hoy.');
      await escribir('evaluacion-fecha', '2026-08-15');
      expect(html.textContent).toContain('La fecha debe ser posterior a hoy.');
      await escribir('evaluacion-fecha', '2026-09-02');
      expect(html.textContent).not.toContain('La fecha debe ser posterior a hoy.');
    });

    it('valida el porcentaje: mayor que 0, 2 decimales y sin pasar lo disponible', async () => {
      await abrir();

      await escribir('evaluacion-porcentaje', '0');
      expect(html.textContent).toContain('El porcentaje debe ser mayor que 0 y máximo 100.');
      await escribir('evaluacion-porcentaje', '10.555');
      expect(html.textContent).toContain('El porcentaje admite máximo 2 decimales.');
      await escribir('evaluacion-porcentaje', '40.01');
      expect(html.textContent).toContain('Supera lo disponible del RA');
      await escribir('evaluacion-porcentaje', '40');
      expect(campo('evaluacion-porcentaje').getAttribute('aria-invalid')).toBe('false');
    });

    it('valida el largo y los caracteres del nombre y la descripción', async () => {
      await abrir();

      await escribir('evaluacion-nombre', 'A'.repeat(31));
      expect(html.textContent).toContain('El nombre no puede superar los 30 caracteres.');
      await escribir('evaluacion-descripcion', '<script>');
      expect(html.textContent).toContain(
        'La descripción no puede contener los caracteres < o > ni caracteres de control.',
      );
    });

    it('envía los textos normalizados y emite el modo crear', async () => {
      await abrir();
      await llenarValido();
      await enviar();

      const req = http.expectOne(URL_CREAR);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        nombre: 'Parcial 1',
        fechaTentativa: '2026-09-15',
        porcentaje: 25.5,
        descripcion: 'Evaluación escrita.',
      });
      req.flush(EXISTENTE, { status: 201, statusText: 'Created' });
      await fixture.whenStable();

      expect(guardados).toEqual([{ evaluacion: EXISTENTE, modo: 'crear' }]);
    });

    it('ante un 409 muestra el mensaje y marca el nombre como duplicado', async () => {
      await abrir();
      await llenarValido();
      await enviar();

      http
        .expectOne(URL_CREAR)
        .flush(
          { mensaje: 'Ya existe una evaluación con ese nombre.' },
          { status: 409, statusText: 'Conflict' },
        );
      await fixture.whenStable();

      expect(html.querySelector('[role="alert"]')?.textContent).toContain(
        'Ya existe una evaluación con ese nombre.',
      );
      expect(html.textContent).toContain(
        'Ya existe una evaluación con este nombre en el RA y semestre.',
      );
      expect(guardados).toEqual([]);
    });
  });

  describe('modo editar', () => {
    it('suma su propio porcentaje a lo disponible', async () => {
      await abrir(EXISTENTE);

      expect(html.textContent).toContain('Máximo disponible: 70');
      await escribir('evaluacion-porcentaje', '70');
      expect(campo('evaluacion-porcentaje').getAttribute('aria-invalid')).toBe('false');
    });

    it('con calificaciones bloquea fecha y porcentaje y los envía sin cambios', async () => {
      await abrir({ ...EXISTENTE, tieneCalificaciones: true });

      expect(html.textContent).toContain('ya tiene calificaciones');
      expect(campo<HTMLInputElement>('evaluacion-fecha').disabled).toBe(true);
      expect(campo<HTMLInputElement>('evaluacion-porcentaje').disabled).toBe(true);

      await escribir('evaluacion-nombre', 'Parcial final');
      await enviar();

      const req = http.expectOne(`${API}/evaluaciones/ev-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        nombre: 'Parcial final',
        fechaTentativa: '2026-09-15',
        porcentaje: 30,
        descripcion: 'Evaluación escrita.',
      });
      req.flush({ ...EXISTENTE, nombre: 'Parcial final' });
      await fixture.whenStable();
      expect(guardados[0].modo).toBe('editar');
    });
  });
});
