import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SesionService } from '../../../../core/services/sesion';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { Semestre } from '../../../semestres/models/semestre.model';
import {
  MATERIA,
  SEMESTRE_ACTIVO,
  SEMESTRE_INACTIVO,
  URL_ASIGNATURAS,
  URL_SEMESTRES,
  ra,
  urlRa,
} from '../estadisticas-pruebas';
import { EstadisticasFiltros, FiltrosEstadisticas } from './estadisticas-filtros';

describe('EstadisticasFiltros', () => {
  let fixture: ComponentFixture<EstadisticasFiltros>;
  let http: HttpTestingController;
  let html: HTMLElement;
  let emitidos: FiltrosEstadisticas[];

  function crear(rol?: 'profesor'): void {
    TestBed.configureTestingModule({
      imports: [EstadisticasFiltros],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(rol ? [{ provide: SesionService, useValue: { rol: () => rol } }] : []),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EstadisticasFiltros);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    emitidos = [];
    fixture.componentInstance.cambio.subscribe((f) => emitidos.push(f));
  }

  async function iniciar(
    asignaturas: Asignatura[],
    semestres: Semestre[],
    urlSemestres = URL_SEMESTRES,
  ): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush(asignaturas);
    http.expectOne((r) => r.url === urlSemestres).flush(semestres);
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

  const elegir = (id: string, valor: string) => {
    const selector = html.querySelector(`#${id}`) as HTMLSelectElement;
    selector.value = valor;
    selector.dispatchEvent(new Event('change'));
  };
  const textos = (id: string) =>
    Array.from((html.querySelector(`#${id}`) as HTMLSelectElement).options).map((o) =>
      o.textContent?.trim(),
    );

  describe('con el administrador', () => {
    beforeEach(() => crear());

    afterEach(() => {
      fixture.destroy();
      html.remove();
      http.verify();
    });

    describe('carga inicial', () => {
      it('trae materias y semestres, y preselecciona el semestre ACTIVO', async () => {
        await iniciar([MATERIA], [SEMESTRE_INACTIVO, SEMESTRE_ACTIVO]);

        expect(textos('selector-materia')).toEqual([
          'Selecciona una materia',
          'MAT1 · Matemáticas I',
        ]);
        const selectorSemestre = html.querySelector('#selector-semestre') as HTMLSelectElement;
        expect(
          Array.from(selectorSemestre.options).find((o) => o.value === SEMESTRE_ACTIVO.id)
            ?.textContent,
        ).toContain('(activo)');
        expect(selectorSemestre.value).toBe(SEMESTRE_ACTIVO.id);
        expect(html.textContent).not.toContain('No tienes semestres con asignaturas');
      });

      it('avisa a la página del semestre activo preseleccionado', async () => {
        await iniciar([MATERIA], [SEMESTRE_INACTIVO, SEMESTRE_ACTIVO]);

        expect(emitidos).toEqual([
          { asignaturaId: '', resultadoAprendizajeId: '', semestreId: SEMESTRE_ACTIVO.id },
        ]);
      });

      it('sin materias muestra el estado vacío y no ofrece selectores', async () => {
        await iniciar([], [SEMESTRE_ACTIVO]);

        expect(html.textContent).toContain('No hay materias registradas');
        expect(html.querySelector('#selector-materia')).toBeNull();
      });

      it('si fallan las materias permite reintentar', async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        http
          .expectOne((r) => r.url === URL_ASIGNATURAS)
          .flush({ mensaje: 'x' }, { status: 503, statusText: 'Service Unavailable' });
        http.expectOne((r) => r.url === URL_SEMESTRES).flush([SEMESTRE_ACTIVO]);
        await fixture.whenStable();
        fixture.detectChanges();

        expect(html.textContent).toContain('El servicio no está disponible');
        (html.querySelector('[role="alert"] button') as HTMLButtonElement).click();
        http.expectOne((r) => r.url === URL_ASIGNATURAS).flush([MATERIA]);
        await fixture.whenStable();
        fixture.detectChanges();

        expect(html.querySelector('#selector-materia')).not.toBeNull();
      });
    });

    describe('filtro de facultad', () => {
      const DE_DERECHO: Asignatura = {
        ...MATERIA,
        id: 'a2',
        codigo: 'DER1',
        nombre: 'Derecho Civil',
        programaId: 'p2',
        programaNombre: 'Derecho',
        facultadId: 'f2',
        facultadNombre: 'Facultad de Derecho',
      };
      async function elegirFacultad(valor: string): Promise<void> {
        elegir('selector-facultad', valor);
        await fixture.whenStable();
        fixture.detectChanges();
      }
      const materiasDe = (facultadId: string) =>
        http.expectOne(
          (r) => r.url === URL_ASIGNATURAS && r.params.get('facultadId') === facultadId,
        );

      it('ofrece las facultades de las materias, sin duplicados y por nombre, antes de la materia', async () => {
        await iniciar(
          [MATERIA, DE_DERECHO, { ...MATERIA, id: 'a3', codigo: 'MAT2' }],
          [SEMESTRE_ACTIVO],
        );

        expect(textos('selector-facultad')).toEqual([
          'Todas las facultades',
          'Facultad de Derecho',
          'Facultad de Ingeniería',
        ]);
        const ids = Array.from(html.querySelectorAll('select')).map((s) => s.id);
        expect(ids.indexOf('selector-facultad')).toBeLessThan(ids.indexOf('selector-materia'));
      });

      it('al elegir una facultad pide al backend sus materias y conserva las opciones', async () => {
        await iniciar([MATERIA, DE_DERECHO], [SEMESTRE_ACTIVO]);

        await elegirFacultad('f2');
        materiasDe('f2').flush([DE_DERECHO]);
        await fixture.whenStable();
        fixture.detectChanges();

        expect(textos('selector-materia')).toEqual([
          'Selecciona una materia',
          'DER1 · Derecho Civil',
        ]);
        expect(textos('selector-facultad').length).toBe(3);
      });

      it('al cambiar de facultad descarta la materia y el RA elegidos si son de otra, y lo avisa', async () => {
        await iniciar([MATERIA, DE_DERECHO], [SEMESTRE_ACTIVO]);
        await elegirMateria(MATERIA, []);
        emitidos.length = 0;

        await elegirFacultad('f2');
        materiasDe('f2').flush([DE_DERECHO]);
        await fixture.whenStable();
        fixture.detectChanges();

        expect((html.querySelector('#selector-materia') as HTMLSelectElement).value).toBe('');
        expect(emitidos.at(-1)).toEqual({
          asignaturaId: '',
          resultadoAprendizajeId: '',
          semestreId: SEMESTRE_ACTIVO.id,
        });
      });

      it('volver a «Todas las facultades» no consulta de nuevo y muestra todas las materias', async () => {
        await iniciar([MATERIA, DE_DERECHO], [SEMESTRE_ACTIVO]);
        await elegirFacultad('f2');
        materiasDe('f2').flush([DE_DERECHO]);
        await fixture.whenStable();

        await elegirFacultad('');
        http.expectNone((r) => r.url === URL_ASIGNATURAS);
        expect(textos('selector-materia')).toEqual([
          'Selecciona una materia',
          'MAT1 · Matemáticas I',
          'DER1 · Derecho Civil',
        ]);
      });

      it('una facultad sin materias lo indica y no muestra el estado de «no hay materias»', async () => {
        await iniciar([MATERIA, DE_DERECHO], [SEMESTRE_ACTIVO]);
        await elegirFacultad('f2');
        materiasDe('f2').flush([]);
        await fixture.whenStable();
        fixture.detectChanges();

        expect(textos('selector-materia')).toEqual(['Sin materias en esta facultad']);
        expect(html.textContent).not.toContain('No hay materias registradas');
      });
    });

    describe('selector de RA', () => {
      it('carga solo los RA en estado ACTIVO de la materia elegida', async () => {
        await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
        await elegirMateria(MATERIA, [ra(1), ra(2, 'INACTIVO'), ra(3)]);

        const codigos = textos('selector-ra').slice(1);
        expect(codigos).toEqual(['RA1', 'RA3']);
      });

      it('sin RA activos lo indica y deshabilita el selector', async () => {
        await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
        await elegirMateria(MATERIA, [ra(1, 'INACTIVO')]);

        expect(textos('selector-ra')).toEqual(['Esta materia no tiene RA activos']);
        expect((html.querySelector('#selector-ra') as HTMLSelectElement).disabled).toBe(true);
      });
    });

    describe('aviso de cambios a la página', () => {
      it('emite la selección completa cada vez que se modifica un filtro', async () => {
        await iniciar([MATERIA], [SEMESTRE_ACTIVO, SEMESTRE_INACTIVO]);
        emitidos.length = 0;

        await elegirMateria(MATERIA, [ra(1)]);
        expect(emitidos.at(-1)).toEqual({
          asignaturaId: MATERIA.id,
          resultadoAprendizajeId: '',
          semestreId: SEMESTRE_ACTIVO.id,
        });

        elegir('selector-ra', 'ra-1');
        expect(emitidos.at(-1)).toEqual({
          asignaturaId: MATERIA.id,
          resultadoAprendizajeId: 'ra-1',
          semestreId: SEMESTRE_ACTIVO.id,
        });

        elegir('selector-semestre', SEMESTRE_INACTIVO.id);
        expect(emitidos.at(-1)).toEqual({
          asignaturaId: MATERIA.id,
          resultadoAprendizajeId: 'ra-1',
          semestreId: SEMESTRE_INACTIVO.id,
        });
      });

      it('al cambiar de materia descarta el RA elegido', async () => {
        await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
        await elegirMateria(MATERIA, [ra(1)]);
        elegir('selector-ra', 'ra-1');

        elegir('selector-materia', '');
        expect(emitidos.at(-1)?.resultadoAprendizajeId).toBe('');
      });
    });
  });

  describe('como Profesor (Mantis 0000045)', () => {
    beforeEach(() => crear('profesor'));

    afterEach(() => {
      fixture.destroy();
      html.remove();
      http.verify();
    });

    it('muestra primero el semestre y solo ofrece los semestres en los que tiene asignaturas', async () => {
      await iniciar([MATERIA], [SEMESTRE_ACTIVO], `${URL_SEMESTRES}/mios`);
      http.expectNone((r) => r.url === URL_SEMESTRES);

      const ids = Array.from(html.querySelectorAll('select')).map((s) => s.id);
      expect(ids.indexOf('selector-semestre')).toBeLessThan(ids.indexOf('selector-materia'));
      expect(ids.indexOf('selector-materia')).toBeLessThan(ids.indexOf('selector-ra'));

      const semestre = html.querySelector('#selector-semestre') as HTMLSelectElement;
      expect(Array.from(semestre.options).map((o) => o.value)).toEqual(['', SEMESTRE_ACTIVO.id]);
      expect(semestre.value).toBe(SEMESTRE_ACTIVO.id);
    });

    it('sin semestres con asignaturas lo avisa y no deja nada elegido', async () => {
      await iniciar([MATERIA], [], `${URL_SEMESTRES}/mios`);

      const semestre = html.querySelector('#selector-semestre') as HTMLSelectElement;
      expect(Array.from(semestre.options).map((o) => o.value)).toEqual(['']);
      expect(semestre.value).toBe('');
      expect(html.querySelector('[role="alert"]')).toBeNull();
      expect(html.textContent).toContain('No tienes semestres con asignaturas');
      expect(html.textContent).toContain(
        'Aparecen aquí los semestres en los que tienes asignaturas asignadas.',
      );
    });

    it('con materia y RA pero sin semestre la selección que se avisa no tiene semestre', async () => {
      await iniciar([MATERIA], [], `${URL_SEMESTRES}/mios`);
      await elegirMateria(MATERIA, [ra(1)]);
      elegir('selector-ra', 'ra-1');

      expect(emitidos.at(-1)).toEqual({
        asignaturaId: MATERIA.id,
        resultadoAprendizajeId: 'ra-1',
        semestreId: '',
      });
    });
  });
});
