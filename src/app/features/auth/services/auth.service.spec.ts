import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.model';
import { AuthService } from './auth.service';

const URL = `${environment.apiUrl}/v1/auth/login`;

const SOLICITUD: LoginRequest = {
  correoInstitucional: 'profesor.bruno@uco.net.co',
  contrasena: 'PasswordSeguro123*',
};

const RESPUESTA: LoginResponse = {
  token: 'jwt-de-prueba',
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: '00000000-0000-4000-c000-000000000010',
    nombreCompleto: 'Profesor Bruno',
    correoInstitucional: 'profesor.bruno@uco.net.co',
    rol: 'PROFESOR',
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('hace POST a /v1/auth/login enviando exactamente correoInstitucional y contrasena', () => {
    service.login(SOLICITUD).subscribe();

    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      correoInstitucional: 'profesor.bruno@uco.net.co',
      contrasena: 'PasswordSeguro123*',
    });
    req.flush(RESPUESTA);
  });

  it('interpreta la respuesta 200 como LoginResponse', () => {
    let respuesta: LoginResponse | undefined;
    service.login(SOLICITUD).subscribe((r) => (respuesta = r));

    http.expectOne(URL).flush(RESPUESTA);

    expect(respuesta).toEqual(RESPUESTA);
  });

  it('no modifica la contraseña (espacios y mayúsculas se conservan)', () => {
    const contrasena = '  Mi Clave*  ';
    service.login({ ...SOLICITUD, contrasena }).subscribe();

    const req = http.expectOne(URL);
    expect(req.request.body.contrasena).toBe(contrasena);
    req.flush(RESPUESTA);
  });

  it.each([
    [400, 'Datos de entrada inválidos'],
    [401, 'Correo o contraseña incorrectos'],
    [423, 'Usuario bloqueado temporalmente'],
  ])('propaga el status %i sin transformarlo', (status, mensaje) => {
    let error: HttpErrorResponse | undefined;
    service.login(SOLICITUD).subscribe({ error: (e: HttpErrorResponse) => (error = e) });

    http.expectOne(URL).flush({ status, error: 'ERROR', mensaje }, { status, statusText: 'Error' });

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect(error?.status).toBe(status);
  });
});
