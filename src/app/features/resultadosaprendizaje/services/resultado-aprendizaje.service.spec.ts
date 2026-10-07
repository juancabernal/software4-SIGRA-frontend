import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { ResultadoAprendizaje } from '../models/resultado-aprendizaje.model';
import { ResultadoAprendizajeService } from './resultado-aprendizaje.service';

const API = `${environment.apiUrl}/v1`;
const ASIGNATURA_ID = '00000000-0000-4000-b000-000000000001';
const RA_ID = '00000000-0000-4000-c000-000000000001';

const RA: ResultadoAprendizaje = {
  id: RA_ID,
  asignaturaId: ASIGNATURA_ID,
  codigo: 'RA1',
  descripcion: 'Analiza requisitos de software.',
  estado: 'ACTIVO',
};

describe('ResultadoAprendizajeService', () => {
  let service: ResultadoAprendizajeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ResultadoAprendizajeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los RA de una asignatura con GET, sin filtro de estado', () => {
    let resultado: ResultadoAprendizaje[] | undefined;
    service.listarPorAsignatura(ASIGNATURA_ID).subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API}/asignaturas/${ASIGNATURA_ID}/resultados-aprendizaje`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([RA]);
    expect(resultado).toEqual([RA]);
  });

  it('crea con POST a la asignatura enviando solo código y descripción', () => {
    const cuerpo = { codigo: 'RA2', descripcion: 'Diseña la arquitectura.' };
    service.crear(ASIGNATURA_ID, cuerpo).subscribe();

    const req = http.expectOne(`${API}/asignaturas/${ASIGNATURA_ID}/resultados-aprendizaje`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush({ ...RA, ...cuerpo }, { status: 201, statusText: 'Created' });
  });

  it('actualiza la descripción con PUT enviando solo la descripción', () => {
    service.actualizarDescripcion(RA_ID, { descripcion: 'Nueva descripción.' }).subscribe();

    const req = http.expectOne(`${API}/resultados-aprendizaje/${RA_ID}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ descripcion: 'Nueva descripción.' });
    req.flush({ ...RA, descripcion: 'Nueva descripción.' });
  });

  it('inactiva con PATCH /inactivar sin cuerpo', () => {
    service.inactivar(RA_ID).subscribe();

    const req = http.expectOne(`${API}/resultados-aprendizaje/${RA_ID}/inactivar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    req.flush({ ...RA, estado: 'INACTIVO' });
  });

  it('reactiva con PATCH /reactivar sin cuerpo', () => {
    service.reactivar(RA_ID).subscribe();

    const req = http.expectOne(`${API}/resultados-aprendizaje/${RA_ID}/reactivar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    req.flush(RA);
  });

  it('codifica los identificadores en la URL', () => {
    service.inactivar('a/b').subscribe();

    const req = http.expectOne(`${API}/resultados-aprendizaje/a%2Fb/inactivar`);
    req.flush(RA);
  });
});
