import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { RespuestaLogin } from '../models/sesion.model';
import { SessionService } from '../services/session.service';
import { ApiErrorService } from '../http/api-error.service';
import { apiErrorInterceptor } from './api-error.interceptor';
import { authInterceptor } from './auth.interceptor';

const API = `${environment.apiUrl}/v1`;
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature';
const RESPUESTA: RespuestaLogin = {
  token: TOKEN,
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: 'admin-1',
    nombreCompleto: 'Admin SIGRA',
    correoInstitucional: 'admin@uco.net.co',
    rol: 'ADMINISTRADOR',
  },
};

describe('interceptores HTTP de autenticación', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
    TestBed.inject(SessionService).saveSession(RESPUESTA);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('agrega Bearer solo a endpoints propios bajo /v1', () => {
    cliente.get(`${API}/estudiantes`).subscribe();
    expect(http.expectOne(`${API}/estudiantes`).request.headers.get('Authorization')).toBe(
      `Bearer ${TOKEN}`,
    );
  });

  it('no envía token al login, assets, otro host ni path parecido', () => {
    cliente.post(`${API}/auth/login`, {}).subscribe();
    cliente.get('/assets/logo.svg').subscribe();
    cliente.get('https://otro.example/api/v1/estudiantes').subscribe();
    cliente.get(`${environment.apiUrl}/v10/estudiantes`).subscribe();

    for (const request of http.match(() => true)) {
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  });

  it('no confunde un hostname ficticio ni un protocolo relativo con la API propia', () => {
    for (const url of [
      'http://sigra.local/api/v1/estudiantes',
      '//sigra.local/api/v1/estudiantes',
      'http://localhost:4300/api/v1/estudiantes',
      '/api/v10/estudiantes',
    ]) {
      cliente.get(url).subscribe();
    }

    for (const request of http.match(() => true)) {
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  });

  it('con origen explícito acepta solo el origen configurado y no otro puerto', () => {
    const absolutaMisma = new URL('/api/v1/estudiantes', new URL(environment.apiUrl).origin).toString();
    cliente.get('/api/v1/estudiantes?pagina=1').subscribe();
    cliente.get(absolutaMisma).subscribe();
    cliente.get(`${window.location.protocol}//${window.location.hostname}:4310/api/v1/estudiantes`).subscribe();

    const peticiones = http.match(() => true);
    expect(peticiones[0].request.headers.has('Authorization')).toBe(false);
    expect(peticiones[1].request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(peticiones[2].request.headers.has('Authorization')).toBe(false);
    peticiones.forEach((request) => request.flush({}));
  });
});

describe('apiErrorInterceptor', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;
  let router: Router;
  let navegar: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    TestBed.inject(SessionService).saveSession(RESPUESTA);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('limpia sesión y redirige una vez en 401 privado', async () => {
    let recibido = false;
    cliente.get(`${API}/estudiantes`).subscribe({ error: () => (recibido = true) });
    http.expectOne(`${API}/estudiantes`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();

    expect(recibido).toBe(true);
    expect(TestBed.inject(SessionService).hasSession()).toBe(false);
    expect(navegar).toHaveBeenCalledTimes(1);
    expect(router.serializeUrl(navegar.mock.calls[0][0] as ReturnType<Router['createUrlTree']>)).toContain(
      '/login?returnUrl=%2F',
    );
    expect(TestBed.inject(ApiErrorService).error()?.status).toBe(401);
  });

  it('conserva sesión y propaga el 403 al feature sin navegar', async () => {
    cliente.get(`${API}/estudiantes`).subscribe({ error: () => undefined });
    http.expectOne(`${API}/estudiantes`).flush({}, { status: 403, statusText: 'Forbidden' });
    await Promise.resolve();

    expect(TestBed.inject(SessionService).hasSession()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
    expect(TestBed.inject(ApiErrorService).error()?.status).toBe(403);
  });

  it('no borra el token B cuando una petición antigua con token A responde 401', async () => {
    const tokenB = TOKEN.replace(/signature$/, 'firmaB');
    const respuestaB = { ...RESPUESTA, token: tokenB };

    cliente.get(`${API}/estudiantes`).subscribe({ error: () => undefined });
    const peticionAntigua = http.expectOne(`${API}/estudiantes`);
    expect(peticionAntigua.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);

    TestBed.inject(SessionService).saveSession(respuestaB);
    peticionAntigua.flush({}, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();

    expect(TestBed.inject(SessionService).getToken()).toBe(tokenB);
    expect(navegar).not.toHaveBeenCalled();
  });
});
