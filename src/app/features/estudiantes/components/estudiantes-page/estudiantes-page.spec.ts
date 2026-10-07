import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { Estudiante } from '../../models/estudiante.model';
import { EstudiantesPage } from './estudiantes-page';

const URL = `${environment.apiUrl}/v1/estudiantes`;

function estudiante(parcial: Partial<Estudiante>): Estudiante {
  return {
    id: 'e1',
    tipoDocumentoNombre: 'Cédula de ciudadanía',
    numeroDocumento: '1234567890',
    nombreCompleto: 'Ana María Gómez',
    correoInstitucional: 'ana@uco.net.co',
    estado: 'ACTIVO',
    ...parcial,
  };
}

const ANA = estudiante({});

describe('EstudiantesPage', () => {
  let fixture: ComponentFixture<EstudiantesPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EstudiantesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EstudiantesPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    vi.useRealTimers();
    html.remove();
    http.verify();
  });

  const listado = () => http.expectOne((r) => r.url === URL && r.method === 'GET');
  const fila = (texto: string) =>
    Array.from(html.querySelectorAll('tbody tr')).find((tr) =>
      tr.textContent?.includes(texto),
    ) as HTMLTableRowElement;
  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  async function iniciar(estudiantes: Estudiante[]): Promise<void> {
    await fixture.whenStable();
    listado().flush(estudiantes);
    await fixture.whenStable();
  }

  it('muestra el estado de carga y luego una fila por estudiante', async () => {
    await fixture.whenStable();
    expect(html.querySelector('[aria-busy="true"]')?.textContent).toContain(
      'Cargando estudiantes…',
    );

    const req = listado();
    expect(req.request.params.keys()).toEqual([]);
    req.flush([ANA]);
    await fixture.whenStable();

    expect(html.querySelectorAll('tbody tr').length).toBe(1);
    const primera = fila('Ana María Gómez');
    expect(primera.textContent).toContain('Cédula de ciudadanía 1234567890');
    expect(primera.textContent).toContain('ana@uco.net.co');
    expect(primera.textContent).toContain('Activo');
  });

  it('sin estudiantes y sin filtros invita a registrar', async () => {
    await iniciar([]);
    expect(html.textContent).toContain('Aún no hay estudiantes registrados');
    expect(boton(html.querySelector('.estado-vista')!, 'Registrar estudiante')).toBeDefined();
  });

  it('el buscador espera 300 ms sin teclear antes de consultar una sola vez', async () => {
    await iniciar([ANA]);
    // El debounce del valor inicial se programó con relojes reales: se deja terminar antes de
    // pasar a relojes falsos, para que el temporizador que se mide sea el del texto escrito.
    await new Promise((resolver) => setTimeout(resolver, 350));
    vi.useFakeTimers();

    const input = html.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = '  ana ';
    input.dispatchEvent(new Event('input'));
    TestBed.tick();

    vi.advanceTimersByTime(299);
    TestBed.tick();
    http.expectNone((r) => r.url === URL);

    vi.advanceTimersByTime(1);
    TestBed.tick();
    const req = listado();
    expect(req.request.params.get('filtro')).toBe('ana');
    req.flush([ANA]);
  });

  it('la búsqueda sin coincidencias permite limpiarla', async () => {
    await iniciar([ANA]);
    await new Promise((resolver) => setTimeout(resolver, 350));
    vi.useFakeTimers();

    const input = html.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    TestBed.tick();
    vi.advanceTimersByTime(300);
    TestBed.tick();
    listado().flush([]);
    vi.useRealTimers();
    // Forzar una pasada de detección de cambios aquí: al volver a relojes reales justo después
    // de un flush bajo relojes falsos, la vista puede quedar un ciclo atrás de las señales
    // (seguía mostrando «Cargando…») y `whenStable()` no lo corrige por sí solo.
    TestBed.tick();
    await fixture.whenStable();

    expect(html.textContent).toContain('Sin resultados');
    expect(html.textContent).toContain('Ningún estudiante coincide con esa búsqueda.');

    boton(html, 'Limpiar búsqueda').click();
    // El debounce de 300 ms vuelve a correr con relojes reales tras «Limpiar búsqueda».
    await new Promise((resolver) => setTimeout(resolver, 350));
    await fixture.whenStable();
    const req = listado();
    expect(req.request.params.has('filtro')).toBe(false);
    req.flush([ANA]);
  });

  it('un error de carga se muestra como alerta y permite reintentar', async () => {
    await fixture.whenStable();
    listado().flush(null, { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();

    const alerta = html.querySelector('[role="alert"]') as HTMLElement;
    expect(alerta.textContent).toContain('No se pudo conectar con el servidor');

    boton(alerta, 'Reintentar').click();
    await fixture.whenStable();
    listado().flush([ANA]);
    await fixture.whenStable();
    expect(html.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('Inactivar pide confirmación y cancelar no llama al servicio', async () => {
    await iniciar([ANA]);
    boton(fila('Ana María Gómez'), 'Inactivar').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-dialogo-confirmacion dialog') as HTMLDialogElement;
    expect(dialogo.querySelector('h2')?.textContent).toContain('¿Inactivar a «Ana María Gómez»?');
    expect(dialogo.textContent).toContain('su historial académico se conserva');

    boton(dialogo, 'Cancelar').click();
    await fixture.whenStable();
    http.expectNone((r) => r.url === `${URL}/e1`);
  });

  it('confirmar Inactivar llama al servicio y vuelve a consultar el listado', async () => {
    await iniciar([ANA]);
    boton(fila('Ana María Gómez'), 'Inactivar').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-dialogo-confirmacion dialog') as HTMLDialogElement;
    boton(dialogo, 'Inactivar').click();
    await fixture.whenStable();

    const reqInactivar = http.expectOne(`${URL}/e1`);
    expect(reqInactivar.request.method).toBe('DELETE');
    reqInactivar.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(html.querySelector('.aviso-zona')?.textContent).toContain(
      'Estudiante inactivado: Ana María Gómez.',
    );
    listado().flush([estudiante({ estado: 'INACTIVO' })]);
    await fixture.whenStable();
    expect(fila('Ana María Gómez').textContent).toContain('Inactivo');
  });
});
