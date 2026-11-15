import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { AccionMejora } from '../../../mejoras/models/accion-mejora.model';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { Semestre } from '../../../semestres/models/semestre.model';
import {
  CONVERTIDA,
  MATERIA,
  NO_CONVERTIDA,
  SEMESTRE_ACTIVO,
  SEMESTRE_INACTIVO,
  URL_ACCIONES_MEJORA,
  URL_ASIGNATURAS,
  URL_SEMESTRES,
  boton,
  ra,
  urlRa,
} from '../estadisticas-pruebas';
import { AccionesMejoraPage } from './acciones-mejora-page';

describe('AccionesMejoraPage', () => {
  let fixture: ComponentFixture<AccionesMejoraPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccionesMejoraPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AccionesMejoraPage);
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

  const listadoDe = (semestreId = SEMESTRE_ACTIVO.id, raId = 'ra-1') =>
    http.expectOne(
      (r) =>
        r.urlWithParams ===
        `${URL_ACCIONES_MEJORA}?resultadoAprendizajeId=${raId}&semestreId=${semestreId}`,
    );

  async function iniciarConSeleccion(
    resultados: ResultadoAprendizaje[],
    acciones: AccionMejora[] | null = [],
  ) {
    await iniciar([MATERIA], [SEMESTRE_ACTIVO, SEMESTRE_INACTIVO]);
    await elegirMateria(MATERIA, resultados);
    elegirRa('ra-1');
    await fixture.whenStable();
    if (acciones) {
      listadoDe().flush(acciones);
      await fixture.whenStable();
      fixture.detectChanges();
    }
  }

  describe('listado de acciones de mejora', () => {
    it('sin completar los filtros invita a elegirlos y no pide el listado', async () => {
      await iniciar([MATERIA], [SEMESTRE_ACTIVO]);
      await elegirMateria(MATERIA, [ra(1)]);

      http.expectNone((r) => r.url === URL_ACCIONES_MEJORA);
      expect(html.textContent).toContain('Elige materia, RA y semestre para ver las acciones de mejora.');
    });

    it('esta página solo pide las acciones: no consulta el nivel de logro ni la conclusión', async () => {
      await iniciarConSeleccion([ra(1)], null);

      http.expectNone((r) => r.url.includes('/estadisticas'));
      http.expectNone((r) => r.url.includes('/conclusiones'));
      listadoDe().flush([]);
    });

    it('muestra el listado de acciones del RA y semestre seleccionados', async () => {
      await iniciarConSeleccion([ra(1)], [NO_CONVERTIDA, CONVERTIDA]);

      expect(html.textContent).toContain('Taller de refuerzo');
      expect(html.textContent).toContain('Guía de ejercicios adicionales');
    });

    it('sin acciones registradas lo indica', async () => {
      await iniciarConSeleccion([ra(1)], []);

      expect(html.textContent).toContain(
        'No hay acciones de mejora registradas para este RA en este semestre.',
      );
    });

    it('si falla el listado muestra el error sin detalles técnicos', async () => {
      await iniciarConSeleccion([ra(1)], null);
      listadoDe().flush(
        { mensaje: 'detalle técnico' },
        { status: 503, statusText: 'Service Unavailable' },
      );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('El servicio no está disponible');
      expect(html.textContent).not.toContain('detalle técnico');
    });

    it('cancela el listado anterior y pide el del nuevo semestre al cambiar un filtro', async () => {
      await iniciarConSeleccion([ra(1)], null);
      const anterior = listadoDe();

      const selectorSemestre = html.querySelector('#selector-semestre') as HTMLSelectElement;
      selectorSemestre.value = SEMESTRE_INACTIVO.id;
      selectorSemestre.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(anterior.cancelled).toBe(true);
      listadoDe(SEMESTRE_INACTIVO.id).flush([CONVERTIDA]);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('Guía de ejercicios adicionales');
      expect(html.textContent).not.toContain('Taller de refuerzo');
    });

    it('un refresco de fondo conserva el listado sin mostrar «Cargando»', async () => {
      await iniciarConSeleccion([ra(1)], [NO_CONVERTIDA]);

      document.dispatchEvent(new Event('visibilitychange'));
      await fixture.whenStable();
      expect(html.textContent).not.toContain('Cargando acciones de mejora');
      expect(html.textContent).toContain('Taller de refuerzo');

      http.expectOne((r) => r.url === URL_ACCIONES_MEJORA).flush([NO_CONVERTIDA, CONVERTIDA]);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('Guía de ejercicios adicionales');
    });

    it('una acción no convertida ofrece «Convertir en evaluación» y «Editar»', async () => {
      await iniciarConSeleccion([ra(1)], [NO_CONVERTIDA]);

      const item = html.querySelector('.accion-mejora') as HTMLElement;
      expect(boton(item, 'Convertir en evaluación')).toBeDefined();
      expect(boton(item, 'Editar')).toBeDefined();
      expect(item.textContent).toContain('No convertida');
      expect(item.textContent).toContain('Registrada el');
    });

    it('una acción ya convertida no ofrece «Convertir en evaluación» ni «Editar», ni muestra el id de la evaluación', async () => {
      await iniciarConSeleccion([ra(1)], [CONVERTIDA]);

      const item = html.querySelector('.accion-mejora') as HTMLElement;
      expect(boton(item, 'Convertir en evaluación')).toBeUndefined();
      expect(boton(item, 'Editar')).toBeUndefined();
      expect(item.textContent).toContain('Convertida');
      expect(item.textContent).toContain('Ya se generó la evaluación a partir de esta acción.');
      expect(item.textContent).not.toContain('ev1');
    });

    it('no ofrece registrar una acción nueva: eso se hace desde «Conclusiones»', async () => {
      await iniciarConSeleccion([ra(1)], [NO_CONVERTIDA]);

      expect(boton(html, 'Crear acción de mejora')).toBeUndefined();
      expect(boton(html, 'Registrar acción de mejora')).toBeUndefined();
    });
  });

  describe('edición', () => {
    it('al editar una acción no convertida precarga el diálogo y, al guardar, refresca el listado', async () => {
      await iniciarConSeleccion([ra(1)], [NO_CONVERTIDA]);

      boton(html, 'Editar').click();
      await fixture.whenStable();

      const dialogo = html.querySelector('dialog') as HTMLElement;
      expect(dialogo.hasAttribute('open')).toBe(true);
      expect(dialogo.textContent).toContain('Editar acción de mejora');
      const nombre = dialogo.querySelector('#accion-nombre') as HTMLInputElement;
      const descripcion = dialogo.querySelector('#accion-descripcion') as HTMLTextAreaElement;
      expect(nombre.value).toBe(NO_CONVERTIDA.nombre);
      expect(descripcion.value).toBe(NO_CONVERTIDA.descripcion);

      (dialogo.querySelector('form') as HTMLFormElement).dispatchEvent(
        new Event('submit', { cancelable: true }),
      );
      await fixture.whenStable();

      const actualizada = { ...NO_CONVERTIDA, nombre: 'Taller actualizado' };
      http
        .expectOne(
          (r) => r.url === `${URL_ACCIONES_MEJORA}/${NO_CONVERTIDA.id}` && r.method === 'PUT',
        )
        .flush(actualizada);
      await fixture.whenStable();

      // Editar no necesita la conclusión: solo se vuelve a pedir el listado.
      http.expectNone((r) => r.url.includes('/conclusiones'));
      http
        .expectOne((r) => r.url === URL_ACCIONES_MEJORA && r.method === 'GET')
        .flush([actualizada]);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('Acción de mejora actualizada correctamente.');
      expect(html.textContent).toContain('Taller actualizado');
    });
  });

  describe('conversión en evaluación', () => {
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

      const convertida = { ...NO_CONVERTIDA, convertida: true, evaluacionGeneradaId: 'ev1' };
      http.expectOne((r) => r.url === URL_CONVERSION && r.method === 'POST').flush(convertida);
      await fixture.whenStable();
      http
        .expectOne((r) => r.url === URL_ACCIONES_MEJORA && r.method === 'GET')
        .flush([convertida]);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(html.textContent).toContain('Acción de mejora convertida en evaluación.');
      const item = html.querySelector('.accion-mejora') as HTMLElement;
      expect(item.textContent).toContain('Convertida');
      expect(item.textContent).toContain('Ya se generó la evaluación a partir de esta acción.');
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

      const alerta = html.querySelector('dialog [role="alert"]') as HTMLElement;
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

      const alerta = html.querySelector('dialog [role="alert"]') as HTMLElement;
      expect(alerta.textContent).toContain('La acción de mejora ya fue convertida.');
      expect(html.querySelector('.accion-mejora')).not.toBeNull();
    });
  });
});
