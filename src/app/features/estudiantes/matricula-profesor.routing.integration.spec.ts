import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../app.routes';
import { RespuestaLogin } from '../../../app/core/models/sesion.model';
import { SessionService } from '../../../app/core/services/session.service';
import { environment } from '../../../environments/environment';

/**
 * El profesor accede a la vista de matrícula (RF-08, RF-09, D12).
 *
 * A diferencia de `estudiantes.routing.integration.spec.ts`, que usa un arreglo de rutas local,
 * esta prueba carga **`app.routes.ts` de verdad**: lo que se verifica es precisamente que la ruta
 * declarada ahí resuelva a la pantalla real y no al módulo pendiente, y eso solo tiene sentido
 * contra la tabla de rutas real, con su `loadComponent`.
 *
 * Las rutas de rol son hijas de `Shell`, así que `navigateByUrl` devuelve el `Shell`: la pantalla
 * se comprueba en el DOM que queda dentro de su `<router-outlet>`, no por el tipo que devuelve la
 * navegación.
 */

const URL_ASIGNATURAS = `${environment.apiUrl}/v1/asignaturas`;
const URL_SEMESTRES = `${environment.apiUrl}/v1/semestres`;
const RESPUESTA_PROFESOR: RespuestaLogin = {
  token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwfQ.signature',
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: '00000000-0000-4000-c000-000000000010',
    nombreCompleto: 'Profesor Bruno',
    correoInstitucional: 'profesor.bruno@uco.net.co',
    rol: 'PROFESOR',
  },
};
const RESPUESTA_ADMINISTRADOR: RespuestaLogin = {
  ...RESPUESTA_PROFESOR,
  usuario: {
    ...RESPUESTA_PROFESOR.usuario,
    nombreCompleto: 'Admin SIGRA',
    correoInstitucional: 'admin@uco.net.co',
    rol: 'ADMINISTRADOR',
  },
};

describe('Ruta profesor/matricula (Router real sobre app.routes.ts)', () => {
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
    TestBed.inject(SessionService).saveSession(RESPUESTA_PROFESOR);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  /** Navega y deja la pantalla de matriculados pintada, con sus catálogos resueltos. */
  async function abrir(url: string): Promise<HTMLElement> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush([]);
    http.expectOne((r) => r.url === URL_SEMESTRES).flush([]);
    await harness.fixture.whenStable();
    return harness.fixture.nativeElement as HTMLElement;
  }

  it('resuelve a la pantalla real de matriculados, no al módulo pendiente', async () => {
    const html = await abrir('/profesor/matricula');

    expect(html.querySelector('app-matriculados-page')).toBeTruthy();
    expect(html.querySelector('app-modulo-pendiente')).toBeNull();

    // Es la pantalla real: pide sus catálogos (ya resueltos arriba) y pinta sus filtros.
    expect(html.querySelector('#filtro-asignatura')).toBeTruthy();
    expect(html.querySelector('#filtro-semestre')).toBeTruthy();
    expect(html.textContent).toContain('Elige una asignatura y un semestre');
  });

  it('el profesor tiene a su alcance matricular y desvincular, igual que el administrador', async () => {
    const html = await abrir('/profesor/matricula');

    const matricular = Array.from(html.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Matricular',
    );
    expect(matricular).toBeTruthy();
    // El interruptor de inactivas también está: misma pantalla completa, no una recortada.
    expect(html.querySelector('.interruptor input')).toBeTruthy();
  });

  it('la ruta del administrador sigue resolviendo a la misma pantalla', async () => {
    const sesion = TestBed.inject(SessionService);
    sesion.clearSession();
    sesion.saveSession(RESPUESTA_ADMINISTRADOR);
    const html = await abrir('/admin/matricula');

    expect(html.querySelector('app-matriculados-page')).toBeTruthy();
    expect(html.querySelector('#filtro-asignatura')).toBeTruthy();
  });
});
