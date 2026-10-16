import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { AsignaturaOpcion, SemestreOpcion } from '../models/evaluacion.model';
import { CatalogosEvaluacionService } from './catalogos-evaluacion.service';

const API = `${environment.apiUrl}/v1`;

describe('CatalogosEvaluacionService', () => {
  let service: CatalogosEvaluacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogosEvaluacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista solo materias ACTIVAS, ordenadas por código', () => {
    let resultado: AsignaturaOpcion[] | undefined;
    service.listarAsignaturasActivas().subscribe((r) => (resultado = r));

    const materia = (codigo: string) =>
      ({ id: codigo, codigo, nombre: codigo, programaNombre: 'P', estado: 'ACTIVA' }) as const;
    http.expectOne(`${API}/asignaturas?estado=ACTIVA`).flush([materia('MAT2'), materia('MAT1')]);
    expect(resultado?.map((a) => a.codigo)).toEqual(['MAT1', 'MAT2']);
  });

  it('lista los semestres del más reciente al más antiguo', () => {
    let resultado: SemestreOpcion[] | undefined;
    service.listarSemestres().subscribe((r) => (resultado = r));

    const semestre = (codigo: string, fechaInicio: string) => ({
      id: codigo,
      codigo,
      fechaInicio,
      fechaFin: fechaInicio,
    });
    http
      .expectOne(`${API}/semestres`)
      .flush([semestre('2026-1', '2026-01-20'), semestre('2026-2', '2026-07-20')]);
    expect(resultado?.map((s) => s.codigo)).toEqual(['2026-2', '2026-1']);
  });
});
