import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Conclusion } from '../../../estadisticas/models/conclusion.model';
import { AccionMejora, DESCRIPCION_ACCION_MAX, NOMBRE_ACCION_MAX } from '../../models/accion-mejora.model';
import { AccionMejoraFormDialog } from './accion-mejora-form-dialog';

const URL = `${environment.apiUrl}/v1/conclusiones/c1/acciones-mejora`;
const URL_ACTUALIZAR = `${environment.apiUrl}/v1/acciones-mejora/am1`;

const CONCLUSION: Conclusion = {
  id: 'c1',
  resultadoAprendizajeId: 'ra-1',
  resultadoAprendizajeCodigo: 'RA1',
  asignaturaId: 'a1',
  semestreId: 's1',
  semestreCodigo: '2026-1',
  mensaje: 'Más del 40% de los estudiantes no alcanzó el RA.',
  tieneDatosSuficientes: true,
  fechaGeneracion: '2026-06-01',
  porcentajeInsuficiente: 45,
  estado: 'VIGENTE',
};

const ACCION_CREADA: AccionMejora = {
  id: 'am1',
  nombre: 'Taller de refuerzo',
  descripcion: 'Taller para reforzar integrales',
  fechaPropuesta: '2026-06-01',
  resultadoAprendizajeId: 'ra-1',
  resultadoAprendizajeCodigo: 'RA1',
  asignaturaId: 'a1',
  semestreId: 's1',
  semestreCodigo: '2026-1',
  conclusionOrigenId: 'c1',
  evaluacionGeneradaId: null,
  convertida: false,
};

describe('AccionMejoraFormDialog', () => {
  let fixture: ComponentFixture<AccionMejoraFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;
  let guardados: AccionMejora[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccionMejoraFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AccionMejoraFormDialog);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    guardados = [];
    fixture.componentInstance.guardado.subscribe((a) => guardados.push(a));
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const campo = <T extends HTMLElement>(id: string) => html.querySelector(`#${id}`) as T;
  const enviarBoton = () => html.querySelector('button[type="submit"]') as HTMLButtonElement;

  async function abrir(): Promise<void> {
    fixture.componentRef.setInput('conclusion', CONCLUSION);
    fixture.componentRef.setInput('abierto', true);
    await fixture.whenStable();
  }

  async function abrirParaEditar(accion: AccionMejora): Promise<void> {
    fixture.componentRef.setInput('conclusion', null);
    fixture.componentRef.setInput('accion', accion);
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

  async function llenarValido(): Promise<void> {
    await escribir('accion-nombre', 'Taller de refuerzo');
    await escribir('accion-descripcion', 'Taller para reforzar integrales');
  }

  it('con nombre o descripción vacíos no deja guardar', async () => {
    await abrir();

    expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
    await enviar();
    http.expectNone(URL);
    expect(html.textContent).toContain('Escribe el nombre de la acción de mejora.');
    expect(html.textContent).toContain('Escribe la descripción de la acción de mejora.');

    await escribir('accion-nombre', 'Taller');
    expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
    await enviar();
    http.expectNone(URL);
  });

  it.each([
    ['A'.repeat(NOMBRE_ACCION_MAX), true],
    ['A'.repeat(NOMBRE_ACCION_MAX + 1), false],
  ])('respeta el límite de %i caracteres en el nombre', async (valor, debeSerValido) => {
    await abrir();
    await escribir('accion-nombre', valor as string);
    await escribir('accion-descripcion', 'Descripción válida');

    expect(enviarBoton().hasAttribute('aria-disabled')).toBe(!debeSerValido);
    expect(campo('accion-nombre').getAttribute('aria-invalid')).toBe(debeSerValido ? 'false' : 'true');
  });

  it.each([
    ['A'.repeat(DESCRIPCION_ACCION_MAX), true],
    ['A'.repeat(DESCRIPCION_ACCION_MAX + 1), false],
  ])('respeta el límite de %i caracteres en la descripción', async (valor, debeSerValido) => {
    await abrir();
    await escribir('accion-nombre', 'Nombre válido');
    await escribir('accion-descripcion', valor as string);

    expect(enviarBoton().hasAttribute('aria-disabled')).toBe(!debeSerValido);
    expect(campo('accion-descripcion').getAttribute('aria-invalid')).toBe(
      debeSerValido ? 'false' : 'true',
    );
  });

  it('con datos válidos llama al endpoint con lo escrito y emite lo guardado', async () => {
    await abrir();
    await llenarValido();
    expect(enviarBoton().hasAttribute('aria-disabled')).toBe(false);

    await enviar();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Taller de refuerzo',
      descripcion: 'Taller para reforzar integrales',
    });
    req.flush(ACCION_CREADA);
    await fixture.whenStable();

    expect(guardados).toEqual([ACCION_CREADA]);
  });

  it('recorta espacios sobrantes al enviar', async () => {
    await abrir();
    await escribir('accion-nombre', '  Taller de refuerzo  ');
    await escribir('accion-descripcion', '  Taller para reforzar integrales  ');
    await enviar();

    const req = http.expectOne(URL);
    expect(req.request.body).toEqual({
      nombre: 'Taller de refuerzo',
      descripcion: 'Taller para reforzar integrales',
    });
    req.flush(ACCION_CREADA);
    await fixture.whenStable();
  });

  it('si el backend responde error, muestra el mensaje y no deja la pantalla rota', async () => {
    await abrir();
    await llenarValido();
    await enviar();

    http.expectOne(URL).flush(
      {
        status: 400,
        error: 'BAD_REQUEST',
        mensaje: 'Los datos de entrada no cumplen con las validaciones requeridas',
        detalles: ['nombre: El nombre es obligatorio'],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();

    const alerta = html.querySelector('[role="alert"]') as HTMLElement;
    expect(alerta.textContent).toContain('no cumplen con las validaciones requeridas');
    expect(alerta.textContent).toContain('El nombre es obligatorio');
    expect(campo<HTMLInputElement>('accion-nombre').value).toBe('Taller de refuerzo');
    expect(guardados).toEqual([]);
  });

  it('en modo edición precarga los campos y llama a actualizar', async () => {
    await abrirParaEditar(ACCION_CREADA);

    expect(campo<HTMLInputElement>('accion-nombre').value).toBe(ACCION_CREADA.nombre);
    expect(campo<HTMLTextAreaElement>('accion-descripcion').value).toBe(ACCION_CREADA.descripcion);
    expect(html.textContent).toContain('Editar acción de mejora');
    expect(enviarBoton().textContent).toContain('Guardar cambios');

    const actualizada: AccionMejora = { ...ACCION_CREADA, nombre: 'Taller actualizado' };
    await escribir('accion-nombre', 'Taller actualizado');
    await enviar();

    const req = http.expectOne(URL_ACTUALIZAR);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      nombre: 'Taller actualizado',
      descripcion: ACCION_CREADA.descripcion,
    });
    req.flush(actualizada);
    await fixture.whenStable();

    expect(guardados).toEqual([actualizada]);
  });
});
