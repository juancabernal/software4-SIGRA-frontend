import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Conclusion } from '../models/conclusion.model';
import { ConclusionService } from './conclusion.service';

const URL = `${environment.apiUrl}/v1/conclusiones`;

const CONCLUSION: Conclusion = {
  id: 'c1',
  resultadoAprendizajeId: 'ra-1',
  resultadoAprendizajeCodigo: 'RA1',
  asignaturaId: 'a1',
  semestreId: 's1',
  semestreCodigo: '2026-1',
  mensaje: 'Más del 40% de los estudiantes no alcanzó el RA.',
  tieneDatosSuficientes: true,
  fechaGeneracion: '2026-06-01',
  porcentajeInsuficiente: 45,
  estado: 'VIGENTE',
};

describe('ConclusionService', () => {
  let service: ConclusionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConclusionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista sin filtros con GET /v1/conclusiones y sin parámetros', () => {
    let resultado: Conclusion[] | undefined;
    service.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([CONCLUSION]);
    expect(resultado).toEqual([CONCLUSION]);
  });

  it('envía los filtros con valor como query params', () => {
    service
      .listar({ resultadoAprendizajeId: 'ra-1', semestreId: 's1', estado: 'VIGENTE' })
      .subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.urlWithParams).toBe(
      `${URL}?resultadoAprendizajeId=ra-1&semestreId=s1&estado=VIGENTE`,
    );
    req.flush([]);
  });

  it('envía también asignaturaId cuando se incluye', () => {
    service.listar({ asignaturaId: 'a1' }).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.urlWithParams).toBe(`${URL}?asignaturaId=a1`);
    req.flush([]);
  });

  it('omite los filtros sin valor', () => {
    service
      .listar({ resultadoAprendizajeId: undefined, semestreId: '', asignaturaId: undefined })
      .subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('devuelve la lista mapeada tal cual la entrega el backend', () => {
    let resultado: Conclusion[] | undefined;
    service.listar({ semestreId: 's1' }).subscribe((r) => (resultado = r));

    http.expectOne((r) => r.url === URL).flush([CONCLUSION]);
    expect(resultado).toEqual([CONCLUSION]);
  });
});
