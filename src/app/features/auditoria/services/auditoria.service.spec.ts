import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { AuditoriaService } from './auditoria.service';

const URL = `${environment.apiUrl}/v1/auditoria`;

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditoriaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sin filtros envía solo la paginación', () => {
    service.consultar({}, 0, 10).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['pagina', 'tamano']);
    expect(req.request.params.get('pagina')).toBe('0');
    expect(req.request.params.get('tamano')).toBe('10');
    req.flush({ contenido: [], pagina: 0, tamano: 10, totalElementos: 0, totalPaginas: 0 });
  });

  it('envía el rango de fechas y el tipo de entidad cuando tienen valor', () => {
    service
      .consultar({ desde: '2026-10-01', hasta: '2026-10-20', tipoEntidad: 'CALIFICACION' }, 2, 25)
      .subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('desde')).toBe('2026-10-01');
    expect(req.request.params.get('hasta')).toBe('2026-10-20');
    expect(req.request.params.get('tipoEntidad')).toBe('CALIFICACION');
    expect(req.request.params.get('pagina')).toBe('2');
    req.flush({ contenido: [], pagina: 2, tamano: 25, totalElementos: 0, totalPaginas: 0 });
  });
});