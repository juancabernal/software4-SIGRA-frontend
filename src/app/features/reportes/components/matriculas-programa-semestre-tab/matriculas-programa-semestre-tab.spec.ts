import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { environment } from '../../../../../environments/environment';
import { FacultadService } from '../../../facultades/services/facultad.service';
import { ProgramaService } from '../../../programas/services/programa.service';
import { SemestreService } from '../../../semestres/services/semestre.service';
import { MatriculasProgramaSemestreReporte } from '../../models/matriculas-programa-semestre.model';
import { MatriculasProgramaSemestreService } from '../../services/matriculas-programa-semestre.service';
import { MatriculasProgramaSemestreTab } from './matriculas-programa-semestre-tab';

describe('MatriculasProgramaSemestreTab', () => {
  let fixture: ComponentFixture<MatriculasProgramaSemestreTab>;
  let http: HttpTestingController;
  const reportUrl = `${environment.apiUrl}/v1/reportes/matriculas-programa-semestre`;
  const semestresUrl = `${environment.apiUrl}/v1/semestres`;
  const programasUrl = `${environment.apiUrl}/v1/programas`;
  const facultadesUrl = `${environment.apiUrl}/v1/facultades`;

  const reporte = (filas: MatriculasProgramaSemestreReporte['filas'] = []): MatriculasProgramaSemestreReporte => ({
    semestreId: 's1',
    programaId: null,
    facultadId: null,
    resumen: {
      totalMatriculas: filas.reduce((total, fila) => total + fila.totalMatriculas, 0),
      activas: filas.reduce((total, fila) => total + fila.activas, 0),
      desvinculadas: filas.reduce((total, fila) => total + fila.desvinculadas, 0),
      estudiantesDistintos: 4,
      programas: filas.length,
      semestres: 1,
    },
    filas,
  });

  const fila = (totalMatriculas: number) => ({
    semestreId: 's1',
    semestreCodigo: '2026-1',
    semestreFechaInicio: '2026-01-15',
    semestreEstado: 'ACTIVO' as const,
    programaId: `p${totalMatriculas}`,
    programaCodigo: 'ISI',
    programaNombre: 'Ingeniería de Sistemas',
    facultadNombre: 'Ingeniería',
    totalMatriculas,
    activas: totalMatriculas - 1,
    desvinculadas: 1,
    estudiantes: 3,
    asignaturas: 2,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatriculasProgramaSemestreTab],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MatriculasProgramaSemestreService,
        SemestreService,
        ProgramaService,
        FacultadService,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MatriculasProgramaSemestreTab);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function responderCatalogos(sinSemestreActivo = false): void {
    http.expectOne(semestresUrl).flush([
      {
        id: 's1',
        codigo: '2026-1',
        fechaInicio: '2026-01-15',
        fechaFin: '2026-06-30',
        estado: sinSemestreActivo ? 'INACTIVO' : 'ACTIVO',
      },
      { id: 's2', codigo: '2025-2', fechaInicio: '2025-07-15', fechaFin: '2025-12-15', estado: 'INACTIVO' },
    ]);
    http.expectOne(programasUrl).flush([
      { id: 'p1', codigo: 'ISI', nombre: 'Ingeniería de Sistemas', facultadId: 'f1', facultadNombre: 'Ingeniería', estado: 'ACTIVO' },
    ]);
    http.expectOne(facultadesUrl).flush([{ id: 'f1', nombre: 'Ingeniería', estado: 'ACTIVO' }]);
  }

  function responderReporte(valor: MatriculasProgramaSemestreReporte = reporte()): void {
    http.expectOne((request) => request.url === reportUrl).flush(valor);
  }

  it('selecciona el semestre activo y lo envía al reporte', async () => {
    responderCatalogos();
    await fixture.whenStable();
    responderReporte();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#filtro-semestre-r2') as HTMLSelectElement).value).toBe('s1');
  });

  it('selecciona Todos los semestres sin enviar semestreId cuando no hay activo', async () => {
    responderCatalogos(true);
    await fixture.whenStable();
    const request = http.expectOne((item) => item.url === reportUrl);

    expect((fixture.nativeElement.querySelector('#filtro-semestre-r2') as HTMLSelectElement).value).toBe('');
    expect(request.request.params.has('semestreId')).toBe(false);
    request.flush(reporte());
  });

  it('vuelve a consultar con programa y facultad al cambiar los filtros', async () => {
    responderCatalogos();
    await fixture.whenStable();
    responderReporte();
    fixture.detectChanges();

    const programa = fixture.nativeElement.querySelector('#filtro-programa-r2') as HTMLSelectElement;
    programa.value = 'p1';
    programa.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const requestPrograma = http.expectOne((request) => request.url === reportUrl);
    expect(requestPrograma.request.params.get('semestreId')).toBe('s1');
    expect(requestPrograma.request.params.get('programaId')).toBe('p1');
    expect(requestPrograma.request.params.has('facultadId')).toBe(false);
    requestPrograma.flush(reporte());

    const facultad = fixture.nativeElement.querySelector('#filtro-facultad-r2') as HTMLSelectElement;
    facultad.value = 'f1';
    facultad.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const requestFacultad = http.expectOne((request) => request.url === reportUrl);
    expect(requestFacultad.request.params.get('facultadId')).toBe('f1');
    requestFacultad.flush(reporte());
  });

  it('muestra tarjetas, filas, total y escala la barra máxima a 100%', async () => {
    responderCatalogos();
    await fixture.whenStable();
    responderReporte(reporte([fila(10), fila(5)]));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.resumen__tarjeta').length).toBe(5);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.fila-total')?.textContent).toContain('4');
    const barras = fixture.nativeElement.querySelectorAll('.barra') as NodeListOf<HTMLElement>;
    expect(barras[0].style.width).toBe('100%');
  });

  it('muestra vacío', async () => {
    responderCatalogos();
    await fixture.whenStable();
    responderReporte();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No hay matrículas registradas para los filtros seleccionados.',
    );
  });

  it('muestra error y Reintentar vuelve a consultar', async () => {
    responderCatalogos();
    await fixture.whenStable();
    const request = http.expectOne((item) => item.url === reportUrl);
    request.flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes permisos para realizar esta acción.');

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const retry = http.expectOne((item) => item.url === reportUrl);
    expect(retry.request.params.get('semestreId')).toBe('s1');
    retry.flush(reporte());
  });

  it('descarga el CSV en navegador y libera la URL después del click', async () => {
    responderCatalogos();
    await fixture.whenStable();
    responderReporte(reporte([fila(10)]));
    fixture.detectChanges();

    vi.useFakeTimers();
    const objectUrl = 'blob:reporte-r2';
    const crearUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl);
    const liberarUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(document.body.contains(this)).toBe(true);
      expect(this.download).toBe('reporte-matriculas-programa-semestre.csv');
    });

    (fixture.nativeElement.querySelector('.acciones button') as HTMLButtonElement).click();

    expect(crearUrl).toHaveBeenCalledOnce();
    expect(crearUrl.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(click).toHaveBeenCalledOnce();
    expect(liberarUrl).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(liberarUrl).toHaveBeenCalledWith(objectUrl);

    click.mockRestore();
    crearUrl.mockRestore();
    liberarUrl.mockRestore();
    vi.useRealTimers();
  });
});
