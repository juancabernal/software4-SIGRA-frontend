import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Facultad } from '../../models/facultad.model';
import { FacultadesTab } from './facultades-tab';

const URL = `${environment.apiUrl}/v1/facultades`;

const INGENIERIA: Facultad = { id: 'f1', nombre: 'Facultad de Ingeniería', estado: 'ACTIVO' };
const ARTES: Facultad = { id: 'f2', nombre: 'Facultad de Artes', estado: 'INACTIVO' };

describe('FacultadesTab', () => {
  let fixture: ComponentFixture<FacultadesTab>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FacultadesTab],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FacultadesTab);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    vi.useRealTimers();
    html.remove();
    http.verify();
  });

  const listado = () => http.expectOne((r) => r.url === URL && r.method === 'GET');
  const filas = () => Array.from(html.querySelectorAll('tbody tr'));
  const fila = (texto: string) => filas().find((tr) => tr.textContent?.includes(texto))!;
  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;
  const buscador = () => html.querySelector('input[type="search"]') as HTMLInputElement;
  const selectorEstado = () => html.querySelector('select.selector') as HTMLSelectElement;
  const aviso = () => html.querySelector('.aviso')?.textContent?.trim() ?? null;

  async function iniciar(facultades: Facultad[] = [INGENIERIA, ARTES]): Promise<void> {
    await fixture.whenStable();
    listado().flush(facultades);
    await fixture.whenStable();
  }

  it('lista nombre y estado, y solo ofrece inactivar a las activas', async () => {
    await iniciar();

    const encabezados = Array.from(html.querySelectorAll('thead th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(encabezados).toEqual(['Nombre', 'Estado', 'Acciones']);
    expect(filas().length).toBe(2);
    expect(fila('Ingeniería').textContent).toContain('Activo');
    expect(boton(fila('Ingeniería'), 'Inactivar')).toBeDefined();
    expect(fila('Artes').textContent).toContain('Inactivo');
    expect(boton(fila('Artes'), 'Inactivar')).toBeUndefined();
  });

  it('muestra el mensaje del backend cuando falla el listado y permite reintentar', async () => {
    await fixture.whenStable();
    listado().flush(
      { status: 400, error: 'BAD_REQUEST', mensaje: 'El estado indicado no es válido' },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'El estado indicado no es válido',
    );
    boton(html, 'Reintentar').click();
    await fixture.whenStable();
    listado().flush([INGENIERIA]);
    await fixture.whenStable();
    expect(filas().length).toBe(1);
  });

  it('filtra por nombre tras el retardo y por estado al instante', async () => {
    await iniciar();
    vi.useFakeTimers();

    buscador().value = 'inge';
    buscador().dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(299);
    TestBed.tick();
    http.expectNone((r) => r.url === URL);
    vi.advanceTimersByTime(1);
    TestBed.tick();
    const porNombre = listado();
    expect(porNombre.request.params.get('nombre')).toBe('inge');
    porNombre.flush([INGENIERIA]);
    TestBed.tick();

    selectorEstado().value = 'INACTIVO';
    selectorEstado().dispatchEvent(new Event('change'));
    TestBed.tick();
    const porEstado = listado();
    expect(porEstado.request.params.get('nombre')).toBe('inge');
    expect(porEstado.request.params.get('estado')).toBe('INACTIVO');
    porEstado.flush([]);
    TestBed.tick();

    expect(html.textContent).toContain('Sin resultados');
  });

  it('«Limpiar filtros» vacía el buscador y el selector, y vuelve a consultar sin filtros', async () => {
    await iniciar();
    vi.useFakeTimers();

    buscador().value = 'zzz';
    buscador().dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(300);
    TestBed.tick();
    listado().flush([]);
    TestBed.tick();
    selectorEstado().value = 'INACTIVO';
    selectorEstado().dispatchEvent(new Event('change'));
    TestBed.tick();
    listado().flush([]);
    TestBed.tick();

    boton(html, 'Limpiar filtros').click();
    TestBed.tick();

    const req = listado();
    expect(req.request.params.keys()).toEqual([]);
    req.flush([INGENIERIA]);
    TestBed.tick();
    expect(buscador().value).toBe('');
    expect(selectorEstado().value).toBe('');
  });

  it('inactiva tras confirmar, avisa y recarga el listado', async () => {
    await iniciar();

    boton(fila('Ingeniería'), 'Inactivar').click();
    await fixture.whenStable();
    expect(html.textContent).toContain('¿Inactivar «Facultad de Ingeniería»?');
    boton(html.querySelector('app-dialogo-confirmacion')!, 'Inactivar').click();
    await fixture.whenStable();

    const req = http.expectOne(`${URL}/${INGENIERIA.id}/inactivar`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...INGENIERIA, estado: 'INACTIVO' });
    await fixture.whenStable();

    expect(aviso()).toContain('Facultad «Facultad de Ingeniería» inactivada.');
    listado().flush([{ ...INGENIERIA, estado: 'INACTIVO' }, ARTES]);
    await fixture.whenStable();
  });

  it('un 409 al inactivar (programas activos) muestra el mensaje del backend', async () => {
    await iniciar();
    const mensaje =
      "No se puede inactivar la facultad 'Facultad de Ingeniería' porque tiene programas activos";

    boton(fila('Ingeniería'), 'Inactivar').click();
    await fixture.whenStable();
    boton(html.querySelector('app-dialogo-confirmacion')!, 'Inactivar').click();
    await fixture.whenStable();

    http
      .expectOne(`${URL}/${INGENIERIA.id}/inactivar`)
      .flush({ status: 409, error: 'CONFLICT', mensaje }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(aviso()).toContain(mensaje);
    expect(html.querySelector('.aviso--error')).not.toBeNull();
    http.expectNone((r) => r.url === URL && r.method === 'GET');
  });

  it('un 404 al inactivar muestra el mensaje del backend', async () => {
    await iniciar();

    boton(fila('Ingeniería'), 'Inactivar').click();
    await fixture.whenStable();
    boton(html.querySelector('app-dialogo-confirmacion')!, 'Inactivar').click();
    await fixture.whenStable();

    http
      .expectOne(`${URL}/${INGENIERIA.id}/inactivar`)
      .flush(
        { status: 404, error: 'NOT_FOUND', mensaje: 'No existe la facultad' },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();

    expect(aviso()).toContain('No existe la facultad');
  });
});
