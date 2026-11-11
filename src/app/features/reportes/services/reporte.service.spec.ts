import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { RendimientoRaReporte } from '../models/rendimiento-ra.model';
import { ReporteService } from './reporte.service';

const URL = `${environment.apiUrl}/v1/reportes/rendimiento-ra`;
const VACIO: RendimientoRaReporte = {
  semestreId: null,
  semestreCodigo: null,
  asignaturas: [],
  mensaje: 'Sin datos disponibles',
};

describe('ReporteService', () => {
  let service: ReporteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReporteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta GET /v1/reportes/rendimiento-ra sin parámetros cuando no hay filtros', () => {
    let resultado: RendimientoRaReporte | undefined;
    service.rendimientoRa().subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(VACIO);
    expect(resultado).toEqual(VACIO);
  });

  it('envía solo los filtros con valor', () => {
    service.rendimientoRa({ semestreId: 's1', programaId: '', asignaturaId: 'a1' }).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('semestreId')).toBe('s1');
    expect(req.request.params.get('asignaturaId')).toBe('a1');
    expect(req.request.params.has('programaId')).toBe(false);
    req.flush(VACIO);
  });
});
