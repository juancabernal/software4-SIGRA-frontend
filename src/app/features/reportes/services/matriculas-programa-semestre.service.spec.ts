import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { MatriculasProgramaSemestreService } from './matriculas-programa-semestre.service';

describe('MatriculasProgramaSemestreService', () => {
  let service: MatriculasProgramaSemestreService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/v1/reportes/matriculas-programa-semestre`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MatriculasProgramaSemestreService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('usa GET y no envía parámetros sin filtros', () => {
    service.listar().subscribe();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({} as never);
  });

  it('envía únicamente semestreId', () => {
    service.listar({ semestreId: 's1' }).subscribe();
    const request = http.expectOne((r) => r.url === url);
    expect(request.request.params.keys()).toEqual(['semestreId']);
    expect(request.request.params.get('semestreId')).toBe('s1');
    request.flush({} as never);
  });

  it('envía únicamente programaId', () => {
    service.listar({ programaId: 'p1' }).subscribe();
    const request = http.expectOne((r) => r.url === url);
    expect(request.request.params.keys()).toEqual(['programaId']);
    expect(request.request.params.get('programaId')).toBe('p1');
    request.flush({} as never);
  });

  it('envía únicamente facultadId', () => {
    service.listar({ facultadId: 'f1' }).subscribe();
    const request = http.expectOne((r) => r.url === url);
    expect(request.request.params.keys()).toEqual(['facultadId']);
    expect(request.request.params.get('facultadId')).toBe('f1');
    request.flush({} as never);
  });
});
