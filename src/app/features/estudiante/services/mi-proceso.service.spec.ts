import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { MiProcesoService } from './mi-proceso.service';

describe('MiProcesoService', () => {
  let service: MiProcesoService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/v1/estudiantes/me`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MiProcesoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista materias sin parámetros de identidad', () => {
    service.listarMaterias().subscribe();
    const request = http.expectOne(`${api}/materias`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([]);
  });

  it('obtiene una materia codificando la matrícula en la URL', () => {
    service.obtenerMateria('id con espacios').subscribe();
    const request = http.expectOne(`${api}/materias/id%20con%20espacios`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });

  it('consulta progreso e historial con GET', () => {
    service.obtenerProgreso().subscribe();
    service.listarHistorial().subscribe();
    const progreso = http.expectOne(`${api}/progreso`);
    const historial = http.expectOne(`${api}/historial`);
    expect(progreso.request.method).toBe('GET');
    expect(historial.request.method).toBe('GET');
    progreso.flush([]);
    historial.flush([]);
  });
});
