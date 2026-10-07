import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { AsignaturaOpcion } from '../models/resultado-aprendizaje.model';
import { AsignaturaOpcionesService } from './asignatura-opciones.service';

const URL = `${environment.apiUrl}/v1/asignaturas`;

const BORRADOR: AsignaturaOpcion = {
  id: '00000000-0000-4000-b000-000000000001',
  codigo: 'ZZZ01',
  nombre: 'Materia en borrador',
  estado: 'BORRADOR',
  cantidadRa: 2,
};

const ACTIVA: AsignaturaOpcion = {
  id: '00000000-0000-4000-b000-000000000002',
  codigo: 'AAA01',
  nombre: 'Materia activa',
  estado: 'ACTIVA',
  cantidadRa: 5,
};

describe('AsignaturaOpcionesService', () => {
  let service: AsignaturaOpcionesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AsignaturaOpcionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta BORRADOR y ACTIVA y une los resultados ordenados por código', () => {
    let resultado: AsignaturaOpcion[] | undefined;
    service.listarGestionables().subscribe((r) => (resultado = r));

    const borrador = http.expectOne(`${URL}?estado=BORRADOR`);
    const activa = http.expectOne(`${URL}?estado=ACTIVA`);
    expect(borrador.request.method).toBe('GET');
    expect(activa.request.method).toBe('GET');

    borrador.flush([BORRADOR]);
    activa.flush([ACTIVA]);
    expect(resultado).toEqual([ACTIVA, BORRADOR]);
  });

  it('nunca consulta asignaturas INACTIVAS', () => {
    service.listarGestionables().subscribe();

    http.expectOne(`${URL}?estado=BORRADOR`).flush([]);
    http.expectOne(`${URL}?estado=ACTIVA`).flush([]);
    http.expectNone(`${URL}?estado=INACTIVA`);
  });

  it('propaga el error si falla cualquiera de las dos consultas', () => {
    let fallo = false;
    service.listarGestionables().subscribe({ error: () => (fallo = true) });

    http.expectOne(`${URL}?estado=BORRADOR`).flush(null, { status: 500, statusText: 'Error' });
    // forkJoin cancela la otra petición al fallar la primera.
    http.match(`${URL}?estado=ACTIVA`);
    expect(fallo).toBe(true);
  });
});
