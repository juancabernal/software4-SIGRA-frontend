import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { EstudianteMatriculado, Matricula, MatriculaRequest } from '../models/matricula.model';
import { MatriculaService } from './matricula.service';

const URL = `${environment.apiUrl}/v1/matriculas`;

const REQUEST: MatriculaRequest = {
  estudianteId: '00000000-0000-4000-c000-000000000010',
  asignaturaId: '00000000-0000-4000-c000-000000000030',
  semestreId: '00000000-0000-4000-c000-000000000040',
};

const MATRICULA: Matricula = {
  id: '00000000-0000-4000-c000-000000000050',
  ...REQUEST,
  estado: 'ACTIVO',
};

describe('MatriculaService', () => {
  let service: MatriculaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MatriculaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('matricula con POST /v1/matriculas enviando la terna exacta', () => {
    service.matricular(REQUEST).subscribe();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(REQUEST);
    req.flush(MATRICULA, { status: 201, statusText: 'Created' });
  });

  it('un 201 llega al suscriptor con status 201 (matrícula nueva)', () => {
    let respuesta: HttpResponse<Matricula> | undefined;
    service.matricular(REQUEST).subscribe((r) => (respuesta = r));

    const req = http.expectOne(URL);
    req.flush(MATRICULA, { status: 201, statusText: 'Created' });

    expect(respuesta?.status).toBe(201);
    expect(respuesta?.body).toEqual(MATRICULA);
  });

  it('un 200 llega al suscriptor con status 200 (matrícula reactivada)', () => {
    let respuesta: HttpResponse<Matricula> | undefined;
    service.matricular(REQUEST).subscribe((r) => (respuesta = r));

    const req = http.expectOne(URL);
    req.flush(MATRICULA, { status: 200, statusText: 'OK' });

    expect(respuesta?.status).toBe(200);
    expect(respuesta?.body).toEqual(MATRICULA);
  });

  it('desvincula con DELETE /v1/matriculas/{matriculaId}', () => {
    service.desvincular(MATRICULA.id).subscribe();

    const req = http.expectOne(`${URL}/${MATRICULA.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('lista matriculados enviando siempre asignaturaId y semestreId, sin incluirInactivas por omisión', () => {
    let resultado: EstudianteMatriculado[] | undefined;
    service
      .listarMatriculados(REQUEST.asignaturaId, REQUEST.semestreId)
      .subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('asignaturaId')).toBe(REQUEST.asignaturaId);
    expect(req.request.params.get('semestreId')).toBe(REQUEST.semestreId);
    expect(req.request.params.has('incluirInactivas')).toBe(false);

    const fila: EstudianteMatriculado = {
      matriculaId: MATRICULA.id,
      numeroDocumento: '1234567890',
      nombreCompleto: 'Ana María Gómez',
      estado: 'ACTIVO',
    };
    req.flush([fila]);
    expect(resultado).toEqual([fila]);
  });

  it('manda incluirInactivas solo cuando se pide true', () => {
    service.listarMatriculados(REQUEST.asignaturaId, REQUEST.semestreId, true).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('incluirInactivas')).toBe('true');
    req.flush([]);
  });
});
