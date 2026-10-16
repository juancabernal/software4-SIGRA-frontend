import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { ResultadoAsignacionMasiva } from '../models/asignacion-docente.model';
import { AsignacionDocenteService } from './asignacion-docente.service';

const URL = `${environment.apiUrl}/v1/asignaciones-docentes`;

const RESULTADO: ResultadoAsignacionMasiva = {
  creadas: [
    {
      id: '00000000-0000-4000-a000-000000000001',
      profesorId: '00000000-0000-4000-a000-000000000002',
      nombreProfesor: 'Profesor de Prueba',
      asignaturaId: '00000000-0000-4000-a000-000000000003',
      codigoAsignatura: 'MAT101',
      nombreAsignatura: 'Cálculo',
      estado: 'ACTIVO',
      fechaAsignacion: '2026-10-16',
    },
  ],
  omitidas: [],
  rechazadas: [],
};

describe('AsignacionDocenteService', () => {
  let service: AsignacionDocenteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AsignacionDocenteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asigna con POST /v1/asignaciones-docentes enviando los ids elegidos', () => {
    let resultado: ResultadoAsignacionMasiva | undefined;
    service
      .asignarMasivo({ profesorIds: ['p1', 'p2'], asignaturaIds: ['a1'] })
      .subscribe((r) => (resultado = r));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ profesorIds: ['p1', 'p2'], asignaturaIds: ['a1'] });
    req.flush(RESULTADO);
    expect(resultado).toEqual(RESULTADO);
  });

  it('desasigna con PATCH en /{id}/desasignar', () => {
    service.desasignar('abc').subscribe();

    const req = http.expectOne(`${URL}/abc/desasignar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });
});
