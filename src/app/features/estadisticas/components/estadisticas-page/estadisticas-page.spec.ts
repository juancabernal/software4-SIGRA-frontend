import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { AccionMejora } from '../../../mejoras/models/accion-mejora.model';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import {
  RendimientoAsignatura,
  ResultadoAprendizaje,
} from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { Semestre } from '../../../semestres/models/semestre.model';
import { Conclusion, ConclusionEstado } from '../../models/conclusion.model';
import { EstadisticasResultadoAprendizaje, RangoNivelLogro } from '../../models/nivel-logro.model';
import { EstadisticasPage } from './estadisticas-page';

const API = `${environment.apiUrl}/v1`;
const URL_ASIGNATURAS = `${API}/asignaturas`;
const URL_SEMESTRES = `${API}/semestres`;
const URL_ACCIONES_MEJORA = `${API}/acciones-mejora`;
const urlRa = (asignaturaId: string) => `${API}/asignaturas/${asignaturaId}/resultados-aprendizaje`;
const urlEstadoConclusion = (raId: string, semestreId: string) =>
  `${API}/resultados-aprendizaje/${raId}/semestres/${semestreId}/conclusiones/estado`;
const URL_CATALOGO_NIVELES = `${API}/niveles-logro`;
const urlEstadisticas = (raId: string, semestreId: string) =>
  `${API}/resultados-aprendizaje/${raId}/semestres/${semestreId}/estadisticas`;

const RENDIMIENTO_VACIO: RendimientoAsignatura = {
  asignaturaId: 'asig-1',
  semestreId: null,
  semestreCodigo: null,
  resultados: [],
};

const MATERIA: Asignatura = {
  id: 'a1',
  codigo: 'MAT1',
  nombre: 'Matemáticas I',
  programaId: 'p1',
  programaNombre: 'Ingeniería de Sistemas',
  estado: 'ACTIVA',
  cantidadRa: 5,
};

const SEMESTRE_ACTIVO: Semestre = {
  id: 's-activo',
  codigo: '2026-1',
  fechaInicio: '2026-01-15',
  fechaFin: '2026-06-15',
  estado: 'ACTIVO',
};

const SEMESTRE_INACTIVO: Semestre = {
  id: 's-inactivo',
  codigo: '2025-2',
  fechaInicio: '2025-07-15',
  fechaFin: '2025-12-15',
  estado: 'INACTIVO',
};

function ra(n: number, estado: ResultadoAprendizaje['estado'] = 'ACTIVO'): ResultadoAprendizaje {
  return {
    id: `ra-${n}`,
    asignaturaId: MATERIA.id,
    codigo: `RA${n}`,
    descripcion: `Descripción ${n}`,
    estado,
  };
}

const CONCLUSION: Conclusion = {
  id: 'c1',
  resultadoAprendizajeId: 'ra-1',
  resultadoAprendizajeCodigo: 'RA1',
  asignaturaId: MATERIA.id,
  semestreId: SEMESTRE_ACTIVO.id,
  semestreCodigo: SEMESTRE_ACTIVO.codigo,
  mensaje: 'Más del 40% de los estudiantes no alcanzó el RA.',
  tieneDatosSuficientes: true,
  fechaGeneracion: '2026-06-01',
  porcentajeInsuficiente: 45,
  estado: 'VIGENTE',
};

const CATALOGO_NIVELES: RangoNivelLogro[] = [
  { nivel: 'BAJO', notaMinima: 0, notaLimite: 3, limiteIncluido: false },
  { nivel: 'MEDIO', notaMinima: 3, notaLimite: 4, limiteIncluido: false },
  { nivel: 'ALTO', notaMinima: 4, notaLimite: 4.5, limiteIncluido: false },
  { nivel: 'SOBRESALIENTE', notaMinima: 4.5, notaLimite: 5, limiteIncluido: true },
];

const ESTADISTICAS: EstadisticasResultadoAprendizaje = {
  resultadoAprendizajeId: 'ra-1',
  codigoResultadoAprendizaje: 'RA1',
  asignaturaId: MATERIA.id,
  semestreId: SEMESTRE_ACTIVO.id,
  codigoSemestre: SEMESTRE_ACTIVO.codigo,
  totalEstudiantes: 20,
  evaluados: 20,
  sinDatosSuficientes: 0,
  sinEvaluar: 0,
  promedioNota: 3.25,
  promedioPorcentaje: 65,
  distribucion: [
    { nivel: 'BAJO', cantidad: 7, porcentaje: 35 },
    { nivel: 'MEDIO', cantidad: 5, porcentaje: 25 },
    { nivel: 'ALTO', cantidad: 6, porcentaje: 30 },
    { nivel: 'SOBRESALIENTE', cantidad: 2, porcentaje: 10 },
  ],
  fechaCalculo: '2026-10-17T10:05:00',
};

const RESULTADO_VIGENTE: ConclusionEstado = {
  estado: 'VIGENTE',
  conclusion: CONCLUSION,
  totalEvaluados: null,
  porcentajeInsuficiente: null,
};

const RESULTADO_ATENDIDA: ConclusionEstado = {
  estado: 'ATENDIDA',
  conclusion: null,
  totalEvaluados: 20,
  porcentajeInsuficiente: 45,
};

const RESULTADO_SATISFACTORIO: ConclusionEstado = {
  estado: 'SATISFACTORIO',
  conclusion: null,
  totalEvaluados: 20,
  porcentajeInsuficiente: 10,
};

const RESULTADO_SIN_DATOS: ConclusionEstado = {
  estado: 'SIN_DATOS_SUFICIENTES',
  conclusion: null,
  totalEvaluados: 2,
  porcentajeInsuficiente: null,
};

describe('EstadisticasPage', () => {
  let fixture: ComponentFixture<EstadisticasPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EstadisticasPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EstadisticasPage);
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

  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  async function iniciar(asignaturas: Asignatura[], semestres: Semestre[]) {
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush(asignaturas);
    http.expectOne((r) => r.url === URL_SEMESTRES).flush(semestres);
    http.expectOne((r) => r.url === URL_CATALOGO_NIVELES).flush(CATALOGO_NIVELES);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** «Consultar» también pide el nivel de logro (RF-14/15); estas pruebas se centran en RF-16. */
  function responderEstadisticas(estadisticas = ESTADISTICAS) {
    http
      .expectOne((r) => r.url === urlEstadisticas('ra-1', SEMESTRE_ACTIVO.id) && r.method === 'GET')
      .flush(estadisticas);
  }

  async function elegirMateria(asignatura: Asignatura, resultados: ResultadoAprendizaje[]) {
    const selector = html.querySelector('#selector-materia') as HTMLSelectElement;
    selector.value = asignatura.id;
    selector.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    http.expectOne(urlRa(asignatura.id)).flush(resultados);
    await fixture.whenStable();
  }

  function elegirRa(id: string) {
    const selector = html.querySelector('#selector-ra') as HTMLSelectElement;
    selector.value = id;
    selector.dispatchEvent(new Event('change'));
  }

  async function iniciarConSeleccion(
    resultados: ResultadoAprendizaje[],
    accionesMejora: AccionMejora[] = [],
  ) {
    await iniciar([MATERIA], [SEMESTRE_ACTIVO, SEMESTRE_INACTIVO]);
    await elegirMateria(MATERIA, resultados);
    elegirRa('ra-1');
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ACCIONES_MEJORA).flush(accionesMejora);
    await fixture.whenStable();
  }

  describe('carga inicial', () => {
    it('trae materias y semestres, y preselecciona el semestre ACTIVO', async () => {
      await iniciar([MATERIA], [SEMESTRE_INACTIVO, SEMESTRE_ACTIVO]);

      const selectorMateria = html.querySelector('#selector-materia') as HTMLSelectElement;
      expect(Array.from(selectorMateria.options).map((o) => o.textContent?.trim())).toEqual([
        'Selecciona una materia',
        'MAT1 · Matemáticas I',
      ]);

      const selectorSemestre = html.querySelector('#selector-semestre') as HTMLSelectElement;
      expect(
        Array.from(selectorSemestre.options).find((o) => o.value === SEMESTRE_ACTIVO.id)
          ?.textContent,
      ).toContain('(activo)');
      expect(selectorSemestre.value).toBe(SEMESTRE_ACTIVO.id);
      await fixture.whenStable();
    });
  });

  describe('selector de RA', () => {
    it('carga solo los RA en estado ACTIVO de la materia elegida', async () => {
      await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
      await elegirMateria(MATERIA, [ra(1), ra(2, 'INACTIVO'), ra(3)]);

      const selectorRa = html.querySelector('#selector-ra') as HTMLSelectElement;
      const codigos = Array.from(selectorRa.options)
        .slice(1)
        .map((o) => o.textContent?.trim());
      expect(codigos).toEqual(['RA1', 'RA3']);
      expect(codigos).not.toContain('RA2');
    });
  });

  describe('rendimiento de los RA', () => {
    it('al elegir materia, RA y semestre muestra solo el rendimiento de ese RA, sin pulsar «Consultar»', async () => {
      await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
      const selector = html.querySelector('#selector-materia') as HTMLSelectElement;
      selector.value = MATERIA.id;
      selector.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      http.expectOne(urlRa(MATERIA.id)).flush([ra(1), ra(2)]);
      await fixture.whenStable();
      // Solo con la materia no se calcula ni se lista nada: se espera al RA.
      http.expectNone((r) => r.url.endsWith('/rendimiento'));
      elegirRa('ra-1');
      await fixture.whenStable();
      http.expectOne((r) => r.url === URL_ACCIONES_MEJORA).flush([]);
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

      const texto = html.querySelector('#titulo-rendimiento')?.closest('section')?.textContent ?? '';
      expect(texto).toContain('RA1');
      expect(texto).toContain('Bajo · Completo');
      // El RA2 no está elegido: no se muestra.
      expect(texto).not.toContain('RA2');
      expect(texto).not.toContain('Sin evaluar');
    });
  });

  describe('consulta de la conclusión', () => {
    it('con conclusión vigente muestra el mensaje, el porcentaje y «Crear acción de mejora»', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      const req = http.expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id));
      req.flush(RESULTADO_VIGENTE);
      await fixture.whenStable();

      expect(html.textContent).toContain(CONCLUSION.mensaje);
      expect(html.textContent).toContain('45%');
      expect(boton(html, 'Crear acción de mejora')).toBeDefined();
    });

    it('un refresco de fondo no pone la pantalla en estado de carga y conserva los datos anteriores', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_VIGENTE);
      await fixture.whenStable();

      expect(html.textContent).toContain(CONCLUSION.mensaje);

      document.dispatchEvent(new Event('visibilitychange'));
      await fixture.whenStable();

      expect(html.textContent).not.toContain('Consultando…');
      expect(html.textContent).not.toContain('Cargando acciones de mejora');
      expect(html.textContent).toContain(CONCLUSION.mensaje);

      responderEstadisticas();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_VIGENTE);
      http.expectOne((r) => r.url === URL_ACCIONES_MEJORA).flush([]);
      await fixture.whenStable();

      expect(html.textContent).toContain(CONCLUSION.mensaje);
    });

    it('con diagnóstico disponible muestra los números y la recomendación', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      const CONCLUSION_CON_DIAGNOSTICO: Conclusion = {
        ...CONCLUSION,
        totalEvaluados: 20,
        enNivelBajo: 7,
        enNivelMedio: 5,
        umbralPorcentaje: 30,
        porcentajeSemestreAnterior: 35,
        semestreAnteriorCodigo: '2025-2',
        recomendacion: 'Reforzar la unidad de integrales con talleres prácticos.',
      };
      const RESULTADO_CON_DIAGNOSTICO: ConclusionEstado = {
        ...RESULTADO_VIGENTE,
        conclusion: CONCLUSION_CON_DIAGNOSTICO,
      };
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_CON_DIAGNOSTICO);
      await fixture.whenStable();

      expect(html.textContent).toContain('quedaron por debajo del nivel esperado');
      expect(html.textContent).toContain('El umbral que dispara la alerta es del 30%');
      expect(html.textContent).toContain('7 en nivel Bajo y 5 en nivel Medio');
      expect(html.textContent).toContain('Empeoró frente al semestre 2025-2 (35%)');
      expect(html.textContent).toContain(
        'Reforzar la unidad de integrales con talleres prácticos.',
      );
    });

    it('sin datos de diagnóstico (conclusión generada antes del cambio) mantiene el aviso de siempre', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_VIGENTE);
      await fixture.whenStable();

      expect(html.textContent).toContain('Desempeño insuficiente');
      expect(html.textContent).toContain('45%');
      expect(html.textContent).not.toContain('quedaron por debajo del nivel esperado');
    });

    it('con estado ATENDIDA informa que el RA ya tiene una acción de mejora, sin ofrecer crear otra', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_ATENDIDA);
      await fixture.whenStable();

      expect(html.textContent).toContain('Atendida');
      expect(html.textContent).toContain('ya tiene una acción de mejora registrada');
      expect(html.textContent).toContain('45%');
      expect(boton(html, 'Crear acción de mejora')).toBeUndefined();
    });

    it('con estado SATISFACTORIO muestra la buena noticia con el número de evaluados y el porcentaje', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_SATISFACTORIO);
      await fixture.whenStable();

      expect(html.textContent).toContain('Satisfactorio');
      expect(html.textContent).toContain('dentro de lo esperado');
      expect(html.textContent).toContain('20');
      expect(html.textContent).toContain('10%');
      expect(boton(html, 'Crear acción de mejora')).toBeUndefined();
    });

    it('con estado SIN_DATOS_SUFICIENTES indica cuántas calificaciones hay y cuántas se necesitan', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_SIN_DATOS);
      await fixture.whenStable();

      expect(html.textContent).toContain('Sin datos suficientes');
      expect(html.textContent).toContain('Todavía no hay suficientes calificaciones');
      expect(html.textContent).toContain('2');
      expect(html.textContent).toContain('no es un error');
      expect(boton(html, 'Crear acción de mejora')).toBeUndefined();
    });
  });

  describe('nivel de logro (RF-14 / RF-15) en la misma vista', () => {
    it('antes de consultar pide elegir materia, RA y semestre, sin pedir datos', async () => {
      await iniciarConSeleccion([ra(1)]);

      expect(html.textContent).toContain('presiona «Consultar»');
      expect(html.querySelector('app-nivel-logro-resumen')).toBeNull();
    });

    it('«Consultar» muestra el nivel de logro y la conclusión en secciones separadas', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_VIGENTE);
      await fixture.whenStable();

      const titulos = Array.from(html.querySelectorAll('.seccion__titulo')).map((h) =>
        h.textContent?.trim(),
      );
      expect(titulos).toEqual(['Rendimiento del RA', 'Nivel de logro', 'Conclusión']);
      const filas = html.querySelectorAll('.distribucion__fila');
      expect(
        Array.from(filas).map((f) => f.querySelector('app-badge-nivel-logro')?.textContent?.trim()),
      ).toEqual(['Bajo', 'Medio', 'Alto', 'Sobresaliente']);
      expect(filas[0].textContent).toContain('35 %');
      expect(filas[3].textContent).toContain('[4,5 – 5,0]');
      expect(html.textContent).toContain('3,25');
      expect(html.textContent).toContain(CONCLUSION.mensaje);
    });

    it('si falla el nivel de logro, la conclusión se muestra igual y se puede reintentar solo esa parte', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      http
        .expectOne((r) => r.url === urlEstadisticas('ra-1', SEMESTRE_ACTIVO.id))
        .flush({ mensaje: 'x' }, { status: 503, statusText: 'Service Unavailable' });
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_VIGENTE);
      await fixture.whenStable();

      expect(html.textContent).toContain('El servicio no está disponible');
      expect(html.textContent).toContain(CONCLUSION.mensaje);

      const seccion = html.querySelector('[aria-labelledby="titulo-nivel-logro"]') as HTMLElement;
      boton(seccion, 'Reintentar').click();
      await fixture.whenStable();
      responderEstadisticas();
      await fixture.whenStable();
      expect(html.querySelectorAll('.distribucion__fila').length).toBe(4);
    });

    it('«Recalcular» actualiza el nivel de logro y vuelve a consultar la conclusión', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Recalcular').click();
      await fixture.whenStable();
      const req = http.expectOne(
        (r) =>
          r.url === `${urlEstadisticas('ra-1', SEMESTRE_ACTIVO.id)}/recalculo` &&
          r.method === 'POST',
      );
      req.flush({
        estadisticas: ESTADISTICAS,
        conclusion: { generada: true, motivo: null, conclusion: CONCLUSION },
      });
      await fixture.whenStable();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_VIGENTE);
      await fixture.whenStable();

      expect(html.textContent).toContain('Se generó una conclusión de desempeño insuficiente');
      expect(html.querySelectorAll('.distribucion__fila').length).toBe(4);
      expect(html.textContent).toContain(CONCLUSION.mensaje);
    });

    it('cambiar de RA descarta el nivel de logro y la conclusión consultados', async () => {
      await iniciarConSeleccion([ra(1), ra(2)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_VIGENTE);
      await fixture.whenStable();

      elegirRa('ra-2');
      await fixture.whenStable();
      http.expectOne((r) => r.url === URL_ACCIONES_MEJORA).flush([]);
      await fixture.whenStable();

      expect(html.querySelector('app-nivel-logro-resumen')).toBeNull();
      expect(html.textContent).not.toContain(CONCLUSION.mensaje);
    });
  });

  describe('acción de mejora', () => {
    it('abre el diálogo de registro de acción de mejora', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      responderEstadisticas();
      http
        .expectOne((r) => r.url === urlEstadoConclusion('ra-1', SEMESTRE_ACTIVO.id))
        .flush(RESULTADO_VIGENTE);
      await fixture.whenStable();

      boton(html, 'Crear acción de mejora').click();
      await fixture.whenStable();

      const dialogo = html.querySelector('dialog');
      expect(dialogo?.hasAttribute('open')).toBe(true);
      expect(dialogo?.textContent).toContain('Registrar acción de mejora');
    });
  });

  describe('listado de acciones de mejora', () => {
    const NO_CONVERTIDA: AccionMejora = {
      id: 'am1',
      nombre: 'Taller de refuerzo',
      descripcion: 'Taller para reforzar integrales',
      fechaPropuesta: '2026-06-01',
      resultadoAprendizajeId: 'ra-1',
      resultadoAprendizajeCodigo: 'RA1',
      asignaturaId: MATERIA.id,
      semestreId: SEMESTRE_ACTIVO.id,
      semestreCodigo: SEMESTRE_ACTIVO.codigo,
      conclusionOrigenId: 'c1',
      evaluacionGeneradaId: null,
      convertida: false,
    };

    const CONVERTIDA: AccionMejora = {
      ...NO_CONVERTIDA,
      id: 'am2',
      nombre: 'Guía de ejercicios adicionales',
      convertida: true,
      evaluacionGeneradaId: 'ev1',
    };

    it('muestra el listado de acciones del RA y semestre seleccionados', async () => {
      await iniciarConSeleccion([ra(1)], [NO_CONVERTIDA, CONVERTIDA]);

      expect(html.textContent).toContain('Taller de refuerzo');
      expect(html.textContent).toContain('Guía de ejercicios adicionales');
    });

    it('una acción no convertida ofrece «Convertir en evaluación»', async () => {
      await iniciarConSeleccion([ra(1)], [NO_CONVERTIDA]);

      const item = html.querySelector('.accion-mejora') as HTMLElement;
      expect(boton(item, 'Convertir en evaluación')).toBeDefined();
      expect(item.textContent).toContain('No convertida');
    });

    it('una acción ya convertida no ofrece «Convertir en evaluación» y muestra el id de la evaluación', async () => {
      await iniciarConSeleccion([ra(1)], [CONVERTIDA]);

      const item = html.querySelector('.accion-mejora') as HTMLElement;
      expect(boton(item, 'Convertir en evaluación')).toBeUndefined();
      expect(item.textContent).toContain('Convertida');
      expect(item.textContent).toContain('ev1');
    });

    async function abrirConversion(): Promise<void> {
      await iniciarConSeleccion([ra(1)], [NO_CONVERTIDA]);
      boton(html, 'Convertir en evaluación').click();
      await fixture.whenStable();
    }

    async function confirmarConversion(porcentaje: string): Promise<void> {
      const fecha = html.querySelector('#conversion-fecha-tentativa') as HTMLInputElement;
      fecha.value = '2026-06-10';
      fecha.dispatchEvent(new Event('input'));
      fecha.dispatchEvent(new Event('blur'));
      const input = html.querySelector('#conversion-porcentaje') as HTMLInputElement;
      input.value = porcentaje;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
      const dialogoAbierto = html.querySelector('dialog[open]') as HTMLElement;
      (dialogoAbierto.querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await fixture.whenStable();
    }

    const URL_CONVERSION = `${URL_ACCIONES_MEJORA}/${NO_CONVERTIDA.id}/conversion`;

    it('al convertir con éxito el listado se refresca', async () => {
      await abrirConversion();
      await confirmarConversion('20');

      const req = http.expectOne((r) => r.url === URL_CONVERSION && r.method === 'POST');
      const convertida = { ...NO_CONVERTIDA, convertida: true, evaluacionGeneradaId: 'ev1' };
      req.flush(convertida);
      await fixture.whenStable();

      http
        .expectOne((r) => r.url === URL_ACCIONES_MEJORA && r.method === 'GET')
        .flush([convertida]);
      await fixture.whenStable();

      expect(html.textContent).toContain('Acción de mejora convertida en evaluación.');
      const item = html.querySelector('.accion-mejora') as HTMLElement;
      expect(item.textContent).toContain('Convertida');
      expect(item.textContent).toContain('ev1');
    });

    it('si la conversión responde 400 (supera el 100%) muestra el error y la pantalla sigue usable', async () => {
      await abrirConversion();
      await confirmarConversion('90');

      http
        .expectOne((r) => r.url === URL_CONVERSION && r.method === 'POST')
        .flush(
          {
            status: 400,
            error: 'BAD_REQUEST',
            mensaje: 'El porcentaje supera el 100% del RA en el semestre.',
          },
          { status: 400, statusText: 'Bad Request' },
        );
      await fixture.whenStable();

      const alerta = html.querySelector('[role="alert"]') as HTMLElement;
      expect(alerta.textContent).toContain('El porcentaje supera el 100% del RA en el semestre.');
      expect(html.querySelector('.accion-mejora')).not.toBeNull();
    });

    it('si la conversión responde 409 (ya convertida) muestra el error y la pantalla sigue usable', async () => {
      await abrirConversion();
      await confirmarConversion('20');

      http
        .expectOne((r) => r.url === URL_CONVERSION && r.method === 'POST')
        .flush(
          { status: 409, error: 'CONFLICT', mensaje: 'La acción de mejora ya fue convertida.' },
          { status: 409, statusText: 'Conflict' },
        );
      await fixture.whenStable();

      const alerta = html.querySelector('[role="alert"]') as HTMLElement;
      expect(alerta.textContent).toContain('La acción de mejora ya fue convertida.');
      expect(html.querySelector('.accion-mejora')).not.toBeNull();
    });
  });
});
