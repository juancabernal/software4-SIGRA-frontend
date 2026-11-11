import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Facultad } from '../models/facultad.model';
import { FacultadService } from './facultad.service';

const URL = `${environment.apiUrl}/v1/facultades`;

const FACULTAD: Facultad = {
  id: '7459967a-c95e-4b59-8386-920719a6c26c',
  nombre: 'Facultad de Ingeniería',
  estado: 'ACTIVO',
};

describe('FacultadService', () => {
  let service: FacultadService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FacultadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista sin filtros con GET /v1/facultades y sin parámetros', () => {
    let resultado: Facultad[] | undefined;
    service.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([FACULTAD]);
    expect(resultado).toEqual([FACULTAD]);
  });

  it('envía solo los filtros con valor y recorta el nombre', () => {
    service.listar({ nombre: '  inge  ', estado: 'INACTIVO' }).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('nombre')).toBe('inge');
    expect(req.request.params.get('estado')).toBe('INACTIVO');
    req.flush([]);
  });

  it('consulta por id', () => {
    service.consultar(FACULTAD.id).subscribe();

    const req = http.expectOne(`${URL}/${FACULTAD.id}`);
    expect(req.request.method).toBe('GET');
    req.flush(FACULTAD);
  });

  it('crea con POST enviando el nombre', () => {
    service.crear({ nombre: FACULTAD.nombre }).subscribe();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: FACULTAD.nombre });
    req.flush(FACULTAD);
  });

  it('modifica con PUT enviando solo el nombre', () => {
    service.modificar(FACULTAD.id, 'Ingeniería').subscribe();

    const req = http.expectOne(`${URL}/${FACULTAD.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'Ingeniería' });
    req.flush({ ...FACULTAD, nombre: 'Ingeniería' });
  });

  it.each([
    [400, 'BAD_REQUEST', 'Los datos de entrada no cumplen con las validaciones requeridas'],
    [404, 'NOT_FOUND', 'No existe la facultad'],
    [409, 'CONFLICT', "Ya existe una facultad con el nombre 'Ingeniería'"],
  ])('propaga el error %s del PUT con el mensaje del backend', (status, error, mensaje) => {
    let recibido: HttpErrorResponse | undefined;
    service.modificar(FACULTAD.id, 'Ingeniería').subscribe({
      error: (e: HttpErrorResponse) => (recibido = e),
    });

    http
      .expectOne(`${URL}/${FACULTAD.id}`)
      .flush({ status, error, mensaje }, { status, statusText: error });
    expect(recibido?.status).toBe(status);
    expect(recibido?.error.mensaje).toBe(mensaje);
  });

  it('propaga el 409 al inactivar una facultad con programas activos', () => {
    const mensaje = "No se puede inactivar la facultad 'Ingeniería' porque tiene programas activos";
    let recibido: HttpErrorResponse | undefined;
    service.inactivar(FACULTAD.id).subscribe({ error: (e: HttpErrorResponse) => (recibido = e) });

    http
      .expectOne(`${URL}/${FACULTAD.id}/inactivar`)
      .flush({ status: 409, error: 'CONFLICT', mensaje }, { status: 409, statusText: 'Conflict' });
    expect(recibido?.status).toBe(409);
    expect(recibido?.error.mensaje).toBe(mensaje);
  });

  it('inactiva con PATCH en /inactivar y sin cuerpo', () => {
    service.inactivar(FACULTAD.id).subscribe();

    const req = http.expectOne(`${URL}/${FACULTAD.id}/inactivar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    req.flush({ ...FACULTAD, estado: 'INACTIVO' });
  });
});
