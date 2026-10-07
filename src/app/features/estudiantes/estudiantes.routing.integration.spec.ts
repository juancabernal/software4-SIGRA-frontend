import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { environment } from '../../../environments/environment';
import { EstudianteDetallePage } from './components/estudiante-detalle-page/estudiante-detalle-page';
import { EstudiantesPage } from './components/estudiantes-page/estudiantes-page';
import { Estudiante } from './models/estudiante.model';

/**
 * Prueba de integración 4 (ver design.md): navegar de `EstudiantesPage` al detalle de un
 * estudiante con el `Router` real. El arreglo de rutas es mínimo y local a este archivo (no
 * `app.routes.ts` completo) para no romperse si otra feature agrega rutas; usa los componentes
 * reales, no `loadComponent`, porque aquí no interesa probar la carga diferida.
 */

const URL_ESTUDIANTES = `${environment.apiUrl}/v1/estudiantes`;

const ANA: Estudiante = {
  id: 'e1',
  tipoDocumentoNombre: 'Cédula de ciudadanía',
  numeroDocumento: '1234567890',
  nombreCompleto: 'Ana María Gómez',
  correoInstitucional: 'ana@uco.net.co',
  estado: 'ACTIVO',
};

const RUTAS: Routes = [
  { path: 'admin/estudiantes', component: EstudiantesPage },
  { path: 'admin/estudiantes/:id', component: EstudianteDetallePage },
];

describe('Navegación de EstudiantesPage a EstudianteDetallePage (Router real)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(RUTAS, withComponentInputBinding()),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('al activar "Ver ficha" la URL cambia y EstudianteDetallePage recibe el id correcto', async () => {
    const harness = await RouterTestingHarness.create('/admin/estudiantes');
    http.expectOne((r) => r.url === URL_ESTUDIANTES && r.method === 'GET').flush([ANA]);
    await harness.fixture.whenStable();

    const htmlListado = harness.routeNativeElement as HTMLElement;
    const enlace = htmlListado.querySelector(
      `a[aria-label="Ver ficha de ${ANA.nombreCompleto}"]`,
    ) as HTMLAnchorElement;
    expect(enlace).toBeTruthy();

    enlace.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe(`/admin/estudiantes/${ANA.id}`);
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(EstudianteDetallePage);
    const detalle = harness.routeDebugElement!.componentInstance as EstudianteDetallePage;
    expect(detalle.id()).toBe(ANA.id);

    http.expectOne((r) => r.url === `${URL_ESTUDIANTES}/${ANA.id}`).flush(ANA);
    await harness.fixture.whenStable();
    http.expectOne((r) => r.url === `${URL_ESTUDIANTES}/${ANA.id}/asignaturas`).flush([]);
    await harness.fixture.whenStable();

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      ANA.nombreCompleto,
    );
  });
});
