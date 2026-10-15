import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Evaluacion } from '../models/evaluacion.model';
import { EvaluacionService } from './evaluacion.service';

const API = `${environment.apiUrl}/v1`;

const EVALUACION: Evaluacion = {
  id: 'ev-1',
  resultadoAprendizajeId: 'ra-1',
  semestreId: 's1',
  semestreCodigo: '2026-2',
  nombre: 'Parcial 1',
  fechaTentativa: '2026-09-15',
  porcentaje: 30,
  descripcion: 'Evaluación escrita.',
  estado: 'ACTIVA',
  tieneCalificaciones: false,
};

const DATOS = {
  nombre: 'Parcial 1',
  fechaTentativa: '2026-09-15',
  porcentaje: 30,
  descripcion: 'Evaluación escrita.',
};

describe('EvaluacionService', () => {
  let service: EvaluacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EvaluacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista las evaluaciones del RA en el semestre indicado', () => {
    service.listarPorResultadoAprendizaje('ra-1', 's1').subscribe();

    const req = http.expectOne(`${API}/resultados-aprendizaje/ra-1/evaluaciones?semestreId=s1`);
    expect(req.request.method).toBe('GET');
    req.flush({ evaluaciones: [] });
  });

  it('sin semestre no envía el parámetro (el backend usa el activo)', () => {
    service.listarPorResultadoAprendizaje('ra-1').subscribe();

    const req = http.expectOne(`${API}/resultados-aprendizaje/ra-1/evaluaciones`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ evaluaciones: [] });
  });

  it('crea con POST al RA', () => {
    service.crear('ra-1', DATOS).subscribe();

    const req = http.expectOne(`${API}/resultados-aprendizaje/ra-1/evaluaciones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(DATOS);
    req.flush(EVALUACION, { status: 201, statusText: 'Created' });
  });

  it('modifica con PUT enviando todos los campos', () => {
    service.modificar('ev-1', DATOS).subscribe();

    const req = http.expectOne(`${API}/evaluaciones/ev-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(DATOS);
    req.flush(EVALUACION);
  });

  it('inactiva y reactiva con PATCH sin cuerpo', () => {
    service.inactivar('ev-1').subscribe();
    service.reactivar('ev-1').subscribe();

    const inactivar = http.expectOne(`${API}/evaluaciones/ev-1/inactivar`);
    const reactivar = http.expectOne(`${API}/evaluaciones/ev-1/reactivar`);
    expect(inactivar.request.method).toBe('PATCH');
    expect(inactivar.request.body).toBeNull();
    expect(reactivar.request.method).toBe('PATCH');
    inactivar.flush({ ...EVALUACION, estado: 'INACTIVA' });
    reactivar.flush(EVALUACION);
  });
});
