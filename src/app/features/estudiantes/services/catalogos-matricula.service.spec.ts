import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { OpcionAsignatura, OpcionSemestre } from '../models/matricula.model';
import { CatalogosMatriculaService } from './catalogos-matricula.service';

const URL_ASIGNATURAS = `${environment.apiUrl}/v1/asignaturas`;
const URL_SEMESTRES = `${environment.apiUrl}/v1/semestres`;

describe('CatalogosMatriculaService', () => {
  let service: CatalogosMatriculaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogosMatriculaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista asignaturas con GET /v1/asignaturas y mapea al modelo local', () => {
    let resultado: OpcionAsignatura[] | undefined;
    service.listarAsignaturas().subscribe((r) => (resultado = r));

    const req = http.expectOne(URL_ASIGNATURAS);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: '00000000-0000-4000-c000-000000000030',
        codigo: 'CALC1',
        nombre: 'Cálculo I',
        programaId: '00000000-0000-4000-c000-000000000001',
        programaNombre: 'Ingeniería de Software',
        estado: 'ACTIVA',
        cantidadRa: 5,
      },
    ]);

    expect(resultado).toEqual([
      { id: '00000000-0000-4000-c000-000000000030', nombre: 'Cálculo I', estado: 'ACTIVA' },
    ]);
  });

  it('lista semestres con GET /v1/semestres y mapea al modelo local', () => {
    let resultado: OpcionSemestre[] | undefined;
    service.listarSemestres().subscribe((r) => (resultado = r));

    const req = http.expectOne(URL_SEMESTRES);
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: '00000000-0000-4000-c000-000000000040',
        codigo: '2026-1',
        fechaInicio: '2026-01-20',
        fechaFin: '2026-06-10',
        estado: 'ACTIVO',
      },
    ]);

    expect(resultado).toEqual([
      { id: '00000000-0000-4000-c000-000000000040', codigo: '2026-1', estado: 'ACTIVO' },
    ]);
  });

  it('una colección vacía se mapea a una lista vacía', () => {
    let asignaturas: OpcionAsignatura[] | undefined;
    let semestres: OpcionSemestre[] | undefined;
    service.listarAsignaturas().subscribe((r) => (asignaturas = r));
    service.listarSemestres().subscribe((r) => (semestres = r));

    http.expectOne(URL_ASIGNATURAS).flush([]);
    http.expectOne(URL_SEMESTRES).flush([]);

    expect(asignaturas).toEqual([]);
    expect(semestres).toEqual([]);
  });
});
