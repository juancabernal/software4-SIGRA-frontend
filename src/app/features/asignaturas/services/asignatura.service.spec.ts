import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Asignatura } from '../models/asignatura.model';
import { AsignaturaService } from './asignatura.service';

const URL = `${environment.apiUrl}/v1/asignaturas`;

const ASIGNATURA: Asignatura = {
  id: '00000000-0000-4000-b000-000000000004',
  codigo: 'BRU05',
  nombre: 'Bruno Cinco RA',
  programaId: '00000000-0000-4000-a000-0000000000a1',
  programaNombre: 'Programa Bruno Activo',
  estado: 'BORRADOR',
  cantidadRa: 5,
};

describe('AsignaturaService', () => {
  let service: AsignaturaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AsignaturaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista sin filtros con GET /v1/asignaturas y sin parámetros', () => {
    let resultado: Asignatura[] | undefined;
    service.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([ASIGNATURA]);
    expect(resultado).toEqual([ASIGNATURA]);
  });

  it('envía todos los filtros con valor, con el texto recortado', () => {
    service
      .listar({
        texto: '  bruno ',
        programaId: 'p1',
        estado: 'BORRADOR',
        raMin: 0,
        raMax: 4,
      })
      .subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.urlWithParams).toBe(
      `${URL}?texto=bruno&programaId=p1&estado=BORRADOR&raMin=0&raMax=4`,
    );
    req.flush([]);
  });

  it('omite los filtros vacíos o sin valor', () => {
    service.listar({ texto: '   ', programaId: '', raMin: undefined, raMax: 7 }).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.urlWithParams).toBe(`${URL}?raMax=7`);
    req.flush([]);
  });

  it('obtiene una asignatura con GET /v1/asignaturas/{id}', () => {
    service.obtener(ASIGNATURA.id).subscribe();

    const req = http.expectOne(`${URL}/${ASIGNATURA.id}`);
    expect(req.request.method).toBe('GET');
    req.flush(ASIGNATURA);
  });

  it('activa con PATCH /v1/asignaturas/{id}/activar', () => {
    let resultado: Asignatura | undefined;
    service.activar(ASIGNATURA.id).subscribe((r) => (resultado = r));

    const req = http.expectOne(`${URL}/${ASIGNATURA.id}/activar`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...ASIGNATURA, estado: 'ACTIVA' });
    expect(resultado?.estado).toBe('ACTIVA');
  });

  it('inactiva con PATCH /v1/asignaturas/{id}/inactivar', () => {
    service.inactivar(ASIGNATURA.id).subscribe();

    const req = http.expectOne(`${URL}/${ASIGNATURA.id}/inactivar`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...ASIGNATURA, estado: 'INACTIVA', cantidadRa: 0 });
  });
});
