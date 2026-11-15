import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { SesionService } from '../../../../core/services/sesion';
import { HistorialAuditoriaPage } from './historial-auditoria-page';

const URL = `${environment.apiUrl}/v1/auditoria`;

const PAGINA = {
  contenido: [
    {
      id: '4b64b64b-4b64-4b64-8b64-4b64b64b64b6',
      fechaHora: '2026-10-20T14:35:12.123',
      accion: 'CAMBIO_ESTADO',
      tipoEntidad: 'CALIFICACION',
      idEntidad: '5c75c75c-5c75-5c75-9c75-5c75c75c75c7',
      usuarioId: '6d86d86d-6d86-6d86-ad86-6d86d86d86d8',
      rolUsuario: 'PROFESOR',
      detalle: 'Nota modificada',
    },
  ],
  pagina: 0,
  tamano: 10,
  totalElementos: 1,
  totalPaginas: 1,
};

function montar(rol: 'profesor' | 'administrador') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: SesionService, useValue: { rol: () => rol } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(HistorialAuditoriaPage);
  fixture.detectChanges();
  return { http, fixture, html: fixture.nativeElement as HTMLElement };
}

describe('HistorialAuditoriaPage', () => {
  it('el profesor consulta solo sus eventos, ve «Mi historial» y no ve la columna Usuario', async () => {
    const { http, fixture, html } = montar('profesor');

    http.expectOne((r) => r.url === `${URL}/mis-eventos`).flush(PAGINA);
    http.expectNone((r) => r.url === URL);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.querySelector('h1')?.textContent).toContain('Mi historial');
    expect(html.textContent).toContain('Nota modificada');
    const encabezados = Array.from(html.querySelectorAll('th[scope="col"]')).map((t) => t.textContent?.trim());
    expect(encabezados).not.toContain('Usuario');
    http.verify();
  });

  it('el administrador consulta todo el historial y ve la columna Usuario', async () => {
    const { http, fixture, html } = montar('administrador');

    http.expectOne((r) => r.url === URL).flush(PAGINA);
    http.expectNone((r) => r.url === `${URL}/mis-eventos`);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.querySelector('h1')?.textContent).toContain('Historial de auditoría');
    const encabezados = Array.from(html.querySelectorAll('th[scope="col"]')).map((t) => t.textContent?.trim());
    expect(encabezados).toContain('Usuario');
    http.verify();
  });
});
