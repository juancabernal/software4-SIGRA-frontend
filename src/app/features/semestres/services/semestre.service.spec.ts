import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { Semestre } from '../models/semestre.model';
import { mensajeDeError } from './semestre-error';
import { SemestreService } from './semestre.service';

const URL = `${environment.apiUrl}/v1/semestres`;

const SEMESTRE: Semestre = {
  id: '00000000-0000-4000-c000-000000000002',
  codigo: '2090-1',
  fechaInicio: '2090-01-20',
  fechaFin: '2090-06-10',
  estado: 'INACTIVO',
};

describe('SemestreService', () => {
  let service: SemestreService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SemestreService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista con GET /v1/semestres', () => {
    let resultado: Semestre[] | undefined;
    service.listar().subscribe((r) => (resultado = r));

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('GET');
    req.flush([SEMESTRE]);
    expect(resultado).toEqual([SEMESTRE]);
  });

  it('consulta por código con GET /v1/semestres/{codigo}', () => {
    service.consultarPorCodigo('2090-1').subscribe();

    const req = http.expectOne(`${URL}/2090-1`);
    expect(req.request.method).toBe('GET');
    req.flush(SEMESTRE);
  });

  it('crea con POST y envía solo código y fechas', () => {
    const cuerpo = { codigo: '2098-1', fechaInicio: '2098-01-20', fechaFin: '2098-06-10' };
    service.crear(cuerpo).subscribe();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cuerpo);
    req.flush({ ...SEMESTRE, ...cuerpo, id: 'nuevo' }, { status: 201, statusText: 'Created' });
  });

  it('extiende con PATCH /v1/semestres/{codigo} enviando solo fechaFin', () => {
    service.extenderFechaFin('2090-1', { fechaFin: '2090-06-30' }).subscribe();

    const req = http.expectOne(`${URL}/2090-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ fechaFin: '2090-06-30' });
    req.flush({ ...SEMESTRE, fechaFin: '2090-06-30' });
  });
});

describe('mensajeDeError', () => {
  const error = (status: number, cuerpo: unknown) =>
    new HttpErrorResponse({ status, error: cuerpo, url: URL });

  it('usa el mensaje del backend en errores de negocio', () => {
    const resultado = mensajeDeError(
      error(409, { status: 409, error: 'CONFLICT', mensaje: 'Ya existe un semestre con el código 2090-1' }),
    );
    expect(resultado).toEqual({ mensaje: 'Ya existe un semestre con el código 2090-1', detalles: [] });
  });

  it('muestra los detalles de validación sin el nombre del campo', () => {
    const resultado = mensajeDeError(
      error(400, {
        mensaje: 'Los datos de entrada no cumplen con las validaciones requeridas',
        detalles: ['codigo: El código debe tener el formato AAAA-1 o AAAA-2'],
      }),
    );
    expect(resultado.detalles).toEqual(['El código debe tener el formato AAAA-1 o AAAA-2']);
  });

  it('no expone el cuerpo de un 500', () => {
    const resultado = mensajeDeError(
      error(500, { mensaje: 'Ocurrió un error', detalles: 'could not execute statement; SQL [...]' }),
    );
    expect(resultado.detalles).toEqual([]);
    expect(resultado.mensaje).not.toContain('SQL');
  });

  it('explica cuando no hay conexión con el backend', () => {
    expect(mensajeDeError(error(0, null)).mensaje).toContain('No se pudo conectar con el servidor');
  });
});
