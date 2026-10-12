import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Semestre } from '../../models/semestre.model';
import { SemestresPage } from './semestres-page';

const URL = `${environment.apiUrl}/v1/semestres`;

const FUTURO: Semestre = {
  id: 'a',
  codigo: '2090-1',
  fechaInicio: '2090-01-20',
  fechaFin: '2090-06-10',
  estado: 'INACTIVO',
};
const TERMINADO: Semestre = {
  id: 'b',
  codigo: '1990-1',
  fechaInicio: '1990-01-20',
  fechaFin: '1990-06-10',
  estado: 'INACTIVO',
};

describe('SemestresPage', () => {
  let fixture: ComponentFixture<SemestresPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SemestresPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SemestresPage);
    html = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  async function responderListado(semestres: Semestre[]): Promise<void> {
    http.expectOne(URL).flush(semestres);
    await fixture.whenStable();
  }

  it('muestra el estado de carga mientras llega el listado', async () => {
    await fixture.whenStable();
    expect(html.textContent).toContain('Cargando semestres');
    http.expectOne(URL).flush([]);
  });

  it('pinta una fila por semestre con su badge de estado', async () => {
    await responderListado([FUTURO, TERMINADO]);

    const filas = html.querySelectorAll('tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('2090-1');
    expect(filas[0].textContent).toContain('Inactivo');
    expect(filas[0].textContent).toContain('142 días');
  });

  it('permite extender un semestre que no ha terminado y bloquea uno terminado', async () => {
    await responderListado([FUTURO, TERMINADO]);

    const filas = html.querySelectorAll('tbody tr');
    expect(filas[0].querySelector('button')?.textContent).toContain('Extender fecha de fin');
    expect(filas[1].querySelector('button')).toBeNull();
    expect(filas[1].textContent).toContain('Terminado, no se puede modificar');
  });

  it('muestra el estado vacío con la acción de registrar', async () => {
    await responderListado([]);
    expect(html.textContent).toContain('Todavía no hay semestres registrados');
    expect(html.textContent).toContain('Hoy no hay ningún semestre en curso');
  });

  it('muestra un error comprensible y permite reintentar', async () => {
    http.expectOne(URL).flush(null, { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();
    expect(html.textContent).toContain('No se pudo conectar con el servidor');

    (html.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await responderListado([FUTURO]);
    expect(html.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('abre el diálogo de registro', async () => {
    await responderListado([FUTURO]);
    (html.querySelector('.cabecera button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(html.querySelector('app-semestre-form-dialog')).not.toBeNull();
  });
});
