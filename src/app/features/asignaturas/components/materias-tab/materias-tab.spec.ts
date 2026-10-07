import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Asignatura, ProgramaOpcion } from '../../models/asignatura.model';
import { MateriasTab, TOOLTIP_ACTIVAR } from './materias-tab';

const URL = `${environment.apiUrl}/v1/asignaturas`;
const URL_PROGRAMAS = `${environment.apiUrl}/v1/programas`;

const PROGRAMA: ProgramaOpcion = {
  id: 'p1',
  codigo: 'ISIS',
  nombre: 'Ingeniería de Sistemas',
  estado: 'ACTIVO',
};

function asignatura(parcial: Partial<Asignatura>): Asignatura {
  return {
    id: 'a1',
    codigo: 'ISW4',
    nombre: 'Ingeniería de Software IV',
    programaId: 'p1',
    programaNombre: 'Ingeniería de Sistemas',
    estado: 'BORRADOR',
    cantidadRa: 5,
    ...parcial,
  };
}

const BORRADOR_5 = asignatura({ id: 'b5', codigo: 'BRU05', nombre: 'Bruno Cinco', cantidadRa: 5 });
const BORRADOR_4 = asignatura({ id: 'b4', codigo: 'BRU04', nombre: 'Bruno Cuatro', cantidadRa: 4 });
const ACTIVA = asignatura({ id: 'ac', codigo: 'BRU10', nombre: 'Bruno Activa', estado: 'ACTIVA' });
const INACTIVA = asignatura({
  id: 'in',
  codigo: 'BRU11',
  nombre: 'Bruno Inactiva',
  estado: 'INACTIVA',
  cantidadRa: 0,
});

describe('MateriasTab', () => {
  let fixture: ComponentFixture<MateriasTab>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MateriasTab],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MateriasTab);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    vi.useRealTimers();
    html.remove();
    http.verify();
  });

  const listado = () => http.expectOne((r) => r.url === URL && r.method === 'GET');
  const fila = (codigo: string) =>
    Array.from(html.querySelectorAll('tbody tr')).find((tr) =>
      tr.textContent?.includes(codigo),
    ) as HTMLTableRowElement;
  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  async function iniciar(
    asignaturas: Asignatura[],
    programas: ProgramaOpcion[] | 'error' = [PROGRAMA],
  ): Promise<TestRequest> {
    await fixture.whenStable();
    const reqProgramas = http.expectOne(URL_PROGRAMAS);
    if (programas === 'error') {
      reqProgramas.flush(null, { status: 404, statusText: 'Not Found' });
    } else {
      reqProgramas.flush(programas);
    }
    const req = listado();
    req.flush(asignaturas);
    await fixture.whenStable();
    return req;
  }

  async function cambiarSelect(id: string, valor: string): Promise<void> {
    const select = html.querySelector(`#${id}`) as HTMLSelectElement;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  it('muestra el estado de carga y luego una fila por materia', async () => {
    await fixture.whenStable();
    const cargando = html.querySelector('[role="status"].estado-vista');
    expect(cargando?.textContent).toContain('Cargando materias…');

    http.expectOne(URL_PROGRAMAS).flush([PROGRAMA]);
    const req = listado();
    expect(req.request.params.keys()).toEqual([]);
    req.flush([BORRADOR_5, ACTIVA]);
    await fixture.whenStable();

    expect(html.querySelectorAll('tbody tr').length).toBe(2);
    const primera = fila('BRU05');
    expect(primera.textContent).toContain('Bruno Cinco');
    expect(primera.textContent).toContain('Ingeniería de Sistemas');
    expect(primera.textContent).toContain('Borrador');
    expect(fila('BRU10').textContent).toContain('Activa');
  });

  it('el selector de programa lista los programas y envía programaId al servicio', async () => {
    await iniciar([BORRADOR_5]);
    const opciones = Array.from(html.querySelectorAll('#filtro-programa option'));
    expect(opciones.map((o) => o.textContent?.trim())).toEqual([
      'Todos los programas',
      'Ingeniería de Sistemas',
    ]);

    await cambiarSelect('filtro-programa', 'p1');
    const req = listado();
    expect(req.request.params.get('programaId')).toBe('p1');
    req.flush([BORRADOR_5]);
  });

  it('el selector de estado va entre programa y RA y envía estado al servicio de inmediato', async () => {
    await iniciar([BORRADOR_5]);
    const ids = Array.from(html.querySelectorAll('select.selector')).map((s) => s.id);
    expect(ids).toEqual(['filtro-programa', 'filtro-estado', 'filtro-ra']);
    expect(html.querySelector('label[for="filtro-estado"]')?.textContent?.trim()).toBe('Estado');
    const opciones = Array.from(html.querySelectorAll('#filtro-estado option'));
    expect(opciones.map((o) => o.textContent?.trim())).toEqual([
      'Todos los estados',
      'Borrador',
      'Activa',
      'Inactiva',
    ]);

    await cambiarSelect('filtro-estado', 'ACTIVA');
    const req = listado();
    expect(req.request.params.get('estado')).toBe('ACTIVA');
    req.flush([ACTIVA]);
  });

  it('el estado se combina con los demás filtros y cancela la consulta anterior', async () => {
    await iniciar([BORRADOR_5]);
    await cambiarSelect('filtro-programa', 'p1');
    const primera = listado();
    await cambiarSelect('filtro-estado', 'BORRADOR');
    const segunda = listado();
    expect(primera.cancelled).toBe(true);
    await cambiarSelect('filtro-ra', 'de5a7');
    const tercera = listado();
    expect(segunda.cancelled).toBe(true);

    expect(tercera.request.params.get('programaId')).toBe('p1');
    expect(tercera.request.params.get('estado')).toBe('BORRADOR');
    expect(tercera.request.params.get('raMin')).toBe('5');
    expect(tercera.request.params.get('raMax')).toBe('7');
    tercera.flush([BORRADOR_5]);
  });

  it('«Limpiar filtros» restablece el filtro de estado', async () => {
    await iniciar([BORRADOR_5]);
    await cambiarSelect('filtro-estado', 'INACTIVA');
    listado().flush([]);
    await fixture.whenStable();

    expect(html.textContent).toContain('Sin resultados');
    boton(html, 'Limpiar filtros').click();
    await fixture.whenStable();

    const req = listado();
    expect(req.request.params.has('estado')).toBe(false);
    req.flush([BORRADOR_5]);
    await fixture.whenStable();
    expect((html.querySelector('#filtro-estado') as HTMLSelectElement).value).toBe('');
  });

  it.each([
    ['sin', '0', '0'],
    ['menos5', '0', '4'],
    ['de5a7', '5', '7'],
    ['mas7', '8', null],
  ])('el rango de RA «%s» envía raMin=%s y raMax=%s', async (valor, raMin, raMax) => {
    await iniciar([BORRADOR_5]);
    await cambiarSelect('filtro-ra', valor);

    const req = listado();
    expect(req.request.params.get('raMin')).toBe(raMin);
    expect(req.request.params.get('raMax')).toBe(raMax);
    req.flush([]);
  });

  it('el buscador espera 300 ms sin teclear antes de consultar', async () => {
    await iniciar([BORRADOR_5]);
    // El debounce del valor inicial se programó con relojes reales: se deja terminar antes de
    // pasar a relojes falsos, para que el temporizador que se mide sea el del texto escrito.
    await new Promise((resolver) => setTimeout(resolver, 350));
    vi.useFakeTimers();

    const input = html.querySelector('input[type="search"]') as HTMLInputElement;
    input.value = '  bru ';
    input.dispatchEvent(new Event('input'));
    TestBed.tick();

    vi.advanceTimersByTime(299);
    TestBed.tick();
    http.expectNone((r) => r.url === URL);

    vi.advanceTimersByTime(1);
    TestBed.tick();
    const req = listado();
    expect(req.request.params.get('texto')).toBe('bru');
    req.flush([]);
  });

  it('un filtro nuevo cancela la consulta anterior para que no pise el resultado', async () => {
    await iniciar([BORRADOR_5]);

    await cambiarSelect('filtro-programa', 'p1');
    const primera = listado();
    await cambiarSelect('filtro-ra', 'de5a7');
    const segunda = listado();

    expect(primera.cancelled).toBe(true);
    segunda.flush([ACTIVA]);
    await fixture.whenStable();
    expect(html.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('sin materias y sin filtros invita a registrar', async () => {
    await iniciar([]);
    expect(html.textContent).toContain('Aún no hay materias registradas');
    expect(boton(html.querySelector('.estado-vista')!, 'Registrar')).toBeDefined();
  });

  it('sin resultados con filtros permite limpiarlos', async () => {
    await iniciar([BORRADOR_5]);
    await cambiarSelect('filtro-programa', 'p1');
    listado().flush([]);
    await fixture.whenStable();

    expect(html.textContent).toContain('Sin resultados');
    boton(html, 'Limpiar filtros').click();
    await fixture.whenStable();

    const req = listado();
    expect(req.request.params.keys()).toEqual([]);
    req.flush([BORRADOR_5]);
    await fixture.whenStable();
    expect((html.querySelector('#filtro-programa') as HTMLSelectElement).value).toBe('');
  });

  it('un error de carga se muestra como alerta y permite reintentar', async () => {
    await fixture.whenStable();
    http.expectOne(URL_PROGRAMAS).flush([PROGRAMA]);
    listado().flush(null, { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();

    const alerta = html.querySelector('[role="alert"]') as HTMLElement;
    expect(alerta.textContent).toContain('No se pudo conectar con el servidor');

    boton(alerta, 'Reintentar').click();
    await fixture.whenStable();
    listado().flush([BORRADOR_5]);
    await fixture.whenStable();
    expect(html.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('si fallan los programas, el filtro queda solo con «Todos» y la pantalla funciona', async () => {
    await iniciar([BORRADOR_5], 'error');

    const opciones = html.querySelectorAll('#filtro-programa option');
    expect(opciones.length).toBe(1);
    expect(html.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('Activar queda deshabilitado con aria-disabled y tooltip si no hay entre 5 y 7 RA', async () => {
    await iniciar([BORRADOR_4]);

    const activar = boton(fila('BRU04'), 'Activar');
    expect(activar.getAttribute('aria-disabled')).toBe('true');
    expect(activar.disabled).toBe(false);
    const tooltip = html.querySelector(`#${activar.getAttribute('aria-describedby')}`);
    expect(tooltip?.getAttribute('role')).toBe('tooltip');
    expect(tooltip?.textContent?.trim()).toBe(TOOLTIP_ACTIVAR);
    expect(TOOLTIP_ACTIVAR).toBe('Requiere entre 5 y 7 RA asociados');

    activar.click();
    http.expectNone((r) => r.url.endsWith('/activar'));
  });

  it('Activar habilitado actualiza la fila y avisa', async () => {
    await iniciar([BORRADOR_5]);

    const activar = boton(fila('BRU05'), 'Activar');
    expect(activar.hasAttribute('aria-disabled')).toBe(false);
    expect(activar.hasAttribute('aria-describedby')).toBe(false);
    activar.click();
    await fixture.whenStable();

    const req = http.expectOne(`${URL}/b5/activar`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...BORRADOR_5, estado: 'ACTIVA' });
    await fixture.whenStable();

    expect(fila('BRU05').textContent).toContain('Activa');
    expect(boton(fila('BRU05'), 'Inactivar')).toBeDefined();
    expect(html.querySelector('.aviso-zona')?.textContent).toContain('Materia activada');
  });

  it('un error al activar muestra el mensaje del backend y recarga el listado', async () => {
    await iniciar([BORRADOR_5]);
    boton(fila('BRU05'), 'Activar').click();
    await fixture.whenStable();

    http.expectOne(`${URL}/b5/activar`).flush(
      {
        status: 409,
        error: 'CONFLICT',
        mensaje: 'No se puede activar una asignatura en estado ACTIVA.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();

    expect(html.querySelector('.aviso-zona')?.textContent).toContain(
      'No se puede activar una asignatura en estado ACTIVA.',
    );
    listado().flush([{ ...BORRADOR_5, estado: 'ACTIVA' }]);
  });

  it('Inactivar pide confirmación y cancelar no llama al servicio', async () => {
    await iniciar([ACTIVA]);
    boton(fila('BRU10'), 'Inactivar').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-dialogo-confirmacion dialog') as HTMLDialogElement;
    expect(dialogo.querySelector('h2')?.textContent).toContain('¿Inactivar «Bruno Activa»?');
    expect(dialogo.textContent).toContain('No se elimina nada');

    boton(dialogo, 'Cancelar').click();
    await fixture.whenStable();
    http.expectNone((r) => r.url.endsWith('/inactivar'));
  });

  it('confirmar Inactivar actualiza la fila y avisa', async () => {
    await iniciar([ACTIVA]);
    boton(fila('BRU10'), 'Inactivar').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-dialogo-confirmacion dialog') as HTMLDialogElement;
    boton(dialogo, 'Inactivar').click();
    await fixture.whenStable();

    const req = http.expectOne(`${URL}/ac/inactivar`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...ACTIVA, estado: 'INACTIVA', cantidadRa: 0 });
    await fixture.whenStable();

    expect(fila('BRU10').textContent).toContain('Inactiva');
    expect(html.querySelector('.aviso-zona')?.textContent).toContain('Materia inactivada');
  });

  it('una materia INACTIVA ofrece Reactivar (siempre habilitado) y no Activar ni Inactivar', async () => {
    await iniciar([INACTIVA]);
    const acciones = fila('BRU11');
    expect(boton(acciones, 'Activar')).toBeUndefined();
    expect(boton(acciones, 'Inactivar')).toBeUndefined();
    expect(boton(acciones, 'Reactivar').hasAttribute('aria-disabled')).toBe(false);
  });

  it('Reactivar exitoso actualiza la fila y avisa que se restauraron los RA', async () => {
    await iniciar([INACTIVA]);
    boton(fila('BRU11'), 'Reactivar').click();
    await fixture.whenStable();

    const req = http.expectOne(`${URL}/in/activar`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...INACTIVA, estado: 'ACTIVA', cantidadRa: 5 });
    await fixture.whenStable();

    expect(fila('BRU11').textContent).toContain('Activa');
    expect(html.querySelector('.aviso-zona')?.textContent).toContain(
      'Materia reactivada: Bruno Inactiva. Se restauraron sus RA.',
    );
  });

  it('un error al reactivar muestra el mensaje del backend y recarga el listado', async () => {
    await iniciar([INACTIVA]);
    boton(fila('BRU11'), 'Reactivar').click();
    await fixture.whenStable();

    http.expectOne(`${URL}/in/activar`).flush(
      {
        status: 400,
        error: 'BAD_REQUEST',
        mensaje:
          'Para activar la asignatura se requieren al menos 5 resultados de aprendizaje activos y actualmente tiene 3.',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await fixture.whenStable();

    expect(html.querySelector('.aviso-zona')?.textContent).toContain('al menos 5');
    listado().flush([INACTIVA]);
  });

  it('Consultar abre el panel lateral con los datos de la materia', async () => {
    await iniciar([BORRADOR_5]);
    boton(fila('BRU05'), 'Consultar').click();
    await fixture.whenStable();

    const panel = html.querySelector('app-panel-lateral dialog') as HTMLDialogElement;
    expect(panel.open || panel.hasAttribute('open')).toBe(true);
    expect(panel.textContent).toContain('Bruno Cinco');
    expect(panel.textContent).toContain('BRU05');
    expect(panel.textContent).toContain('Ingeniería de Sistemas');
    expect(panel.textContent).toContain('Borrador');
    expect(panel.textContent).toContain('Para activar se requieren entre 5 y 7 RA activos');
    expect(panel.textContent).toContain('Solo lectura · no editable desde esta vista');
  });

  describe('registrar y modificar', () => {
    const modal = () =>
      html.querySelector('app-asignatura-form-dialog dialog') as HTMLDialogElement;
    const modalAbierto = () => modal().open || modal().hasAttribute('open');
    const programasActivos = () =>
      http.expectOne((r) => r.url === URL_PROGRAMAS && r.params.get('estado') === 'ACTIVO');

    async function escribir(id: string, valor: string): Promise<void> {
      const control = html.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement;
      control.value = valor;
      control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
      await fixture.whenStable();
    }

    async function enviarModal(): Promise<void> {
      modal()
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
    }

    it('Registrar abre el modal en modo crear y Cancelar lo cierra sin recargar', async () => {
      await iniciar([BORRADOR_5]);
      boton(html.querySelector('.barra')!, 'Registrar').click();
      await fixture.whenStable();
      programasActivos().flush([PROGRAMA]);
      await fixture.whenStable();

      expect(modalAbierto()).toBe(true);
      expect(modal().querySelector('h2')?.textContent).toContain('Registrar materia');

      boton(modal(), 'Cancelar').click();
      await fixture.whenStable();
      expect(modalAbierto()).toBe(false);
      http.expectNone((r) => r.url === URL);
    });

    it('registrar con éxito cierra el modal, avisa y recarga la lista', async () => {
      await iniciar([]);
      boton(html.querySelector('.estado-vista')!, 'Registrar').click();
      await fixture.whenStable();
      programasActivos().flush([PROGRAMA]);
      await fixture.whenStable();

      await escribir('materia-nombre', 'Cálculo Integral');
      await escribir('materia-codigo', 'MAT-401');
      await escribir('materia-programa', 'p1');
      await enviarModal();

      http
        .expectOne((r) => r.url === URL && r.method === 'POST')
        .flush(
          asignatura({ id: 'n1', codigo: 'MAT-401', nombre: 'Cálculo Integral', cantidadRa: 0 }),
        );
      await fixture.whenStable();

      expect(modalAbierto()).toBe(false);
      expect(html.querySelector('.aviso-zona')?.textContent).toContain(
        'Materia registrada: Cálculo Integral. Queda en estado Borrador.',
      );
      listado().flush([]);
    });

    it('Modificar abre el modal en modo editar y guardar recarga la lista', async () => {
      await iniciar([ACTIVA]);
      boton(fila('BRU10'), 'Modificar').click();
      await fixture.whenStable();

      expect(modalAbierto()).toBe(true);
      expect(modal().querySelector('h2')?.textContent).toContain('Modificar materia');
      expect((html.querySelector('#materia-codigo-fijo') as HTMLInputElement).value).toBe('BRU10');

      await escribir('materia-nombre', 'Bruno Renombrada');
      await enviarModal();

      const req = http.expectOne(`${URL}/ac`);
      expect(req.request.method).toBe('PUT');
      req.flush({ ...ACTIVA, nombre: 'Bruno Renombrada' });
      await fixture.whenStable();

      expect(modalAbierto()).toBe(false);
      expect(html.querySelector('.aviso-zona')?.textContent).toContain(
        'Materia actualizada: Bruno Renombrada.',
      );
      listado().flush([{ ...ACTIVA, nombre: 'Bruno Renombrada' }]);
    });
  });
});
