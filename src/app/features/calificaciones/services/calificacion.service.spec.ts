import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Calificacion } from '../models/calificacion.model';
import { CalificacionService } from './calificacion.service';

const API = `${environment.apiUrl}/v1`;

const CALIFICACION: Calificacion = {
  id: 'c1',
  evaluacionId: 'e1',
  matriculaId: 'm1',
  estudianteId: 'u1',
  estudianteNombre: 'Ana Gómez',
  nota: 4.5,
  observacion: 'Buen desarrollo del parcial',
  fechaRegistro: '2026-10-15T10:00:00',
  fechaModificacion: null,
  fueraDeFecha: false,
};

describe('CalificacionService', () => {
  let service: CalificacionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CalificacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide la planilla con GET /v1/evaluaciones/{id}/calificaciones', () => {
    service.planilla('e1').subscribe();

    const req = http.expectOne(`${API}/evaluaciones/e1/calificaciones`);
    expect(req.request.method).toBe('GET');
    req.flush({ filas: [] });
  });

  it('registra con POST a la evaluación y envía matrícula, nota y observación', () => {
    let resultado: Calificacion | undefined;
    service
      .registrar('e1', { matriculaId: 'm1', nota: 4.5, observacion: 'Buen desarrollo del parcial' })
      .subscribe((r) => (resultado = r));

    const req = http.expectOne(`${API}/evaluaciones/e1/calificaciones`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      matriculaId: 'm1',
      nota: 4.5,
      observacion: 'Buen desarrollo del parcial',
    });
    req.flush(CALIFICACION);
    expect(resultado).toEqual(CALIFICACION);
  });

  it('modifica con PUT /v1/calificaciones/{id}', () => {
    service.modificar('c1', { nota: 4, observacion: 'Ajuste tras la revisión' }).subscribe();

    const req = http.expectOne(`${API}/calificaciones/c1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nota: 4, observacion: 'Ajuste tras la revisión' });
    req.flush(CALIFICACION);
  });

  it('consulta el historial con GET /v1/calificaciones/{id}/historial', () => {
    service.historial('c1').subscribe();

    const req = http.expectOne(`${API}/calificaciones/c1/historial`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('codifica el id en la URL', () => {
    service.modificar('a/b', { nota: 1, observacion: 'Observación válida' }).subscribe();

    http.expectOne(`${API}/calificaciones/a%2Fb`).flush(CALIFICACION);
  });
});