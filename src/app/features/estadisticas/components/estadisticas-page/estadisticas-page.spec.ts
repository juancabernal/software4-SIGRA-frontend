import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { AccionMejora } from '../../../mejoras/models/accion-mejora.model';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { Semestre } from '../../../semestres/models/semestre.model';
import { Conclusion } from '../../models/conclusion.model';
import { EstadisticasPage } from './estadisticas-page';

const API = `${environment.apiUrl}/v1`;
const URL_ASIGNATURAS = `${API}/asignaturas`;
const URL_SEMESTRES = `${API}/semestres`;
const URL_CONCLUSIONES = `${API}/conclusiones`;
const URL_ACCIONES_MEJORA = `${API}/acciones-mejora`;
const urlRa = (asignaturaId: string) => `${API}/asignaturas/${asignaturaId}/resultados-aprendizaje`;

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

  describe('consulta de la conclusión', () => {
    it('con conclusión vigente muestra el mensaje, el porcentaje y «Crear acción de mejora»', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar conclusión').click();
      await fixture.whenStable();
      const req = http.expectOne(
        (r) => r.url === URL_CONCLUSIONES && r.params.get('estado') === 'VIGENTE',
      );
      expect(req.request.params.get('resultadoAprendizajeId')).toBe('ra-1');
      expect(req.request.params.get('semestreId')).toBe(SEMESTRE_ACTIVO.id);
      req.flush([CONCLUSION]);
      await fixture.whenStable();

      expect(html.textContent).toContain(CONCLUSION.mensaje);
      expect(html.textContent).toContain('45%');
      expect(boton(html, 'Crear acción de mejora')).toBeDefined();
    });

    it('sin conclusión vigente muestra el estado vacío y no ofrece «Crear acción de mejora»', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar conclusión').click();
      await fixture.whenStable();
      http.expectOne((r) => r.url === URL_CONCLUSIONES).flush([]);
      await fixture.whenStable();

      expect(html.textContent).toContain('Sin conclusión vigente');
      expect(boton(html, 'Crear acción de mejora')).toBeUndefined();
    });
  });

  describe('acción de mejora', () => {
    it('abre el diálogo de registro de acción de mejora', async () => {
      await iniciarConSeleccion([ra(1)]);

      boton(html, 'Consultar conclusión').click();
      await fixture.whenStable();
      http.expectOne((r) => r.url === URL_CONCLUSIONES).flush([CONCLUSION]);
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

      http.expectOne((r) => r.url === URL_ACCIONES_MEJORA && r.method === 'GET').flush([convertida]);
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
