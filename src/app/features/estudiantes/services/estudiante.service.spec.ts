import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Estudiante, EstudianteRequest } from '../models/estudiante.model';
import { AsignaturaDeEstudiante } from '../models/matricula.model';
import { EstudianteService } from './estudiante.service';

const URL = `${environment.apiUrl}/v1/estudiantes`;

const ESTUDIANTE: Estudiante = {
  id: '00000000-0000-4000-c000-000000000010',
  tipoDocumentoNombre: 'Cédula de ciudadanía',
  numeroDocumento: '1234567890',
  nombreCompleto: 'Ana María Gómez',
  correoInstitucional: 'ana@uco.net.co',
  estado: 'ACTIVO',
};

const REQUEST: EstudianteRequest = {
  tipoDocumentoId: '00000000-0000-4000-c000-000000000099',
  numeroDocumento: '1234567890',
  nombreCompleto: 'Ana María Gómez',
  correoInstitucional: 'ana@uco.net.co',
};

describe('EstudianteService', () => {
  let service: EstudianteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EstudianteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registra con POST /v1/estudiantes', () => {
    let resultado: Estudiante | undefined;
    service.registrar(REQUEST).subscribe((r) => (resultado = r));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(REQUEST);
    req.flush(ESTUDIANTE, { status: 201, statusText: 'Created' });
    expect(resultado).toEqual(ESTUDIANTE);
  });

  it('lista sin filtro con GET /v1/estudiantes sin el parámetro filtro', () => {
    let resultado: Estudiante[] | undefined;
    service.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('filtro')).toBe(false);
    req.flush([ESTUDIANTE]);
    expect(resultado).toEqual([ESTUDIANTE]);
  });

  it('lista con filtro manda el parámetro filtro', () => {
    service.listar('ana').subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('filtro')).toBe('ana');
    req.flush([ESTUDIANTE]);
  });

  it('consulta por id con GET /v1/estudiantes/{id}', () => {
    service.consultarPorId(ESTUDIANTE.id).subscribe();

    const req = http.expectOne(`${URL}/${ESTUDIANTE.id}`);
    expect(req.request.method).toBe('GET');
    req.flush(ESTUDIANTE);
  });

  it('modifica con PUT /v1/estudiantes/{id}', () => {
    service.modificar(ESTUDIANTE.id, REQUEST).subscribe();

    const req = http.expectOne(`${URL}/${ESTUDIANTE.id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(REQUEST);
    req.flush(ESTUDIANTE);
  });

  it('inactiva con DELETE /v1/estudiantes/{id}', () => {
    service.inactivar(ESTUDIANTE.id).subscribe();

    const req = http.expectOne(`${URL}/${ESTUDIANTE.id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('consulta el historial con GET /v1/estudiantes/{id}/asignaturas', () => {
    const historial: AsignaturaDeEstudiante[] = [
      {
        matriculaId: '00000000-0000-4000-c000-000000000020',
        asignaturaNombre: 'Cálculo I',
        semestreCodigo: '2026-1',
        estado: 'ACTIVO',
      },
    ];
    let resultado: AsignaturaDeEstudiante[] | undefined;
    service.asignaturasDe(ESTUDIANTE.id).subscribe((r) => (resultado = r));

    const req = http.expectOne(`${URL}/${ESTUDIANTE.id}/asignaturas`);
    expect(req.request.method).toBe('GET');
    req.flush(historial);
    expect(resultado).toEqual(historial);
  });
});
