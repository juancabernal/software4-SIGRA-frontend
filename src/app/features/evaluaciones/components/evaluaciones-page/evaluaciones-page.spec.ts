import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { SesionService } from '../../../../core/services/sesion';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import {
  AsignaturaOpcion,
  Evaluacion,
  EvaluacionesRaResumen,
  SemestreOpcion,
} from '../../models/evaluacion.model';
import { EvaluacionesPage, MOTIVO_REACTIVAR, MOTIVO_SIN_DISPONIBLE } from './evaluaciones-page';

const API = `${environment.apiUrl}/v1`;

function isoConDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

const EN_CURSO: SemestreOpcion = {
  id: 's-actual',
  codigo: '2026-2',
  fechaInicio: isoConDias(-30),
  fechaFin: isoConDias(60),
};
const PASADO: SemestreOpcion = {
  id: 's-pasado',
  codigo: '2026-1',
  fechaInicio: isoConDias(-200),
  fechaFin: isoConDias(-60),
};

const MATERIA: AsignaturaOpcion = {
  id: 'm1',
  codigo: 'ISW4',
  nombre: 'Ingeniería de Software IV',
  programaNombre: 'Ingeniería de Sistemas',
  facultadId: 'f1',
  facultadNombre: 'Facultad de Ingeniería',
  estado: 'ACTIVA',
};

function ra(
  codigo: string,
  estado: ResultadoAprendizaje['estado'] = 'ACTIVO',
): ResultadoAprendizaje {
  return {
    id: `ra-${codigo}`,
    asignaturaId: 'm1',
    codigo,
    descripcion: `Descripción de ${codigo}`,
    estado,
  };
}

function evaluacion(n: number, parcial: Partial<Evaluacion> = {}): Evaluacion {
  return {
    id: `ev-${n}`,
    resultadoAprendizajeId: 'ra-RA1',
    semestreId: 's-actual',
    semestreCodigo: '2026-2',
    nombre: `Evaluación ${n}`,
    fechaTentativa: EN_CURSO.fechaInicio,
    porcentaje: 10,
    descripcion: `Descripción ${n}`,
    estado: 'ACTIVA',
    tieneCalificaciones: false,
    ...parcial,
  };
}

function resumen(evaluaciones: Evaluacion[], asignado: number): EvaluacionesRaResumen {
  return {
    resultadoAprendizajeId: 'ra-RA1',
    semestreId: 's-actual',
    semestreCodigo: '2026-2',
    porcentajeAsignado: asignado,
    porcentajeDisponible: 100 - asignado,
    evaluaciones,
  };
}

describe('EvaluacionesPage', () => {
  let fixture: ComponentFixture<EvaluacionesPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EvaluacionesPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EvaluacionesPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const urlEvaluaciones = (semestreId: string) =>
    `${API}/resultados-aprendizaje/ra-RA1/evaluaciones?semestreId=${semestreId}`;
  const selector = (id: string) => html.querySelector(`#${id}`) as HTMLSelectElement;
  const fila = (nombre: string) =>
    Array.from(html.querySelectorAll('tbody tr')).find((tr) =>
      tr.querySelector('.nombre')?.textContent?.includes(nombre),
    ) as HTMLTableRowElement;
  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  async function cambiar(id: string, valor: string): Promise<void> {
    const control = selector(id);
    control.value = valor;
    control.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function cargarCatalogos(
    materias: AsignaturaOpcion[] = [MATERIA],
    semestres: SemestreOpcion[] = [EN_CURSO, PASADO],
  ): Promise<void> {
    await fixture.whenStable();
    http.expectNone((r) => r.url === `${API}/asignaturas`);
    http.expectOne(`${API}/semestres`).flush(semestres);
    await fixture.whenStable();
    if (semestres.length) {
      http.expectOne((r) => r.url === `${API}/asignaturas` && r.params.get('semestreId') === 's-actual').flush(materias);
      await fixture.whenStable();
    }
  }

  async function iniciar(datos: EvaluacionesRaResumen): Promise<void> {
    await cargarCatalogos();
    await cambiar('selector-materia', 'm1');
    http
      .expectOne(`${API}/asignaturas/m1/resultados-aprendizaje`)
      .flush([ra('RA1'), ra('RA2', 'INACTIVO')]);
    await fixture.whenStable();
    await cambiar('selector-ra', 'ra-RA1');
    http.expectOne(urlEvaluaciones('s-actual')).flush(datos);
    await fixture.whenStable();
  }

  it('por defecto elige el semestre en curso y marca los demás como solo consulta', async () => {
    await cargarCatalogos();

    expect(selector('selector-semestre').value).toBe('s-actual');
    // La opción en pantalla es la del semestre en curso, no la primera de la lista.
    const marcada = Array.from(selector('selector-semestre').options).find((o) => o.selected);
    expect(marcada?.textContent?.trim()).toBe('2026-2 · en curso');
    const opciones = Array.from(selector('selector-semestre').options).map((o) =>
      o.textContent?.trim(),
    );
    expect(opciones).toEqual(['2026-2 · en curso', '2026-1 · solo consulta']);
    expect(html.textContent).toContain('Elige una materia y un resultado de aprendizaje');
  });

  it('muestra el semestre antes que la materia y el RA (Mantis 0000045)', async () => {
    await cargarCatalogos();

    const ids = Array.from(html.querySelectorAll('.filtros select')).map((s) => s.id);
    expect(ids).toEqual(['selector-semestre', 'selector-facultad', 'selector-materia', 'selector-ra']);
  });

  describe('filtro de facultad', () => {
    const DE_DERECHO: AsignaturaOpcion = {
      ...MATERIA,
      id: 'm2',
      codigo: 'DER1',
      nombre: 'Derecho Civil',
      programaNombre: 'Derecho',
      facultadId: 'f2',
      facultadNombre: 'Facultad de Derecho',
    };
    const materiasDe = (facultadId: string) =>
      http.expectOne(
        (r) =>
          r.url === `${API}/asignaturas` &&
          r.params.get('semestreId') === 's-actual' &&
          r.params.get('facultadId') === facultadId,
      );
    const textos = (id: string) =>
      Array.from(selector(id).options).map((o) => o.textContent?.trim());

    it('ofrece las facultades de las materias del semestre, sin duplicados y por nombre', async () => {
      await cargarCatalogos([MATERIA, DE_DERECHO, { ...MATERIA, id: 'm3', codigo: 'ISW5' }]);

      expect(textos('selector-facultad')).toEqual([
        'Todas las facultades',
        'Facultad de Derecho',
        'Facultad de Ingeniería',
      ]);
    });

    it('al elegir una facultad pide al backend sus materias y conserva las opciones', async () => {
      await cargarCatalogos([MATERIA, DE_DERECHO]);

      await cambiar('selector-facultad', 'f2');
      materiasDe('f2').flush([DE_DERECHO]);
      await fixture.whenStable();

      expect(textos('selector-materia')).toEqual(['Selecciona una materia', 'DER1 · Derecho Civil']);
      expect(textos('selector-facultad').length).toBe(3);
    });

    it('al cambiar de facultad descarta la materia y el RA elegidos si son de otra', async () => {
      await cargarCatalogos([MATERIA, DE_DERECHO]);
      await cambiar('selector-materia', 'm1');
      http.expectOne(`${API}/asignaturas/m1/resultados-aprendizaje`).flush([ra('RA1')]);
      await fixture.whenStable();

      await cambiar('selector-facultad', 'f2');
      materiasDe('f2').flush([DE_DERECHO]);
      await fixture.whenStable();

      expect(selector('selector-materia').value).toBe('');
      expect(selector('selector-ra').disabled).toBe(true);
    });

    it('una facultad sin materias lo indica en el selector de materia', async () => {
      await cargarCatalogos([MATERIA, DE_DERECHO]);
      await cambiar('selector-facultad', 'f2');
      materiasDe('f2').flush([]);
      await fixture.whenStable();

      expect(textos('selector-materia')).toEqual(['Sin materias en esta facultad']);
    });

    it('al cambiar de semestre vuelve a «Todas las facultades»', async () => {
      await cargarCatalogos([MATERIA, DE_DERECHO]);
      await cambiar('selector-facultad', 'f2');
      materiasDe('f2').flush([DE_DERECHO]);
      await fixture.whenStable();

      await cambiar('selector-semestre', 's-pasado');
      const req = http.expectOne(
        (r) => r.url === `${API}/asignaturas` && r.params.get('semestreId') === 's-pasado',
      );
      expect(req.request.params.has('facultadId')).toBe(false);
      req.flush([MATERIA]);
      await fixture.whenStable();
      expect(selector('selector-facultad').value).toBe('');
    });
  });

  it('muestra un estado vacío si no hay materias activas', async () => {
    await cargarCatalogos([]);
    expect(html.textContent).toContain('Sin materias en este semestre');
  });

  it('solo ofrece los RA activos de la materia', async () => {
    await cargarCatalogos();
    await cambiar('selector-materia', 'm1');
    http
      .expectOne(`${API}/asignaturas/m1/resultados-aprendizaje`)
      .flush([ra('RA1'), ra('RA2', 'INACTIVO')]);
    await fixture.whenStable();

    const opciones = Array.from(selector('selector-ra').options).map((o) => o.textContent?.trim());
    expect(opciones).toEqual(['Selecciona un RA', 'RA1 · Descripción de RA1']);
  });

  it('lista las evaluaciones con el porcentaje asignado y disponible', async () => {
    await iniciar(
      resumen([evaluacion(1, { porcentaje: 30 }), evaluacion(2, { porcentaje: 45 })], 75),
    );

    expect(html.querySelectorAll('tbody tr').length).toBe(2);
    const cifras = html.querySelector('.progreso__cifras')?.textContent?.replace(/\s+/g, ' ');
    expect(cifras).toContain('Asignado 75 %');
    expect(cifras).toContain('Disponible 25 %');
    const barra = html.querySelector('[role="progressbar"]') as HTMLElement;
    expect(barra.getAttribute('aria-valuenow')).toBe('75');
    expect(boton(html, 'Registrar evaluación').getAttribute('aria-disabled')).toBeNull();
  });

  it('con el 100 % asignado bloquea el registro y explica el motivo', async () => {
    await iniciar(resumen([evaluacion(1, { porcentaje: 100 })], 100));

    expect(boton(html, 'Registrar evaluación').getAttribute('aria-disabled')).toBe('true');
    expect(html.querySelector('#tooltip-registrar')?.textContent).toContain(MOTIVO_SIN_DISPONIBLE);
  });

  it('bloquea reactivar si el porcentaje de la evaluación supera lo disponible', async () => {
    await iniciar(
      resumen(
        [
          evaluacion(1, { porcentaje: 90 }),
          evaluacion(2, { porcentaje: 20, estado: 'INACTIVA' }),
          evaluacion(3, { porcentaje: 10, estado: 'INACTIVA' }),
        ],
        90,
      ),
    );

    expect(boton(fila('Evaluación 2'), 'Reactivar').getAttribute('aria-disabled')).toBe('true');
    expect(fila('Evaluación 2').textContent).toContain(MOTIVO_REACTIVAR);
    expect(boton(fila('Evaluación 3'), 'Reactivar').getAttribute('aria-disabled')).toBeNull();
    expect(fila('Evaluación 2').classList.contains('fila--inactiva')).toBe(true);
  });

  it('marca las evaluaciones que ya tienen calificaciones', async () => {
    await iniciar(resumen([evaluacion(1, { tieneCalificaciones: true })], 10));
    expect(fila('Evaluación 1').textContent).toContain('Con calificaciones');
  });

  it('pagina de a 5 y permite ver 10 por página', async () => {
    await iniciar(
      resumen(
        Array.from({ length: 7 }, (_, i) => evaluacion(i + 1)),
        70,
      ),
    );

    expect(html.querySelectorAll('tbody tr').length).toBe(5);
    expect(html.textContent).toContain('Mostrando 1–5 de 7 evaluaciones');

    const tamano = html.querySelector('.paginacion select') as HTMLSelectElement;
    tamano.value = '10';
    tamano.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(html.querySelectorAll('tbody tr').length).toBe(7);
  });

  it('un semestre pasado es solo de consulta: sin acciones ni registro', async () => {
    await iniciar(resumen([evaluacion(1)], 10));

    await cambiar('selector-semestre', 's-pasado');
    expect(selector('selector-materia').value).toBe('');
    expect(selector('selector-ra').value).toBe('');
    http.expectNone(urlEvaluaciones('s-pasado'));
    http.expectOne(`${API}/asignaturas?estado=ACTIVA&semestreId=s-pasado`).flush([MATERIA]);
    await fixture.whenStable();
    await cambiar('selector-materia', 'm1');
    http.expectOne(`${API}/asignaturas/m1/resultados-aprendizaje`).flush([ra('RA1')]);
    await fixture.whenStable();
    await cambiar('selector-ra', 'ra-RA1');
    http.expectOne(urlEvaluaciones('s-pasado')).flush({
      ...resumen([evaluacion(9, { semestreId: 's-pasado', semestreCodigo: '2026-1' })], 10),
      semestreId: 's-pasado',
      semestreCodigo: '2026-1',
    });
    await fixture.whenStable();

    expect(html.textContent).toContain('Semestre 2026-1: solo consulta.');
    expect(boton(html, 'Registrar evaluación')).toBeUndefined();
    expect(boton(fila('Evaluación 9'), 'Modificar')).toBeUndefined();
  });

  it('inactiva tras confirmar, recarga y muestra el aviso', async () => {
    await iniciar(resumen([evaluacion(1, { porcentaje: 30 })], 30));

    boton(fila('Evaluación 1'), 'Inactivar').click();
    await fixture.whenStable();
    const dialogo = html.querySelector('dialog.dialogo') as HTMLDialogElement;
    expect(dialogo.textContent).toContain('¿Inactivar «Evaluación 1»?');

    boton(dialogo, 'Inactivar').click();
    await fixture.whenStable();
    const req = http.expectOne(`${API}/evaluaciones/ev-1/inactivar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(evaluacion(1, { estado: 'INACTIVA' }));
    await fixture.whenStable();

    http
      .expectOne(urlEvaluaciones('s-actual'))
      .flush(resumen([evaluacion(1, { estado: 'INACTIVA' })], 0));
    await fixture.whenStable();
    expect(html.querySelector('.aviso')?.textContent).toContain(
      'Evaluación «Evaluación 1» inactivada.',
    );
  });

  it('si el backend rechaza la reactivación, muestra su mensaje en el diálogo', async () => {
    await iniciar(resumen([evaluacion(1, { estado: 'INACTIVA' })], 0));

    boton(fila('Evaluación 1'), 'Reactivar').click();
    await fixture.whenStable();
    const dialogo = html.querySelector('dialog.dialogo') as HTMLDialogElement;
    boton(dialogo, 'Reactivar').click();
    await fixture.whenStable();
    http
      .expectOne(`${API}/evaluaciones/ev-1/reactivar`)
      .flush(
        { mensaje: 'El resultado de aprendizaje está inactivo.' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(dialogo.querySelector('[role="alert"]')?.textContent).toContain(
      'El resultado de aprendizaje está inactivo.',
    );
    // El rechazo pone al día la vista de fondo, sin «Cargando…».
    expect(html.textContent).not.toContain('Cargando evaluaciones');
    http.expectOne(`${API}/asignaturas/m1/resultados-aprendizaje`).flush([ra('RA1')]);
    http
      .expectOne(urlEvaluaciones('s-actual'))
      .flush(resumen([evaluacion(1, { estado: 'INACTIVA' })], 0));
    await fixture.whenStable();
  });
  describe('refresco automático', () => {
    afterEach(() => vi.restoreAllMocks());

    /** Simula volver a la pestaña: el refresco automático dispara de inmediato. */
    async function refrescar(): Promise<void> {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      await fixture.whenStable();
    }

    function responderCatalogos(materias: AsignaturaOpcion[] = [MATERIA]): void {
      http.expectOne(`${API}/asignaturas?estado=ACTIVA&semestreId=s-actual`).flush(materias);
      http.expectOne(`${API}/semestres`).flush([EN_CURSO, PASADO]);
    }

    it('actualiza evaluaciones y porcentaje en segundo plano, sin «Cargando…»', async () => {
      await iniciar(resumen([evaluacion(1, { porcentaje: 30 })], 30));

      await refrescar();
      expect(html.textContent).not.toContain('Cargando');
      responderCatalogos();
      http.expectOne(`${API}/asignaturas/m1/resultados-aprendizaje`).flush([ra('RA1')]);
      http
        .expectOne(urlEvaluaciones('s-actual'))
        .flush(resumen([evaluacion(1, { porcentaje: 30 }), evaluacion(2, { porcentaje: 50 })], 80));
      await fixture.whenStable();

      expect(html.querySelectorAll('tbody tr').length).toBe(2);
      expect(html.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('80');
    });

    it('conserva la página y el tamaño elegidos', async () => {
      const siete = Array.from({ length: 7 }, (_, i) => evaluacion(i + 1));
      await iniciar(resumen(siete, 70));
      boton(html, 'Siguiente ›').click();
      await fixture.whenStable();

      await refrescar();
      responderCatalogos();
      http.expectOne(`${API}/asignaturas/m1/resultados-aprendizaje`).flush([ra('RA1')]);
      http.expectOne(urlEvaluaciones('s-actual')).flush(resumen(siete, 70));
      await fixture.whenStable();

      expect(html.textContent).toContain('Página 2 de 2');
    });

    it('no refresca mientras hay un formulario abierto', async () => {
      await iniciar(resumen([], 0));
      boton(html, 'Registrar evaluación').click();
      await fixture.whenStable();

      await refrescar();
      http.expectNone(`${API}/asignaturas?estado=ACTIVA`);
      http.expectNone(urlEvaluaciones('s-actual'));
    });

    it('si el RA elegido dejó de estar activo, avisa y limpia la selección', async () => {
      await iniciar(resumen([evaluacion(1)], 10));

      await refrescar();
      responderCatalogos();
      http.expectOne(`${API}/asignaturas/m1/resultados-aprendizaje`).flush([ra('RA1', 'INACTIVO')]);
      // La consulta de evaluaciones que salió con el refresco se descarta al quitar el RA.
      http.match(urlEvaluaciones('s-actual'));
      await fixture.whenStable();

      expect(html.querySelector('.aviso--error')?.textContent).toContain(
        'El RA RA1 ya no está activo',
      );
      expect(selector('selector-ra').value).toBe('');
    });

    it('si la materia elegida dejó de estar activa, avisa y limpia la selección', async () => {
      await iniciar(resumen([evaluacion(1)], 10));

      await refrescar();
      responderCatalogos([]);
      http.match(`${API}/asignaturas/m1/resultados-aprendizaje`);
      http.match(urlEvaluaciones('s-actual'));
      await fixture.whenStable();

      expect(html.querySelector('.aviso--error')?.textContent).toContain(
        'La materia ISW4 ya no está activa',
      );
    });
  });
});

describe('EvaluacionesPage con un Profesor sin semestres (Mantis 0000045)', () => {
  let fixture: ComponentFixture<EvaluacionesPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EvaluacionesPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SesionService, useValue: { rol: () => 'profesor' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EvaluacionesPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    fixture.destroy();
    html.remove();
    http.verify();
  });

  const selector = (id: string) => html.querySelector(`#${id}`) as HTMLSelectElement;

  async function cargarCatalogos(): Promise<void> {
    await fixture.whenStable();
    http.expectOne(`${API}/semestres/mios`).flush([]);
    http.expectNone(`${API}/semestres`);
    await fixture.whenStable();
    http.expectNone((r) => r.url === `${API}/asignaturas`);
  }

  it('pide solo sus semestres y, sin ninguno, deja el selector vacío y muestra el aviso', async () => {
    await cargarCatalogos();

    expect(selector('selector-semestre').options.length).toBe(0);
    expect(selector('selector-semestre').value).toBe('');
    expect(html.textContent).toContain('No tienes semestres con asignaturas');
    expect(html.textContent).not.toContain('No hay semestres registrados');
  });

  it('sin semestre bloquea materia y RA y no consulta evaluaciones', async () => {
    await cargarCatalogos();
    expect(selector('selector-materia').disabled).toBe(true);
    expect(selector('selector-ra').disabled).toBe(true);
    http.expectNone((r) => r.url.includes('/evaluaciones'));
    expect(html.querySelector('table')).toBeNull();
  });

  it('mantiene los selectores y explica que no hay semestres asignados', async () => {
    await cargarCatalogos();
    expect(html.textContent).toContain('No tienes semestres con asignaturas');
    expect(selector('selector-semestre')).not.toBeNull();
    expect(selector('selector-materia').disabled).toBe(true);
  });
});
