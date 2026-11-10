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

  describe('búsqueda y filtros', () => {
    const consulta = () => http.expectOne((r) => r.url === URL);

    function escribirCodigo(valor: string): void {
      const input = html.querySelector('#filtro-codigo') as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
    }

    afterEach(() => vi.useRealTimers());

    it('busca por código tras una pausa al teclear, con un solo pedido', () => {
      vi.useFakeTimers();
      fixture.detectChanges();
      consulta().flush([FUTURO, TERMINADO]);
      fixture.detectChanges();

      escribirCodigo('2');
      escribirCodigo('20');
      escribirCodigo('2090');
      vi.advanceTimersByTime(299);
      http.expectNone((r) => r.url === URL);
      vi.advanceTimersByTime(1);

      const req = consulta();
      expect(req.request.params.get('codigo')).toBe('2090');
      req.flush([FUTURO]);
      fixture.detectChanges();
      expect(html.querySelectorAll('tbody tr').length).toBe(1);
      expect(html.querySelector('tbody')?.textContent).toContain('2090-1');
    });

    it('filtra por estado de inmediato', async () => {
      await responderListado([FUTURO]);

      const select = html.querySelector('#filtro-estado') as HTMLSelectElement;
      select.value = 'ACTIVO';
      select.dispatchEvent(new Event('change'));

      const req = consulta();
      expect(req.request.params.get('estado')).toBe('ACTIVO');
      req.flush([]);
    });

    it('sin coincidencias muestra «Sin resultados» y limpiar filtros vuelve al listado completo', async () => {
      await responderListado([FUTURO]);
      const select = html.querySelector('#filtro-estado') as HTMLSelectElement;
      select.value = 'ACTIVO';
      select.dispatchEvent(new Event('change'));
      consulta().flush([]);
      await fixture.whenStable();

      expect(html.textContent).toContain('Sin resultados');
      expect(html.textContent).not.toContain('Todavía no hay semestres registrados');
      expect(html.textContent).not.toContain('Semestre en curso');
      expect(html.textContent).not.toContain('Hoy no hay ningún semestre en curso');

      const limpiar = [...html.querySelectorAll('.estado-vista button')].find((b) =>
        b.textContent?.includes('Limpiar filtros'),
      ) as HTMLButtonElement;
      limpiar.click();

      const req = consulta();
      expect(req.request.params.keys()).toEqual([]);
      req.flush([FUTURO, TERMINADO]);
      await fixture.whenStable();
      expect(html.querySelectorAll('tbody tr').length).toBe(2);
    });

    it('conserva el filtro activo al recargar tras un error', async () => {
      await responderListado([FUTURO]);
      const select = html.querySelector('#filtro-estado') as HTMLSelectElement;
      select.value = 'INACTIVO';
      select.dispatchEvent(new Event('change'));
      consulta().flush(null, { status: 0, statusText: 'Unknown Error' });
      await fixture.whenStable();

      (html.querySelector('[role="alert"] button') as HTMLButtonElement).click();
      const req = consulta();
      expect(req.request.params.get('estado')).toBe('INACTIVO');
      req.flush([FUTURO]);
    });
  });

  it('abre el diálogo de registro', async () => {
    await responderListado([FUTURO]);
    (html.querySelector('.cabecera button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(html.querySelector('app-semestre-form-dialog')).not.toBeNull();
  });
});
