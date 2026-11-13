import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { Semestre } from '../../../semestres/models/semestre.model';
import { Conclusion, ConclusionEstado } from '../../models/conclusion.model';
import {
  API,
  CONCLUSION,
  MATERIA,
  NO_CONVERTIDA,
  RESULTADO_ATENDIDA,
  RESULTADO_SATISFACTORIO,
  RESULTADO_SIN_DATOS,
  RESULTADO_VIGENTE,
  SEMESTRE_ACTIVO,
  SEMESTRE_INACTIVO,
  URL_ASIGNATURAS,
  URL_SEMESTRES,
  boton,
  ra,
  urlEstadoConclusion,
  urlRa,
} from '../estadisticas-pruebas';
import { ConclusionesPage } from './conclusiones-page';

describe('ConclusionesPage', () => {
  let fixture: ComponentFixture<ConclusionesPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConclusionesPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConclusionesPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    fixture.destroy();
    html.remove();
    http.verify();
  });

  async function iniciar(asignaturas: Asignatura[], semestres: Semestre[]) {
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush(asignaturas);
    http.expectOne((r) => r.url === URL_SEMESTRES).flush(semestres);
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

  const peticionConclusion = (raId = 'ra-1', semestreId = SEMESTRE_ACTIVO.id) =>
    http.expectOne((r) => r.url === urlEstadoConclusion(raId, semestreId));

  /** Elige materia y RA; con `responder` atiende la consulta automática con ese estado. */
  async function iniciarConSeleccion(
    resultados: ResultadoAprendizaje[],
    responder: ConclusionEstado | null = RESULTADO_VIGENTE,
  ) {
    await iniciar([MATERIA], [SEMESTRE_ACTIVO, SEMESTRE_INACTIVO]);
    await elegirMateria(MATERIA, resultados);
    elegirRa('ra-1');
    await fixture.whenStable();
    if (responder) {
      peticionConclusion().flush(responder);
      await fixture.whenStable();
      fixture.detectChanges();
    }
  }

  describe('consulta automática de la conclusión', () => {
    it('consulta una sola vez la conclusión al completar los tres filtros', async () => {
      await iniciarConSeleccion([ra(1)], null);

      const conclusion = peticionConclusion();
      expect(http.match((r) => r.url.includes('/conclusiones/estado'))).toHaveLength(0);
      // Esta página no pide el nivel de logro ni las acciones de mejora.
      http.expectNone((r) => r.url.includes('/estadisticas'));
      http.expectNone((r) => r.url.includes('/acciones-mejora'));
      conclusion.flush(RESULTADO_VIGENTE);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain(CONCLUSION.mensaje);
    });

    it('no consulta con filtros incompletos', async () => {
      await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
      await elegirMateria(MATERIA, [ra(1)]);

      http.expectNone((r) => r.url.includes('/conclusiones/estado'));
      expect(html.textContent).toContain('Elige materia, RA y semestre para ver la conclusión.');
    });

    it('cancela la consulta anterior y consulta con los nuevos ids al cambiar un filtro', async () => {
      await iniciarConSeleccion([ra(1)], null);
      const anterior = peticionConclusion();

      const selectorSemestre = html.querySelector('#selector-semestre') as HTMLSelectElement;
      selectorSemestre.value = SEMESTRE_INACTIVO.id;
      selectorSemestre.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(anterior.cancelled).toBe(true);
      peticionConclusion('ra-1', SEMESTRE_INACTIVO.id).flush(RESULTADO_VIGENTE);
    });

    it('no deja que una respuesta vieja sobrescriba la consulta más nueva', async () => {
      await iniciarConSeleccion([ra(1)], null);
      const anterior = peticionConclusion();

      const selectorSemestre = html.querySelector('#selector-semestre') as HTMLSelectElement;
      selectorSemestre.value = SEMESTRE_INACTIVO.id;
      selectorSemestre.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      peticionConclusion('ra-1', SEMESTRE_INACTIVO.id).flush({
        ...RESULTADO_SATISFACTORIO,
        totalEvaluados: 30,
      });
      await fixture.whenStable();
      fixture.detectChanges();

      expect(anterior.cancelled).toBe(true);
      expect(html.textContent).toContain('dentro de lo esperado');
      expect(html.textContent).not.toContain(CONCLUSION.mensaje);
    });

    it('permite reintentar la conclusión después de un error', async () => {
      await iniciarConSeleccion([ra(1)], null);
      peticionConclusion().flush(
        { mensaje: 'detalle técnico' },
        { status: 503, statusText: 'Service Unavailable' },
      );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('El servicio no está disponible');
      expect(html.textContent).not.toContain('detalle técnico');
      boton(html, 'Reintentar').click();
      await fixture.whenStable();
      peticionConclusion().flush(RESULTADO_SATISFACTORIO);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('dentro de lo esperado');
      expect(html.textContent).not.toContain('El servicio no está disponible');
    });

    it('cambiar de RA descarta la conclusión consultada', async () => {
      await iniciarConSeleccion([ra(1), ra(2)]);
      expect(html.textContent).toContain(CONCLUSION.mensaje);

      elegirRa('ra-2');
      await fixture.whenStable();
      fixture.detectChanges();
      expect(html.textContent).not.toContain(CONCLUSION.mensaje);

      peticionConclusion('ra-2').flush(RESULTADO_SATISFACTORIO);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('dentro de lo esperado');
    });
  });

  describe('consulta de la conclusión', () => {
    it('con conclusión vigente muestra el mensaje, el porcentaje y «Crear acción de mejora»', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar').click();
      await fixture.whenStable();
      peticionConclusion().flush(RESULTADO_VIGENTE);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain(CONCLUSION.mensaje);
      expect(html.textContent).toContain('45%');
      expect(boton(html, 'Crear acción de mejora')).toBeDefined();
    });

    it('un refresco de fondo no pone la pantalla en estado de carga y conserva los datos anteriores', async () => {
      await iniciarConSeleccion([ra(1)]);
      expect(html.textContent).toContain(CONCLUSION.mensaje);

      document.dispatchEvent(new Event('visibilitychange'));
      await fixture.whenStable();

      expect(html.textContent).not.toContain('Consultando…');
      expect(html.textContent).toContain(CONCLUSION.mensaje);

      peticionConclusion().flush(RESULTADO_VIGENTE);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).not.toContain('Consultando…');
      expect(html.textContent).toContain(CONCLUSION.mensaje);
    });

    it('si el refresco de fondo falla, conserva los datos anteriores sin mostrar error', async () => {
      await iniciarConSeleccion([ra(1)]);

      document.dispatchEvent(new Event('visibilitychange'));
      await fixture.whenStable();
      peticionConclusion().flush(
        { mensaje: 'detalle técnico' },
        { status: 500, statusText: 'Internal Server Error' },
      );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain(CONCLUSION.mensaje);
      expect(html.textContent).not.toContain('El servicio no está disponible');
    });

    it('con diagnóstico disponible muestra los números y la recomendación', async () => {
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
      await iniciarConSeleccion([ra(1)], {
        ...RESULTADO_VIGENTE,
        conclusion: CONCLUSION_CON_DIAGNOSTICO,
      });

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

      expect(html.textContent).toContain('Desempeño insuficiente');
      expect(html.textContent).toContain('45%');
      expect(html.textContent).not.toContain('quedaron por debajo del nivel esperado');
    });

    it('con estado ATENDIDA informa que el RA ya tiene una acción de mejora, sin ofrecer crear otra', async () => {
      await iniciarConSeleccion([ra(1)], RESULTADO_ATENDIDA);

      expect(html.textContent).toContain('Atendida');
      expect(html.textContent).toContain('ya tiene una acción de mejora registrada');
      expect(html.textContent).toContain('45%');
      expect(boton(html, 'Crear acción de mejora')).toBeUndefined();
    });

    it('con estado SATISFACTORIO muestra la buena noticia con el número de evaluados y el porcentaje', async () => {
      await iniciarConSeleccion([ra(1)], RESULTADO_SATISFACTORIO);

      expect(html.textContent).toContain('Satisfactorio');
      expect(html.textContent).toContain('dentro de lo esperado');
      expect(html.textContent).toContain('20');
      expect(html.textContent).toContain('10%');
      expect(boton(html, 'Crear acción de mejora')).toBeUndefined();
    });

    it('con estado SIN_DATOS_SUFICIENTES indica cuántas calificaciones hay y cuántas se necesitan', async () => {
      await iniciarConSeleccion([ra(1)], RESULTADO_SIN_DATOS);

      expect(html.textContent).toContain('Sin datos suficientes');
      expect(html.textContent).toContain('Todavía no hay suficientes calificaciones');
      expect(html.textContent).toContain('2');
      expect(html.textContent).toContain('no es un error');
      expect(boton(html, 'Crear acción de mejora')).toBeUndefined();
    });
  });

  describe('acción de mejora', () => {
    it('abre el diálogo de registro de acción de mejora', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Crear acción de mejora').click();
      await fixture.whenStable();

      const dialogo = html.querySelector('dialog');
      expect(dialogo?.hasAttribute('open')).toBe(true);
      expect(dialogo?.textContent).toContain('Registrar acción de mejora');
    });

    it('al registrar la acción avisa y vuelve a consultar la conclusión, que pasa a atendida', async () => {
      await iniciarConSeleccion([ra(1)]);
      boton(html, 'Crear acción de mejora').click();
      await fixture.whenStable();

      const dialogo = html.querySelector('dialog') as HTMLElement;
      const nombre = dialogo.querySelector('#accion-nombre') as HTMLInputElement;
      nombre.value = 'Taller de refuerzo';
      nombre.dispatchEvent(new Event('input'));
      const descripcion = dialogo.querySelector('#accion-descripcion') as HTMLTextAreaElement;
      descripcion.value = 'Taller para reforzar integrales';
      descripcion.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      (dialogo.querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await fixture.whenStable();

      http
        .expectOne(
          (r) =>
            r.url === `${API}/conclusiones/${CONCLUSION.id}/acciones-mejora` && r.method === 'POST',
        )
        .flush(NO_CONVERTIDA);
      await fixture.whenStable();
      peticionConclusion().flush(RESULTADO_ATENDIDA);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('Acción de mejora registrada correctamente.');
      expect(html.textContent).toContain('ya tiene una acción de mejora registrada');
      expect(boton(html, 'Crear acción de mejora')).toBeUndefined();
    });
  });
});
