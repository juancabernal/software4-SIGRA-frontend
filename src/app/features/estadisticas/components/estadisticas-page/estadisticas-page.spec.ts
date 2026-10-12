import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { Semestre } from '../../../semestres/models/semestre.model';
import { Conclusion } from '../../models/conclusion.model';
import { EstadisticasPage } from './estadisticas-page';

const API = `${environment.apiUrl}/v1`;
const URL_ASIGNATURAS = `${API}/asignaturas`;
const URL_SEMESTRES = `${API}/semestres`;
const URL_CONCLUSIONES = `${API}/conclusiones`;
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

  async function iniciarConSeleccion(resultados: ResultadoAprendizaje[]) {
    await iniciar([MATERIA], [SEMESTRE_ACTIVO, SEMESTRE_INACTIVO]);
    await elegirMateria(MATERIA, resultados);
    elegirRa('ra-1');
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
});
