import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Programa } from '../models/programa.model';
import { ProgramaService } from './programa.service';

const URL = `${environment.apiUrl}/v1/programas`;

const PROGRAMA: Programa = {
  id: '7459967a-c95e-4b59-8386-920719a6c26c',
  codigo: 'DER1',
  nombre: 'Derecho',
  estado: 'ACTIVO',
};

describe('ProgramaService', () => {
  let service: ProgramaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProgramaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista sin filtros con GET /v1/programas y sin parámetros', () => {
    let resultado: Programa[] | undefined;
    service.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([PROGRAMA]);
    expect(resultado).toEqual([PROGRAMA]);
  });

  it('envía solo los filtros con valor y recorta el texto', () => {
    service.listar({ nombre: '  dere  ', codigo: '  ', estado: 'INACTIVO' }).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('nombre')).toBe('dere');
    expect(req.request.params.has('codigo')).toBe(false);
    expect(req.request.params.get('estado')).toBe('INACTIVO');
    req.flush([]);
  });

  it('crea con POST enviando nombre y código', () => {
    service.crear({ nombre: 'Derecho', codigo: 'DER1' }).subscribe();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Derecho', codigo: 'DER1' });
    req.flush(PROGRAMA);
  });

  it('modifica con PUT enviando solo el nombre, porque el código es inmutable', () => {
    service.modificar(PROGRAMA.id, 'Derecho Civil').subscribe();

    const req = http.expectOne(`${URL}/${PROGRAMA.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'Derecho Civil' });
    req.flush({ ...PROGRAMA, nombre: 'Derecho Civil' });
  });

  it('inactiva con PATCH en /inactivar', () => {
    service.inactivar(PROGRAMA.id).subscribe();

    const req = http.expectOne(`${URL}/${PROGRAMA.id}/inactivar`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...PROGRAMA, estado: 'INACTIVO' });
  });
});
