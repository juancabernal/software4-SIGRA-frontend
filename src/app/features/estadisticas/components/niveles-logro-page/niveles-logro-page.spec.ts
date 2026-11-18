import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SesionService } from '../../../../core/services/sesion';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { Semestre } from '../../../semestres/models/semestre.model';
import {
  CATALOGO_NIVELES,
  ESTADISTICAS,
  MATERIA,
  SEMESTRE_ACTIVO,
  SEMESTRE_INACTIVO,
  URL_ASIGNATURAS,
  URL_CATALOGO_NIVELES,
  URL_SEMESTRES,
  boton,
  ra,
  urlEstadisticas,
  urlRa,
} from '../estadisticas-pruebas';
import { NivelesLogroPage } from './niveles-logro-page';

const RENDIMIENTO_VACIO = {
  asignaturaId: 'asig-1',
  semestreId: null,
  semestreCodigo: null,
  resultados: [],
};

describe('NivelesLogroPage', () => {
  let fixture: ComponentFixture<NivelesLogroPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NivelesLogroPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NivelesLogroPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    fixture.destroy();
    html.remove();
    // Al elegir materia y semestre la página pide el rendimiento de los RA; solo lo ejercita su prueba propia.
    http
      .match((req) => req.url.endsWith('/rendimiento'))
      .forEach((req) => !req.cancelled && req.flush(RENDIMIENTO_VACIO));
    http.verify();
  });

  async function iniciar(asignaturas: Asignatura[], semestres: Semestre[]) {
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush(asignaturas);
    http.expectOne((r) => r.url === URL_SEMESTRES).flush(semestres);
    http.expectOne((r) => r.url === URL_CATALOGO_NIVELES).flush(CATALOGO_NIVELES);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function elegirMateria(asignatura: Asignatura, resultados: ResultadoAprendizaje[]) {
    const selector = html.querySelector('#selector-materia') as HTMLSelectElement;
    selector.value = asignatura.id;
    selector.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    http.expectOne(urlRa(asignatura.id)).flush(resultados);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function elegirRa(id: string) {
    const selector = html.querySelector('#selector-ra') as HTMLSelectElement;
    selector.value = id;
    selector.dispatchEvent(new Event('change'));
  }

  function elegirSemestre(id: string) {
    const selector = html.querySelector('#selector-semestre') as HTMLSelectElement;
    selector.value = id;
    selector.dispatchEvent(new Event('change'));
  }

  const peticionEstadisticas = (raId = 'ra-1', semestreId = SEMESTRE_ACTIVO.id) =>
    http.expectOne((r) => r.url === urlEstadisticas(raId, semestreId) && r.method === 'GET');

  function atenderRendimientoPendiente() {
    http
      .match((r) => r.url.endsWith('/rendimiento'))
      .filter((req) => !req.cancelled)
      .forEach((req) => req.flush(RENDIMIENTO_VACIO));
  }

  async function iniciarConSeleccion(
    resultados: ResultadoAprendizaje[],
    responderEstadisticas = true,
  ) {
    await iniciar([MATERIA], [SEMESTRE_ACTIVO, SEMESTRE_INACTIVO]);
    await elegirMateria(MATERIA, resultados);
    elegirRa('ra-1');
    await fixture.whenStable();
    if (responderEstadisticas) {
      peticionEstadisticas().flush(ESTADISTICAS);
    }
    atenderRendimientoPendiente();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  describe('rendimiento del RA', () => {
    it('al elegir materia, RA y semestre muestra solo el rendimiento de ese RA, sin pulsar «Consultar»', async () => {
      await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
      await elegirMateria(MATERIA, [ra(1), ra(2)]);
      // Solo con la materia no se calcula ni se lista nada: se espera al RA.
      http.expectNone((r) => r.url.endsWith('/rendimiento'));
      elegirRa('ra-1');
      await fixture.whenStable();
      peticionEstadisticas().flush(ESTADISTICAS);
      http
        .expectOne(
          (r) =>
            r.url === `${urlRa(MATERIA.id)}/rendimiento` &&
            r.params.get('semestreId') === SEMESTRE_ACTIVO.id,
        )
        .flush({
          asignaturaId: MATERIA.id,
          semestreId: SEMESTRE_ACTIVO.id,
          semestreCodigo: SEMESTRE_ACTIVO.codigo,
          resultados: [
            {
              resultadoAprendizajeId: 'ra-1',
              codigo: 'RA1',
              estado: 'CON_NIVEL',
              nivelLogro: 'BAJO',
              promedioNota: 2.5,
              porcentajeAsignado: 100,
              porcentajeEvaluado: 100,
              evaluacionesActivas: 3,
              minimoEvaluaciones: 3,
              completo: true,
            },
            {
              resultadoAprendizajeId: 'ra-2',
              codigo: 'RA2',
              estado: 'SIN_EVALUAR',
              nivelLogro: null,
              promedioNota: null,
              porcentajeAsignado: 60,
              porcentajeEvaluado: 0,
              evaluacionesActivas: 2,
              minimoEvaluaciones: 3,
              completo: false,
            },
          ],
        });
      await fixture.whenStable();
      fixture.detectChanges();

      const texto =
        html.querySelector('#titulo-rendimiento')?.closest('section')?.textContent ?? '';
      expect(texto).toContain('RA1');
      expect(texto).toContain('Bajo · Completo');
      // El RA2 no está elegido: no se muestra.
      expect(texto).not.toContain('RA2');
      expect(texto).not.toContain('Sin evaluar');
    });

    it('si falla el rendimiento lo indica sin afectar el nivel de logro', async () => {
      await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
      await elegirMateria(MATERIA, [ra(1)]);
      elegirRa('ra-1');
      await fixture.whenStable();
      peticionEstadisticas().flush(ESTADISTICAS);
      http
        .expectOne((r) => r.url.endsWith('/rendimiento'))
        .flush({ mensaje: 'x' }, { status: 500, statusText: 'Internal Server Error' });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('No se pudo calcular el rendimiento del RA');
      expect(html.querySelectorAll('.distribucion__fila').length).toBe(4);
    });
  });

  describe('consulta automática del nivel de logro', () => {
    it('consulta una vez el nivel de logro al completar los tres filtros', async () => {
      await iniciarConSeleccion([ra(1)], false);

      const estadisticas = peticionEstadisticas();
      expect(http.match((r) => r.url.includes('/estadisticas') && r.method === 'GET')).toHaveLength(
        0,
      );
      // Esta página no pide la conclusión ni las acciones de mejora.
      http.expectNone((r) => r.url.includes('/conclusiones'));
      http.expectNone((r) => r.url.includes('/acciones-mejora'));
      estadisticas.flush(ESTADISTICAS);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.querySelectorAll('.distribucion__fila').length).toBe(4);
    });

    it('no consulta con filtros incompletos', async () => {
      await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
      await elegirMateria(MATERIA, [ra(1)]);

      http.expectNone((r) => r.url.includes('/estadisticas'));
      expect(html.textContent).toContain('Elige materia, RA y semestre para ver los resultados.');
    });

    it('cancela la consulta anterior y consulta con los nuevos ids al cambiar un filtro', async () => {
      await iniciarConSeleccion([ra(1)], false);
      const consultaAnterior = peticionEstadisticas();

      elegirSemestre(SEMESTRE_INACTIVO.id);
      await fixture.whenStable();

      expect(consultaAnterior.cancelled).toBe(true);
      peticionEstadisticas('ra-1', SEMESTRE_INACTIVO.id).flush(ESTADISTICAS);
    });

    it('no deja que una respuesta vieja sobrescriba la consulta más nueva', async () => {
      await iniciarConSeleccion([ra(1)], false);
      const consultaAnterior = peticionEstadisticas();

      elegirSemestre(SEMESTRE_INACTIVO.id);
      await fixture.whenStable();
      peticionEstadisticas('ra-1', SEMESTRE_INACTIVO.id).flush({
        ...ESTADISTICAS,
        promedioNota: 4.1,
        promedioPorcentaje: 82,
      });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(consultaAnterior.cancelled).toBe(true);
      expect(html.textContent).toContain('4,1');
      expect(html.textContent).not.toContain('3,25');
    });

    it('permite reintentar el nivel de logro después de un error', async () => {
      await iniciarConSeleccion([ra(1)], false);
      peticionEstadisticas().flush(
        { mensaje: 'x' },
        { status: 503, statusText: 'Service Unavailable' },
      );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('El servicio no está disponible');
      const seccion = html.querySelector('[aria-labelledby="titulo-nivel-logro"]') as HTMLElement;
      boton(seccion, 'Reintentar').click();
      await fixture.whenStable();
      peticionEstadisticas().flush(ESTADISTICAS);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.querySelectorAll('.distribucion__fila').length).toBe(4);
      expect(html.textContent).not.toContain('El servicio no está disponible');
    });

    it('cambiar de RA descarta el nivel de logro consultado', async () => {
      await iniciarConSeleccion([ra(1), ra(2)]);
      expect(html.textContent).toContain('3,25');

      elegirRa('ra-2');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(html.querySelectorAll('.distribucion__fila').length).toBe(0);

      peticionEstadisticas('ra-2').flush({
        ...ESTADISTICAS,
        resultadoAprendizajeId: 'ra-2',
        promedioNota: 4.2,
      });
      atenderRendimientoPendiente();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).not.toContain('3,25');
      expect(html.textContent).toContain('4,2');
    });
  });

  describe('nivel de logro (RF-14 / RF-15)', () => {
    it('muestra el rendimiento y el nivel de logro en secciones separadas', async () => {
      await iniciarConSeleccion([ra(1)]);

      const titulos = Array.from(html.querySelectorAll('.seccion__titulo')).map((h) =>
        h.textContent?.trim(),
      );
      expect(titulos).toEqual(['Rendimiento del RA', 'Nivel de logro']);
      const filas = html.querySelectorAll('.distribucion__fila');
      expect(
        Array.from(filas).map((f) => f.querySelector('app-badge-nivel-logro')?.textContent?.trim()),
      ).toEqual(['Bajo', 'Medio', 'Alto', 'Sobresaliente']);
      expect(filas[0].textContent).toContain('35 %');
      expect(filas[3].textContent).toContain('[4,5 – 5,0]');
      expect(html.textContent).toContain('3,25');
    });

    it('«Consultar» vuelve a pedir el nivel de logro y el rendimiento', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      peticionEstadisticas().flush(ESTADISTICAS);
      expect(http.match((r) => r.url.endsWith('/rendimiento')).length).toBeGreaterThan(0);
    });

    it('no recalcula automáticamente y un doble clic en «Recalcular» envía un solo POST', async () => {
      await iniciarConSeleccion([ra(1)]);
      expect(http.match((r) => r.url.endsWith('/estadisticas/recalculo'))).toHaveLength(0);

      const botonRecalcular = boton(html, 'Recalcular');
      botonRecalcular.click();
      botonRecalcular.click();
      const recalculos = http.match(
        (r) => r.url.endsWith('/estadisticas/recalculo') && r.method === 'POST',
      );
      expect(recalculos).toHaveLength(1);
      recalculos[0].flush({ estadisticas: ESTADISTICAS, conclusion: null });
      await fixture.whenStable();
      peticionEstadisticas().flush(ESTADISTICAS);
      atenderRendimientoPendiente();
    });

    it('«Recalcular» actualiza el nivel de logro y avisa si se generó una conclusión', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Recalcular').click();
      await fixture.whenStable();
      http
        .expectOne(
          (r) =>
            r.url === `${urlEstadisticas('ra-1', SEMESTRE_ACTIVO.id)}/recalculo` &&
            r.method === 'POST',
        )
        .flush({
          estadisticas: ESTADISTICAS,
          conclusion: { generada: true, motivo: null, conclusion: null },
        });
      await fixture.whenStable();
      peticionEstadisticas().flush({ ...ESTADISTICAS, promedioNota: 3.4 });
      atenderRendimientoPendiente();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('Se generó una conclusión de desempeño insuficiente');
      expect(html.textContent).toContain('3,4');
    });

    it('si «Recalcular» falla muestra el error sin detalles técnicos', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Recalcular').click();
      await fixture.whenStable();
      http
        .expectOne((r) => r.url.endsWith('/estadisticas/recalculo') && r.method === 'POST')
        .flush({ mensaje: 'detalle técnico' }, { status: 503, statusText: 'Service Unavailable' });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('El servicio no está disponible');
      expect(html.textContent).not.toContain('detalle técnico');
    });
  });

  describe('refresco en segundo plano', () => {
    it('no pone la pantalla en estado de carga y conserva los datos anteriores', async () => {
      await iniciarConSeleccion([ra(1)]);
      expect(html.textContent).toContain('3,25');

      document.dispatchEvent(new Event('visibilitychange'));
      await fixture.whenStable();

      expect(html.textContent).not.toContain('Consultando nivel de logro');
      expect(html.textContent).toContain('3,25');

      peticionEstadisticas().flush({ ...ESTADISTICAS, promedioNota: 3.5 });
      atenderRendimientoPendiente();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).not.toContain('Consultando nivel de logro');
      expect(html.textContent).toContain('3,5');
    });

    it('si el refresco falla conserva los datos anteriores sin mostrar error', async () => {
      await iniciarConSeleccion([ra(1)]);

      document.dispatchEvent(new Event('visibilitychange'));
      await fixture.whenStable();
      peticionEstadisticas().flush(
        { mensaje: 'detalle técnico' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      atenderRendimientoPendiente();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('3,25');
      expect(html.textContent).not.toContain('El servicio no está disponible');
    });
  });
});

describe('NivelesLogroPage con un Profesor sin semestres (Mantis 0000045)', () => {
  let fixture: ComponentFixture<NivelesLogroPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [NivelesLogroPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SesionService, useValue: { rol: () => 'profesor' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NivelesLogroPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);

    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush([MATERIA]);
    http.expectOne((r) => r.url === `${URL_SEMESTRES}/mios`).flush([]);
    http.expectNone((r) => r.url === URL_SEMESTRES);
    http.expectOne((r) => r.url === URL_CATALOGO_NIVELES).flush(CATALOGO_NIVELES);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    html.remove();
    http.verify();
  });

  it('con materia y RA pero sin semestre no consulta nada y «Recalcular» queda deshabilitado', async () => {
    const materia = html.querySelector('#selector-materia') as HTMLSelectElement;
    materia.value = MATERIA.id;
    materia.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    http.expectOne(urlRa(MATERIA.id)).flush([ra(1)]);
    await fixture.whenStable();
    fixture.detectChanges();

    const resultado = html.querySelector('#selector-ra') as HTMLSelectElement;
    resultado.value = 'ra-1';
    resultado.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone((r) => r.url.includes('/semestres/'));
    http.expectNone((r) => r.url.endsWith('/rendimiento'));
    expect(boton(html, 'Recalcular').disabled).toBe(true);
  });
});
