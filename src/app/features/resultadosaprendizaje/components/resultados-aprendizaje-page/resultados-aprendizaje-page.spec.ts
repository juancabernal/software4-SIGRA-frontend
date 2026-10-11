import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { AsignaturaOpcion, ResultadoAprendizaje } from '../../models/resultado-aprendizaje.model';
import {
  MOTIVO_MAXIMO,
  MOTIVO_MINIMO,
  ResultadosAprendizajePage,
  indicadorRango,
  paraBuscar,
} from './resultados-aprendizaje-page';

const API = `${environment.apiUrl}/v1`;
const URL_ASIGNATURAS = `${API}/asignaturas`;

const BORRADOR: AsignaturaOpcion = {
  id: 'b1',
  codigo: 'ISW4',
  nombre: 'Ingeniería de Software IV',
  programaId: 'p-sis',
  programaNombre: 'Ingeniería de Sistemas',
  estado: 'BORRADOR',
  cantidadRa: 0,
};
const ACTIVA: AsignaturaOpcion = {
  id: 'a1',
  codigo: 'MAT1',
  nombre: 'Matemáticas I',
  programaId: 'p-civ',
  programaNombre: 'Ingeniería Civil',
  estado: 'ACTIVA',
  cantidadRa: 5,
};

function ra(n: number, estado: ResultadoAprendizaje['estado'] = 'ACTIVO'): ResultadoAprendizaje {
  return {
    id: `ra-${n}`,
    asignaturaId: 'x',
    codigo: `RA${n}`,
    descripcion: `Descripción ${n}`,
    estado,
  };
}

const activos = (n: number) => Array.from({ length: n }, (_, i) => ra(i + 1));

describe('indicadorRango', () => {
  it('avisa cuántos faltan por debajo del mínimo', () => {
    expect(indicadorRango(3).texto).toBe('Faltan 2 para el mínimo (5)');
    expect(indicadorRango(4).texto).toBe('Falta 1 para el mínimo (5)');
    expect(indicadorRango(4).variante).toBe('advertencia');
  });

  it('distingue el rango válido del máximo', () => {
    expect(indicadorRango(5).texto).toBe('Dentro del rango');
    expect(indicadorRango(6).variante).toBe('ok');
    expect(indicadorRango(7).texto).toBe('Máximo alcanzado');
  });
});

describe('paraBuscar', () => {
  it('ignora mayúsculas, tildes y espacios de los extremos', () => {
    expect(paraBuscar('  Matemáticas I ')).toBe('matematicas i');
  });
});

describe('ResultadosAprendizajePage', () => {
  let fixture: ComponentFixture<ResultadosAprendizajePage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ResultadosAprendizajePage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ResultadosAprendizajePage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const urlRa = (asignaturaId: string) =>
    `${API}/asignaturas/${asignaturaId}/resultados-aprendizaje`;
  const opcionesMaterias = () =>
    Array.from((html.querySelector('#selector-materia') as HTMLSelectElement).options)
      .slice(1)
      .map((o) => o.textContent?.trim());
  const fila = (codigo: string) =>
    Array.from(html.querySelectorAll('tbody tr')).find(
      (tr) => tr.querySelector('th')?.textContent?.trim() === codigo,
    ) as HTMLTableRowElement;
  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  async function cargarAsignaturas(borrador: AsignaturaOpcion[], activa: AsignaturaOpcion[]) {
    await fixture.whenStable();
    http.expectOne(`${URL_ASIGNATURAS}?estado=BORRADOR`).flush(borrador);
    http.expectOne(`${URL_ASIGNATURAS}?estado=ACTIVA`).flush(activa);
    await fixture.whenStable();
  }

  async function elegir(asignatura: AsignaturaOpcion, resultados: ResultadoAprendizaje[]) {
    const selector = html.querySelector('#selector-materia') as HTMLSelectElement;
    selector.value = asignatura.id;
    selector.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    http.expectOne(urlRa(asignatura.id)).flush(resultados);
    await fixture.whenStable();
  }

  async function iniciar(asignatura: AsignaturaOpcion, resultados: ResultadoAprendizaje[]) {
    await cargarAsignaturas([BORRADOR], [ACTIVA]);
    await elegir(asignatura, resultados);
  }

  describe('selector de materia', () => {
    it('ofrece materias en BORRADOR y ACTIVA, ordenadas por código y con su estado', async () => {
      await cargarAsignaturas([BORRADOR], [ACTIVA]);

      const opciones = Array.from(
        (html.querySelector('#selector-materia') as HTMLSelectElement).options,
      ).map((o) => o.textContent?.trim());
      expect(opciones).toEqual([
        'Selecciona una materia',
        'ISW4 · Ingeniería de Software IV (Borrador)',
        'MAT1 · Matemáticas I (Activa)',
      ]);
      expect(html.textContent).toContain('Elige una materia en el selector');
    });

    it('muestra un estado vacío si no hay materias gestionables', async () => {
      await cargarAsignaturas([], []);
      expect(html.textContent).toContain('No hay materias para gestionar');
    });

    it('muestra el error de carga y permite reintentar', async () => {
      await fixture.whenStable();
      http
        .expectOne(`${URL_ASIGNATURAS}?estado=BORRADOR`)
        .flush(null, { status: 0, statusText: 'Unknown Error' });
      http.match(`${URL_ASIGNATURAS}?estado=ACTIVA`);
      await fixture.whenStable();

      expect(html.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudo conectar con el servidor',
      );
      boton(html, 'Reintentar').click();
      await cargarAsignaturas([BORRADOR], []);
      expect(html.querySelector('#selector-materia')).not.toBeNull();
    });
  });

  describe('filtros de materias', () => {
    it('lista los programas de las materias cargadas, sin repetir y ordenados', async () => {
      await cargarAsignaturas([BORRADOR], [ACTIVA]);

      const programas = Array.from(
        (html.querySelector('#filtro-programa') as HTMLSelectElement).options,
      ).map((o) => o.textContent?.trim());
      expect(programas).toEqual([
        'Todos los programas',
        'Ingeniería Civil',
        'Ingeniería de Sistemas',
      ]);
    });

    it('filtra las materias por programa', async () => {
      await cargarAsignaturas([BORRADOR], [ACTIVA]);

      const programa = html.querySelector('#filtro-programa') as HTMLSelectElement;
      programa.value = 'p-civ';
      programa.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(opcionesMaterias()).toEqual(['MAT1 · Matemáticas I (Activa)']);
      expect(html.textContent).toContain('1 materia coincide.');
    });

    it('busca por código o nombre sin importar tildes y permite limpiar', async () => {
      await cargarAsignaturas([BORRADOR], [ACTIVA]);

      const buscador = html.querySelector('input[type="search"]') as HTMLInputElement;
      buscador.value = 'matematicas';
      buscador.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(opcionesMaterias()).toEqual(['MAT1 · Matemáticas I (Activa)']);

      buscador.value = 'nada';
      buscador.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(html.textContent).toContain('Ninguna materia coincide con la búsqueda.');

      boton(html, 'Limpiar filtros').click();
      await fixture.whenStable();
      expect(opcionesMaterias().length).toBe(2);
    });

    it('conserva la materia elegida aunque deje de cumplir el filtro', async () => {
      await iniciar(BORRADOR, [ra(1)]);

      const programa = html.querySelector('#filtro-programa') as HTMLSelectElement;
      programa.value = 'p-civ';
      programa.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(opcionesMaterias()).toEqual([
        'ISW4 · Ingeniería de Software IV (Borrador)',
        'MAT1 · Matemáticas I (Activa)',
      ]);
      expect(html.querySelectorAll('tbody tr').length).toBe(1);
    });
  });

  describe('paginación', () => {
    it('muestra 5 RA por página y navega entre páginas', async () => {
      await iniciar(BORRADOR, [...activos(5), ra(6, 'INACTIVO'), ra(7, 'INACTIVO')]);

      expect(html.querySelectorAll('tbody tr').length).toBe(5);
      expect(html.textContent).toContain('Mostrando 1–5 de 7 RA');
      expect(html.textContent).toContain('Página 1 de 2');
      expect(boton(html, 'Anterior').getAttribute('aria-disabled')).toBe('true');

      boton(html, 'Siguiente').click();
      await fixture.whenStable();
      expect(html.querySelectorAll('tbody tr').length).toBe(2);
      expect(fila('RA6')).toBeDefined();
      expect(html.textContent).toContain('Mostrando 6–7 de 7 RA');
      expect(boton(html, 'Siguiente').getAttribute('aria-disabled')).toBe('true');
    });

    it('con una sola página no muestra los controles', async () => {
      await iniciar(BORRADOR, activos(3));

      expect(html.textContent).toContain('Mostrando 1–3 de 3 RA');
      expect(boton(html, 'Siguiente')).toBeUndefined();
    });

    it('vuelve a la primera página al cambiar de materia', async () => {
      await iniciar(BORRADOR, activos(7));
      boton(html, 'Siguiente').click();
      await fixture.whenStable();

      await elegir(ACTIVA, activos(7));
      expect(html.textContent).toContain('Página 1 de 2');
    });
  });

  describe('listado de RA', () => {
    it('muestra los RA, el conteo de activos y el indicador del rango', async () => {
      await iniciar(BORRADOR, [ra(1), ra(2), ra(3), ra(4, 'INACTIVO')]);

      expect(html.querySelectorAll('tbody tr').length).toBe(4);
      expect(html.querySelector('.resumen__conteo')?.textContent).toContain('RA activos: 3 de 7');
      expect(html.textContent).toContain('Faltan 2 para el mínimo (5)');
    });

    it('atenúa la fila de un RA inactivo y le ofrece solo «Reactivar»', async () => {
      await iniciar(BORRADOR, [ra(1), ra(2, 'INACTIVO')]);

      const inactiva = fila('RA2');
      expect(inactiva.classList.contains('fila--inactiva')).toBe(true);
      expect(fila('RA1').classList.contains('fila--inactiva')).toBe(false);
      expect(boton(inactiva, 'Reactivar')).toBeDefined();
      expect(boton(inactiva, 'Modificar')).toBeUndefined();
      expect(boton(inactiva, 'Inactivar')).toBeUndefined();
    });

    it('indica cuando la materia aún no tiene RA', async () => {
      await iniciar(BORRADOR, []);
      expect(html.textContent).toContain('Esta materia todavía no tiene RA');
    });

    it('muestra el error al cargar los RA y permite reintentar', async () => {
      await cargarAsignaturas([BORRADOR], []);
      const selector = html.querySelector('#selector-materia') as HTMLSelectElement;
      selector.value = BORRADOR.id;
      selector.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      http.expectOne(urlRa(BORRADOR.id)).flush(null, { status: 500, statusText: 'Error' });
      await fixture.whenStable();

      expect(html.textContent).toContain('Ocurrió un error inesperado');
      boton(html, 'Reintentar').click();
      await fixture.whenStable();
      http.expectOne(urlRa(BORRADOR.id)).flush([ra(1)]);
      await fixture.whenStable();
      expect(html.querySelectorAll('tbody tr').length).toBe(1);
    });
  });

  describe('reglas en los botones', () => {
    it('con 7 activos bloquea «Registrar RA» y «Reactivar» y explica el motivo', async () => {
      await iniciar(BORRADOR, [ra(8, 'INACTIVO'), ...activos(7)]);

      const registrar = boton(html, 'Registrar RA');
      expect(registrar.getAttribute('aria-disabled')).toBe('true');
      expect(html.querySelector('#tooltip-registrar')?.textContent).toContain(MOTIVO_MAXIMO);
      expect(boton(fila('RA8'), 'Reactivar').getAttribute('aria-disabled')).toBe('true');

      registrar.click();
      await fixture.whenStable();
      expect(html.querySelector('dialog.modal')?.hasAttribute('open')).toBe(false);
    });

    it('en una materia ACTIVA con 5 activos bloquea «Inactivar»', async () => {
      await iniciar(ACTIVA, activos(5));

      const inactivar = boton(fila('RA1'), 'Inactivar');
      expect(inactivar.getAttribute('aria-disabled')).toBe('true');
      expect(fila('RA1').textContent).toContain(MOTIVO_MINIMO);
    });

    it('en una materia en BORRADOR permite inactivar aunque queden menos de 5', async () => {
      await iniciar(BORRADOR, activos(5));
      expect(boton(fila('RA1'), 'Inactivar').getAttribute('aria-disabled')).toBeNull();
    });
  });

  describe('acciones', () => {
    it('inactiva tras confirmar, recarga la lista y muestra el aviso', async () => {
      await iniciar(BORRADOR, activos(2));

      boton(fila('RA1'), 'Inactivar').click();
      await fixture.whenStable();
      const dialogo = html.querySelector('dialog.dialogo') as HTMLDialogElement;
      expect(dialogo.textContent).toContain('¿Inactivar RA1?');

      boton(dialogo, 'Inactivar').click();
      await fixture.whenStable();
      const req = http.expectOne(`${API}/resultados-aprendizaje/ra-1/inactivar`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...ra(1), estado: 'INACTIVO' });
      await fixture.whenStable();

      http.expectOne(urlRa(BORRADOR.id)).flush([ra(1, 'INACTIVO'), ra(2)]);
      await fixture.whenStable();
      expect(html.querySelector('.aviso')?.textContent).toContain('RA RA1 inactivado.');
      expect(html.querySelector('.resumen__conteo')?.textContent).toContain('RA activos: 1 de 7');
    });

    it('si el backend rechaza la reactivación, muestra su mensaje en el diálogo', async () => {
      await iniciar(BORRADOR, [ra(1, 'INACTIVO')]);

      boton(fila('RA1'), 'Reactivar').click();
      await fixture.whenStable();
      const dialogo = html.querySelector('dialog.dialogo') as HTMLDialogElement;
      boton(dialogo, 'Reactivar').click();
      await fixture.whenStable();
      http
        .expectOne(`${API}/resultados-aprendizaje/ra-1/reactivar`)
        .flush(
          { mensaje: 'La asignatura está inactiva.' },
          { status: 400, statusText: 'Bad Request' },
        );
      await fixture.whenStable();

      expect(dialogo.querySelector('[role="alert"]')?.textContent).toContain(
        'La asignatura está inactiva.',
      );
      expect(html.querySelector('.aviso')).toBeNull();
    });

    it('al registrar un RA cierra el modal, recarga y avisa', async () => {
      await iniciar(BORRADOR, []);

      boton(html, 'Registrar RA').click();
      await fixture.whenStable();
      const modal = html.querySelector('dialog.modal') as HTMLDialogElement;
      expect(modal.hasAttribute('open')).toBe(true);

      for (const [id, valor] of [
        ['ra-codigo', 'ra1'],
        ['ra-descripcion', 'Analiza requisitos.'],
      ]) {
        const control = html.querySelector(`#${id}`) as HTMLInputElement;
        control.value = valor;
        control.dispatchEvent(new Event('input'));
      }
      await fixture.whenStable();
      (modal.querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await fixture.whenStable();

      http.expectOne(urlRa(BORRADOR.id)).flush(ra(1), { status: 201, statusText: 'Created' });
      await fixture.whenStable();
      http.expectOne(urlRa(BORRADOR.id)).flush([ra(1)]);
      await fixture.whenStable();

      expect(modal.hasAttribute('open')).toBe(false);
      expect(html.querySelector('.aviso')?.textContent).toContain('RA RA1 registrado.');
      expect(html.querySelectorAll('tbody tr').length).toBe(1);
    });
  });
});
