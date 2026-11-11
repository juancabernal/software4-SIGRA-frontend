import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Rol } from '../../../core/models/rol';
import { SesionService } from '../../../core/services/sesion';
import { AsignaturaOpcion, SemestreOpcion } from '../models/evaluacion.model';
import { CatalogosEvaluacionService } from './catalogos-evaluacion.service';

const API = `${environment.apiUrl}/v1`;

describe('CatalogosEvaluacionService', () => {
  let service: CatalogosEvaluacionService;
  let http: HttpTestingController;
  const rol = signal<Rol | null>('admin');

  beforeEach(() => {
    rol.set('admin');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SesionService, useValue: { rol } },
      ],
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

  it('combina semestre y estado al consultar materias', () => {
    service.listarAsignaturasActivas('s1').subscribe();
    const req = http.expectOne(`${API}/asignaturas?estado=ACTIVA&semestreId=s1`);
    expect(req.request.params.get('estado')).toBe('ACTIVA');
    expect(req.request.params.get('semestreId')).toBe('s1');
    req.flush([]);
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

  it('al Profesor solo le pide los semestres en los que tiene asignaturas (Mantis 0000045)', () => {
    rol.set('profesor');
    let resultado: SemestreOpcion[] | undefined;
    service.listarSemestres().subscribe((r) => (resultado = r));

    http
      .expectOne(`${API}/semestres/mios`)
      .flush([{ id: 's1', codigo: '2026-2', fechaInicio: '2026-07-20', fechaFin: '2026-12-05' }]);
    http.expectNone(`${API}/semestres`);
    expect(resultado?.map((s) => s.codigo)).toEqual(['2026-2']);
  });
});
