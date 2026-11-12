import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { environment } from '../../../environments/environment';
import { routes } from '../../app.routes';
import { RespuestaLogin } from '../../core/models/sesion.model';
import { SessionService } from '../../core/services/session.service';

const API = `${environment.apiUrl}/v1/estudiantes/me`;
const token = 'eyJhbGciOiJub25lIn0.eyJleHAiOjQxMDI0NDQ4MDB9.firma';
const BASE: RespuestaLogin = {
  token,
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: 'student-1',
    nombreCompleto: 'Usuario Estudiante',
    correoInstitucional: 'estudiante@uco.net.co',
    rol: 'ESTUDIANTE',
  },
};

describe('rutas reales del módulo Estudiante', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes, withComponentInputBinding()),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  async function abrir(ruta: string): Promise<HTMLElement> {
    TestBed.inject(SessionService).saveSession(BASE);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(ruta);
    const request = http.match(() => true)[0];
    request.flush(ruta.includes('/materias/') ? { resultadosAprendizaje: [] } : []);
    await harness.fixture.whenStable();
    return harness.fixture.nativeElement as HTMLElement;
  }

  it('carga Mis materias', async () => {
    const html = await abrir('/estudiante/materias');
    expect(html.querySelector('app-mis-materias-page')).toBeTruthy();
  });

  it('carga Mi progreso', async () => {
    const html = await abrir('/estudiante/progreso');
    expect(html.querySelector('app-mi-progreso-page')).toBeTruthy();
  });

  it('carga Mi historial', async () => {
    const html = await abrir('/estudiante/historial');
    expect(html.querySelector('app-mi-historial-page')).toBeTruthy();
  });

  it('carga el detalle de materia', async () => {
    const html = await abrir('/estudiante/materias/00000000-0000-4000-8000-000000000001');
    expect(html.querySelector('app-materia-detalle-page')).toBeTruthy();
  });

  it('rechaza Profesor y Administrador', async () => {
    const harness = await RouterTestingHarness.create();
    sessionStorage.clear();
    TestBed.inject(SessionService).saveSession({
      ...BASE,
      usuario: { ...BASE.usuario, rol: 'PROFESOR' },
    });
    await harness.navigateByUrl('/estudiante/materias?rol=profesor');
    expect(router.url).toBe('/acceso-denegado?returnUrl=%2Festudiante%2Fmaterias%3Frol%3Dprofesor');
    sessionStorage.clear();
    TestBed.inject(SessionService).saveSession({
      ...BASE,
      usuario: { ...BASE.usuario, rol: 'ADMINISTRADOR' },
    });
    await harness.navigateByUrl('/estudiante/materias?rol=admin');
    expect(router.url).toBe('/acceso-denegado?returnUrl=%2Festudiante%2Fmaterias%3Frol%3Dadmin');
  });

  it('redirige a login sin sesión', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/estudiante/materias');
    expect(router.url).toContain('/login?returnUrl=');
  });
});
