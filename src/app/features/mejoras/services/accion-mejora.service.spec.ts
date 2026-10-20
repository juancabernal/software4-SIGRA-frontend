import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { AccionMejora } from '../models/accion-mejora.model';
import { AccionMejoraService } from './accion-mejora.service';

const URL_ACCIONES = `${environment.apiUrl}/v1/acciones-mejora`;
const URL_CONCLUSIONES = `${environment.apiUrl}/v1/conclusiones`;

const ACCION: AccionMejora = {
  id: 'am1',
  nombre: 'Taller de refuerzo',
  descripcion: 'Taller para reforzar integrales',
  fechaPropuesta: '2026-06-01',
  resultadoAprendizajeId: 'ra-1',
  resultadoAprendizajeCodigo: 'RA1',
  asignaturaId: 'a1',
  semestreId: 's1',
  semestreCodigo: '2026-1',
  conclusionOrigenId: 'c1',
  evaluacionGeneradaId: null,
  convertida: false,
};

describe('AccionMejoraService', () => {
  let service: AccionMejoraService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AccionMejoraService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('registrar', () => {
    it('hace POST a /conclusiones/{id}/acciones-mejora con el cuerpo correcto', () => {
      let resultado: AccionMejora | undefined;
      service
        .registrar('c1', { nombre: 'Taller de refuerzo', descripcion: 'Taller para reforzar integrales' })
        .subscribe((r) => (resultado = r));

      const req = http.expectOne(`${URL_CONCLUSIONES}/c1/acciones-mejora`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        nombre: 'Taller de refuerzo',
        descripcion: 'Taller para reforzar integrales',
      });
      req.flush(ACCION);
      expect(resultado).toEqual(ACCION);
    });
  });

  describe('listar', () => {
    it('arma los query params con resultadoAprendizajeId, semestreId y convertida', () => {
      service
        .listar({ resultadoAprendizajeId: 'ra-1', semestreId: 's1', convertida: true })
        .subscribe();

      const req = http.expectOne(
        (r) =>
          r.url === URL_ACCIONES &&
          r.params.get('resultadoAprendizajeId') === 'ra-1' &&
          r.params.get('semestreId') === 's1' &&
          r.params.get('convertida') === 'true',
      );
      expect(req.request.method).toBe('GET');
      req.flush([ACCION]);
    });

    it('no manda ningún query param cuando el filtro viene vacío', () => {
      service.listar().subscribe();

      const req = http.expectOne(URL_ACCIONES);
      expect(req.request.params.keys()).toEqual([]);
      req.flush([]);
    });

    it('no manda los params que no vienen en el filtro', () => {
      service.listar({ semestreId: 's1' }).subscribe();

      const req = http.expectOne((r) => r.url === URL_ACCIONES);
      expect(req.request.params.keys()).toEqual(['semestreId']);
      req.flush([]);
    });
  });

  describe('convertir', () => {
    it('hace POST a /acciones-mejora/{id}/conversion con el porcentaje', () => {
      let resultado: AccionMejora | undefined;
      service
        .convertir('am1', { fechaTentativa: '2026-06-10', porcentaje: 20 })
        .subscribe((r) => (resultado = r));

      const req = http.expectOne(`${URL_ACCIONES}/am1/conversion`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ fechaTentativa: '2026-06-10', porcentaje: 20 });
      const convertida = { ...ACCION, convertida: true, evaluacionGeneradaId: 'ev1' };
      req.flush(convertida);
      expect(resultado).toEqual(convertida);
    });
  });
});
