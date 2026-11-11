import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Facultad } from '../../../facultades/models/facultad.model';
import { FACULTAD_SIN_ASIGNAR_ID, Programa } from '../../models/programa.model';
import { ProgramasTab } from './programas-tab';

const URL = `${environment.apiUrl}/v1/programas`;
const URL_FACULTADES = `${environment.apiUrl}/v1/facultades`;

const INGENIERIA: Facultad = { id: 'f1', nombre: 'Facultad de Ingeniería', estado: 'ACTIVO' };
const ARTES: Facultad = { id: 'f2', nombre: 'Facultad de Artes', estado: 'INACTIVO' };

const SISTEMAS: Programa = {
  id: 'p1',
  codigo: 'ISIS',
  nombre: 'Ingeniería de Sistemas',
  facultadId: INGENIERIA.id,
  facultadNombre: INGENIERIA.nombre,
  estado: 'ACTIVO',
};
const HEREDADO: Programa = {
  id: 'p2',
  codigo: 'DER1',
  nombre: 'Derecho',
  facultadId: FACULTAD_SIN_ASIGNAR_ID,
  facultadNombre: 'Facultad sin asignar',
  estado: 'ACTIVO',
};

describe('ProgramasTab', () => {
  let fixture: ComponentFixture<ProgramasTab>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProgramasTab],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProgramasTab);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const listado = () => http.expectOne((r) => r.url === URL && r.method === 'GET');
  const filas = () => Array.from(html.querySelectorAll('tbody tr'));
  const fila = (texto: string) => filas().find((tr) => tr.textContent?.includes(texto))!;
  const filtroFacultad = () => html.querySelector('#filtro-facultad') as HTMLSelectElement;
  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  async function iniciar(
    programas: Programa[] = [SISTEMAS, HEREDADO],
    facultades: Facultad[] | 'error' = [INGENIERIA, ARTES],
  ): Promise<void> {
    await fixture.whenStable();
    const reqFacultades = http.expectOne(URL_FACULTADES);
    expect(reqFacultades.request.params.keys()).toEqual([]);
    if (facultades === 'error') {
      reqFacultades.flush(null, { status: 503, statusText: 'Service Unavailable' });
    } else {
      reqFacultades.flush(facultades);
    }
    listado().flush(programas);
    await fixture.whenStable();
  }

  it('muestra la columna Facultad con el nombre de la facultad de cada programa', async () => {
    await iniciar();

    const encabezados = Array.from(html.querySelectorAll('thead th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(encabezados).toEqual(['Nombre', 'Código', 'Facultad', 'Estado', 'Acciones']);
    expect(fila('ISIS').querySelector('.facultad')?.textContent?.trim()).toBe(INGENIERIA.nombre);
  });

  it('resalta los programas en «Facultad sin asignar» y avisa cuántos hay', async () => {
    await iniciar();

    const heredado = fila('DER1');
    expect(heredado.classList).toContain('fila--sin-facultad');
    expect(heredado.querySelector('.facultad')?.textContent).toContain('Sin asignar · reasignar');
    expect(fila('ISIS').classList).not.toContain('fila--sin-facultad');
    expect(html.querySelector('.reasignar')?.textContent).toContain(
      '1 programa está en «Facultad sin asignar».',
    );
  });

  it('sin programas por reasignar no muestra el aviso', async () => {
    await iniciar([SISTEMAS]);
    expect(html.querySelector('.reasignar')).toBeNull();
  });

  it('el filtro de facultad lista todas las facultades y envía facultadId', async () => {
    await iniciar();

    expect(Array.from(filtroFacultad().options).map((o) => o.textContent?.trim())).toEqual([
      'Todas las facultades',
      INGENIERIA.nombre,
      `${ARTES.nombre} (inactiva)`,
    ]);

    filtroFacultad().value = ARTES.id;
    filtroFacultad().dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const req = listado();
    expect(req.request.params.get('facultadId')).toBe(ARTES.id);
    req.flush([]);
    await fixture.whenStable();
    expect(html.textContent).toContain('Sin resultados');

    boton(html, 'Limpiar filtros').click();
    await fixture.whenStable();
    const sinFiltros = listado();
    expect(sinFiltros.request.params.keys()).toEqual([]);
    sinFiltros.flush([SISTEMAS]);
    await fixture.whenStable();
    expect(filtroFacultad().value).toBe('');
  });

  it('si fallan las facultades el listado se muestra igual', async () => {
    await iniciar([SISTEMAS], 'error');

    expect(filas().length).toBe(1);
    expect(filtroFacultad().options.length).toBe(1);
  });

  it('un 409 al inactivar un programa muestra el mensaje del backend', async () => {
    await iniciar();
    const mensaje = "No se puede inactivar el programa 'Ingeniería de Sistemas' porque tiene asignaturas activas";

    boton(fila('ISIS'), 'Inactivar').click();
    await fixture.whenStable();
    boton(html.querySelector('app-dialogo-confirmacion')!, 'Inactivar').click();
    await fixture.whenStable();

    http
      .expectOne(`${URL}/${SISTEMAS.id}/inactivar`)
      .flush({ status: 409, error: 'CONFLICT', mensaje }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(html.querySelector('.aviso--error')?.textContent).toContain(mensaje);
  });
});
