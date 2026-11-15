import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { TrazabilidadUsoService } from './trazabilidad-uso.service';

describe('TrazabilidadUsoService', () => {
  let service: TrazabilidadUsoService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/v1/reportes/trazabilidad-uso`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrazabilidadUsoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el reporte general sin parámetros por defecto', () => {
    service.consultarGeneral().subscribe();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({} as never);
  });

  it('envía semestre, fechas y rol al reporte general', () => {
    service
      .consultarGeneral({ semestreId: 's1', desde: '2026-11-01', hasta: '2026-11-15', rol: 'PROFESOR' })
      .subscribe();
    const request = http.expectOne((r) => r.url === url);
    expect(request.request.params.get('semestreId')).toBe('s1');
    expect(request.request.params.get('desde')).toBe('2026-11-01');
    expect(request.request.params.get('hasta')).toBe('2026-11-15');
    expect(request.request.params.get('rol')).toBe('PROFESOR');
    request.flush({} as never);
  });

  it('la vista del profesor usa su propia ruta y nunca envía el rol', () => {
    service.consultarProfesor({ semestreId: 's1', rol: 'ESTUDIANTE' }).subscribe();
    const request = http.expectOne((r) => r.url === `${url}/profesor`);
    expect(request.request.params.keys()).toEqual(['semestreId']);
    request.flush({} as never);
  });
});
