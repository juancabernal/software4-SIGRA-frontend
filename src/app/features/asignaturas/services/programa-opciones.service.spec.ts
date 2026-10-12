import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { ProgramaOpcion } from '../models/asignatura.model';
import { ProgramaOpcionesService } from './programa-opciones.service';

const URL = `${environment.apiUrl}/v1/programas`;

const PROGRAMA: ProgramaOpcion = {
  id: '00000000-0000-4000-a000-0000000000a1',
  codigo: 'BRU-ACT',
  nombre: 'Programa Bruno Activo',
  estado: 'ACTIVO',
};

describe('ProgramaOpcionesService', () => {
  let service: ProgramaOpcionesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProgramaOpcionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista todos los programas con GET /v1/programas sin parámetros', () => {
    let resultado: ProgramaOpcion[] | undefined;
    service.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.urlWithParams).toBe(URL);
    req.flush([PROGRAMA]);
    expect(resultado).toEqual([PROGRAMA]);
  });

  it('filtra por estado cuando se indica', () => {
    service.listar('ACTIVO').subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.urlWithParams).toBe(`${URL}?estado=ACTIVO`);
    req.flush([]);
  });
});
