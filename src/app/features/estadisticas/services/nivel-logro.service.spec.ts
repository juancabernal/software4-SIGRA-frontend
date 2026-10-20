import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { EstadisticasResultadoAprendizaje, RangoNivelLogro } from '../models/nivel-logro.model';
import { NivelLogroService } from './nivel-logro.service';

const API = `${environment.apiUrl}/v1`;
const URL_ESTADISTICAS = `${API}/resultados-aprendizaje/ra-1/semestres/s1/estadisticas`;

const ESTADISTICAS: EstadisticasResultadoAprendizaje = {
  resultadoAprendizajeId: 'ra-1',
  codigoResultadoAprendizaje: 'RA1',
  asignaturaId: 'a1',
  semestreId: 's1',
  codigoSemestre: '2026-2',
  totalEstudiantes: 10,
  evaluados: 8,
  sinDatosSuficientes: 1,
  sinEvaluar: 1,
  promedioNota: 3.6,
  promedioPorcentaje: 72,
  distribucion: [
    { nivel: 'BAJO', cantidad: 2, porcentaje: 25 },
    { nivel: 'MEDIO', cantidad: 3, porcentaje: 37.5 },
    { nivel: 'ALTO', cantidad: 2, porcentaje: 25 },
    { nivel: 'SOBRESALIENTE', cantidad: 1, porcentaje: 12.5 },
  ],
  fechaCalculo: '2026-10-17T10:00:00',
};

describe('NivelLogroService', () => {
  let service: NivelLogroService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NivelLogroService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta las estadísticas con GET .../estadisticas', () => {
    let resultado: EstadisticasResultadoAprendizaje | undefined;
    service.consultarEstadisticas('ra-1', 's1').subscribe((r) => (resultado = r));

    const req = http.expectOne(URL_ESTADISTICAS);
    expect(req.request.method).toBe('GET');
    req.flush(ESTADISTICAS);
    expect(resultado).toEqual(ESTADISTICAS);
  });

  it('recalcula con POST .../estadisticas/recalculo sin cuerpo', () => {
    service.recalcular('ra-1', 's1').subscribe();

    const req = http.expectOne(`${URL_ESTADISTICAS}/recalculo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ estadisticas: ESTADISTICAS, conclusion: null });
  });

  it('consulta el catálogo con GET /v1/niveles-logro', () => {
    const catalogo: RangoNivelLogro[] = [
      { nivel: 'BAJO', notaMinima: 0, notaLimite: 3, limiteIncluido: false },
    ];
    let resultado: RangoNivelLogro[] | undefined;
    service.consultarCatalogo().subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API}/niveles-logro`);
    expect(req.request.method).toBe('GET');
    req.flush(catalogo);
    expect(resultado).toEqual(catalogo);
  });
});
