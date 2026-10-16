import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { environment } from '../../../environments/environment';
import { routes } from '../../app.routes';
import { RespuestaLogin } from '../../core/models/sesion.model';
import { SessionService } from '../../core/services/session.service';

const URL_MIAS = `${environment.apiUrl}/v1/asignaturas/mias`;
function tokenDePrueba(): string {
  const codificar = (valor: object) =>
    btoa(JSON.stringify(valor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${codificar({ alg: 'none' })}.${codificar({ sub: 'qa', exp: 4102444800 })}.firma-de-prueba`;
}

const BASE: RespuestaLogin = {
  token: tokenDePrueba(),
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: '00000000-0000-4000-c000-000000000010',
    nombreCompleto: 'Usuario QA',
    correoInstitucional: 'usuario.qa@uco.net.co',
    rol: 'PROFESOR',
  },
};

const ASIGNATURA = {
  id: 'a1',
  codigo: 'QA-VEC3B41597D',
  nombre: 'Álgebra QA',
  programaId: 'p1',
  programaNombre: 'Ingeniería de Sistemas',
  estado: 'ACTIVA',
  cantidadRa: 5,
  cantidadEstudiantes: 6,
  profesores: ['Profesor Uno'],
};

describe('rutas reales de mis asignaturas y materias', () => {
  let http: HttpTestingController;

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
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  async function abrir(rol: 'PROFESOR' | 'ESTUDIANTE', ruta: string): Promise<HTMLElement> {
    TestBed.inject(SessionService).saveSession({
      ...BASE,
      usuario: { ...BASE.usuario, rol },
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(ruta);
    http.expectOne(URL_MIAS).flush([ASIGNATURA]);
    await harness.fixture.whenStable();
    return harness.fixture.nativeElement as HTMLElement;
  }

  it('el profesor llega a la pantalla real y no a ModuloPendiente', async () => {
    const html = await abrir('PROFESOR', '/profesor/asignaturas');

    expect(html.querySelector('app-mis-asignaturas-page')).toBeTruthy();
    expect(html.querySelector('app-modulo-pendiente')).toBeNull();
    expect(html.textContent).toContain('QA-VEC3B41597D');
  });

  it('el estudiante llega a Mis materias con modo de solo lectura', async () => {
    const html = await abrir('ESTUDIANTE', '/estudiante/materias');

    expect(html.querySelector('app-mis-asignaturas-page')).toBeTruthy();
    expect(html.textContent).toContain('Mis materias');
    expect(html.textContent).toContain('Solo lectura');
  });
});
