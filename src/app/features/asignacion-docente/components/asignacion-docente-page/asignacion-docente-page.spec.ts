import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { AsignaturaProfesor, Profesor } from '../../../profesores/models/profesor.model';
import { ResultadoAsignacionMasiva } from '../../models/asignacion-docente.model';
import { AsignacionDocentePage } from './asignacion-docente-page';

const URL_PROFESORES = `${environment.apiUrl}/v1/profesores`;
const URL_ASIGNATURAS = `${environment.apiUrl}/v1/asignaturas`;
const URL_ASIGNACIONES = `${environment.apiUrl}/v1/asignaciones-docentes`;
const URL_PROGRAMAS = `${environment.apiUrl}/v1/programas`;
const URL_FACULTADES = `${environment.apiUrl}/v1/facultades`;

const PROFESOR_ACTIVO: Profesor = {
  id: 'prof-activo',
  tipoDocumentoId: 'td-cc',
  tipoDocumentoNombre: 'CC',
  numeroDocumento: '123456',
  primerNombre: 'Ana',
  primerApellido: 'Activa',
  segundoApellido: 'Prueba',
  nombreCompleto: 'Ana Activa',
  correoInstitucional: 'ana.activa@uco.net.co',
  estado: 'ACTIVO',
  tieneAsignacionesActivas: false,
};

const PROFESOR_ACTIVO_2: Profesor = {
  ...PROFESOR_ACTIVO,
  id: 'prof-activo-2',
  primerNombre: 'Carlos',
  primerApellido: 'Segundo',
  nombreCompleto: 'Carlos Segundo',
  correoInstitucional: 'carlos.segundo@uco.net.co',
};

const PROFESOR_INACTIVO: Profesor = {
  ...PROFESOR_ACTIVO,
  id: 'prof-inactivo',
  primerNombre: 'Beto',
  primerApellido: 'Inactivo',
  nombreCompleto: 'Beto Inactivo',
  estado: 'INACTIVO',
};

const ASIGNATURA_ACTIVA: Asignatura = {
  id: 'asig-activa',
  codigo: 'MAT101',
  nombre: 'Cálculo',
  programaId: 'prog-1',
  programaNombre: 'Ingeniería',
  facultadId: 'fac-ing',
  facultadNombre: 'Facultad de Ingeniería',
  estado: 'ACTIVA',
  cantidadRa: 5,
};

const ASIGNATURA_ACTIVA_2: Asignatura = {
  ...ASIGNATURA_ACTIVA,
  id: 'asig-activa-2',
  codigo: 'FIS201',
  nombre: 'Física',
};

const ASIGNATURA_BORRADOR: Asignatura = {
  ...ASIGNATURA_ACTIVA,
  id: 'asig-borrador',
  codigo: 'MAT102',
  nombre: 'Álgebra',
  estado: 'BORRADOR',
};

const ASIGNATURA_DERECHO: Asignatura = {
  ...ASIGNATURA_ACTIVA,
  id: 'asig-derecho',
  codigo: 'DER101',
  nombre: 'Derecho Civil',
  programaId: 'prog-2',
  programaNombre: 'Derecho',
  facultadId: 'fac-der',
  facultadNombre: 'Facultad de Derecho',
};

// Cálculo ya asignada a Ana, tal como la devuelve GET /profesores/{id}/asignaturas.
const CALCULO_ASIGNADA: AsignaturaProfesor = {
  asignacionId: 'asig-doc-1',
  asignaturaId: ASIGNATURA_ACTIVA.id,
  codigoAsignatura: ASIGNATURA_ACTIVA.codigo,
  nombreAsignatura: ASIGNATURA_ACTIVA.nombre,
  estadoAsignatura: 'ACTIVO',
};

// GET /facultades las devuelve ordenadas por nombre.
const FACULTADES = [
  { id: 'fac-der', nombre: 'Facultad de Derecho', estado: 'ACTIVO' },
  { id: 'fac-ing', nombre: 'Facultad de Ingeniería', estado: 'ACTIVO' },
];

const PROGRAMAS = [
  {
    id: 'prog-1',
    codigo: 'ING',
    nombre: 'Ingeniería',
    facultadId: 'fac-ing',
    facultadNombre: 'Facultad de Ingeniería',
    estado: 'ACTIVO',
  },
  {
    id: 'prog-2',
    codigo: 'DER',
    nombre: 'Derecho',
    facultadId: 'fac-der',
    facultadNombre: 'Facultad de Derecho',
    estado: 'ACTIVO',
  },
];

describe('AsignacionDocentePage', () => {
  let fixture: ComponentFixture<AsignacionDocentePage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  const textoCompacto = (selector: string) =>
    html.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const buscadorProfesor = () => html.querySelector('#buscar-profesor') as HTMLInputElement;
  const opcionesProfesor = () =>
    Array.from(html.querySelectorAll('.profesor-opcion')) as HTMLButtonElement[];

  function escribirProfesor(texto: string): void {
    const buscador = buscadorProfesor();
    buscador.value = texto;
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  async function cargarCatalogos(): Promise<void> {
    http.expectOne(URL_PROFESORES).flush([PROFESOR_ACTIVO, PROFESOR_ACTIVO_2, PROFESOR_INACTIVO]);
    http
      .expectOne((r) => r.url === URL_ASIGNATURAS)
      .flush([ASIGNATURA_ACTIVA, ASIGNATURA_ACTIVA_2, ASIGNATURA_BORRADOR, ASIGNATURA_DERECHO]);
    http.expectOne(URL_FACULTADES).flush(FACULTADES);
    http.expectOne(URL_PROGRAMAS).flush(PROGRAMAS);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Elige un profesor de la lista de resultados, sin responder todavía la consulta de sus materias. */
  function seleccionarProfesor(profesor: Profesor): void {
    const opcion = opcionesProfesor().find((o) => o.textContent?.includes(profesor.correoInstitucional));
    opcion!.click();
    fixture.detectChanges();
  }

  /** Vuelve al buscador con «Cambiar profesor». */
  function cambiarProfesor(): void {
    (html.querySelector('.profesor-elegido .btn') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  const peticionAsignadas = (profesor: Profesor) =>
    http.expectOne((r) => r.url === `${URL_PROFESORES}/${profesor.id}/asignaturas`);

  /** Elige al profesor y responde la consulta de sus materias ya asignadas. */
  async function elegirProfesor(
    asignadas: AsignaturaProfesor[] = [],
    profesor: Profesor = PROFESOR_ACTIVO,
  ): Promise<void> {
    seleccionarProfesor(profesor);
    peticionAsignadas(profesor).flush(asignadas);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const casillasDeAgregar = () =>
    Array.from(html.querySelectorAll('.lista-seleccionable input[type="checkbox"]')) as HTMLInputElement[];
  const botonAsignar = () => html.querySelector('.barra__registrar') as HTMLButtonElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AsignacionDocentePage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AsignacionDocentePage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    fixture.detectChanges();
    await cargarCatalogos();
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  it('es una sola pantalla: muestra el título y no tiene pestañas', () => {
    expect(html.querySelector('h1')?.textContent).toContain('Asignación docente');
    expect(html.querySelector('[role="tab"]')).toBeNull();
  });

  it('ofrece solo los profesores activos y pide elegir uno antes de mostrar materias', () => {
    const parte = (clase: string) =>
      opcionesProfesor().map((o) => o.querySelector(clase)?.textContent?.replace(/\s+/g, ' ').trim());
    expect(parte('.profesor-opcion__nombre')).toEqual(['Ana Activa', 'Carlos Segundo']);
    expect(parte('.dato-secundario')).toEqual([
      'ana.activa@uco.net.co · 123456',
      'carlos.segundo@uco.net.co · 123456',
    ]);
    expect(textoCompacto('.paso h2')).toBe('Elige el profesor');
    expect(html.querySelector('table')).toBeNull();
    expect(html.querySelector('.lista-seleccionable')).toBeNull();
    expect(html.textContent).not.toContain('Cálculo');
  });

  it('el buscador filtra los profesores por nombre, correo o documento, sin importar tildes ni mayúsculas', () => {
    escribirProfesor('CARLOS');
    expect(opcionesProfesor().length).toBe(1);
    expect(opcionesProfesor()[0].textContent).toContain('Carlos Segundo');

    escribirProfesor('ana.activa@');
    expect(opcionesProfesor().length).toBe(1);
    expect(opcionesProfesor()[0].textContent).toContain('Ana Activa');

    escribirProfesor('123456');
    expect(opcionesProfesor().length).toBe(2);

    escribirProfesor('segúndo');
    expect(opcionesProfesor().length).toBe(1);
    expect(textoCompacto('.resumen-seleccion')).toBe('1 profesor(es)');
  });

  it('un profesor inactivo no aparece aunque coincida con la búsqueda', () => {
    escribirProfesor('Beto');

    expect(opcionesProfesor().length).toBe(0);
    expect(html.textContent).toContain('Ningún profesor coincide con la búsqueda.');
  });

  it('al elegir un profesor la búsqueda se reemplaza por el profesor elegido', async () => {
    await elegirProfesor();

    expect(buscadorProfesor()).toBeNull();
    expect(html.querySelector('.lista-profesores')).toBeNull();
    expect(textoCompacto('.profesor-elegido__nombre')).toBe('Ana Activa');
    expect(textoCompacto('.profesor-elegido__correo')).toBe('ana.activa@uco.net.co');
    expect(textoCompacto('.profesor-elegido__avatar')).toBe('AA');
  });

  it('al elegir un profesor muestra sus materias asignadas y las que se le pueden agregar', async () => {
    await elegirProfesor([CALCULO_ASIGNADA]);

    expect(html.textContent).toContain('Materias asignadas a Ana Activa');
    expect(html.textContent).toContain('Agregar materias a Ana Activa');
    const filas = Array.from(html.querySelectorAll('tbody tr')).map((f) =>
      f.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(filas.length).toBe(1);
    expect(filas[0]).toContain('Cálculo');

    // Las materias ya asignadas no se ofrecen de nuevo; las BORRADOR tampoco.
    const disponibles = html.querySelector('.lista-seleccionable')?.textContent ?? '';
    expect(disponibles).not.toContain('Cálculo');
    expect(disponibles).toContain('Física');
    expect(disponibles).toContain('Derecho Civil');
    expect(disponibles).not.toContain('Álgebra');
  });

  it('un profesor sin materias lo indica y ofrece todas las activas', async () => {
    await elegirProfesor();

    expect(html.textContent).toContain('Ana Activa no tiene materias asignadas todavía');
    expect(html.querySelector('table')).toBeNull();
    const disponibles = html.querySelector('.lista-seleccionable')?.textContent ?? '';
    expect(disponibles).toContain('Cálculo');
    expect(disponibles).toContain('Física');
  });

  it('el buscador filtra las materias por nombre o código', async () => {
    await elegirProfesor();

    const buscador = html.querySelector('.buscador input') as HTMLInputElement;
    buscador.value = 'fis';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(html.textContent).not.toContain('Cálculo');
    expect(html.textContent).toContain('Física');

    buscador.value = 'MAT101';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(html.textContent).toContain('Cálculo');
    expect(html.textContent).not.toContain('Física');
  });

  it('al elegir una facultad pide al backend sus materias y acota los programas', async () => {
    await elegirProfesor();
    expect(html.textContent).toContain('Derecho Civil');

    const facultad = html.querySelector('#asignar-filtro-facultad') as HTMLSelectElement;
    expect([...facultad.options].map((o) => o.textContent?.trim())).toEqual([
      'Todas las facultades',
      'Facultad de Derecho',
      'Facultad de Ingeniería',
    ]);

    facultad.value = 'fac-der';
    facultad.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === URL_ASIGNATURAS);
    expect(req.request.params.get('facultadId')).toBe('fac-der');
    expect(req.request.params.has('programaId')).toBe(false);
    req.flush([ASIGNATURA_DERECHO]);
    await fixture.whenStable();
    fixture.detectChanges();

    const programa = html.querySelector('#asignar-filtro-programa') as HTMLSelectElement;
    expect([...programa.options].map((o) => o.textContent?.trim())).toEqual([
      'Todos los programas',
      'Derecho',
    ]);
    expect(html.textContent).toContain('Derecho Civil');
    expect(html.textContent).not.toContain('Cálculo');
  });

  it('una facultad sin materias activas lo indica y mantiene los filtros visibles', async () => {
    await elegirProfesor();
    const facultad = html.querySelector('#asignar-filtro-facultad') as HTMLSelectElement;
    facultad.value = 'fac-der';
    facultad.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.textContent).toContain('No hay materias activas en la facultad o el programa elegido.');
    expect(html.querySelector('#asignar-filtro-facultad')).not.toBeNull();
  });

  it('«Cambiar profesor» vuelve al buscador, limpio, y desaparecen las materias del anterior', async () => {
    escribirProfesor('ana');
    await elegirProfesor([CALCULO_ASIGNADA]);
    expect(html.querySelector('table')).not.toBeNull();

    cambiarProfesor();
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone((r) => r.url.includes('/profesores/') && r.url.endsWith('/asignaturas'));
    expect(html.querySelector('table')).toBeNull();
    expect(html.querySelector('.lista-seleccionable')).toBeNull();
    expect(buscadorProfesor().value).toBe('');
    expect(opcionesProfesor().length).toBe(2);
  });

  it('el resumen dice a quién se asigna y cuántas materias lleva', async () => {
    await elegirProfesor();
    expect(textoCompacto('.resumen-seleccion')).toBe('Asignando a Ana Activa: 0 materia(s) seleccionada(s)');

    casillasDeAgregar()[0].click();
    fixture.detectChanges();
    expect(textoCompacto('.resumen-seleccion')).toBe('Asignando a Ana Activa: 1 materia(s) seleccionada(s)');
  });

  it('al cambiar de profesor se empieza de cero: se descartan las materias marcadas', async () => {
    await elegirProfesor();
    casillasDeAgregar()[0].click();
    fixture.detectChanges();
    expect(botonAsignar().getAttribute('aria-disabled')).toBeNull();

    cambiarProfesor();
    await elegirProfesor([], PROFESOR_ACTIVO_2);

    expect(html.textContent).toContain('Agregar materias a Carlos Segundo');
    expect(casillasDeAgregar().filter((c) => c.checked).length).toBe(0);
    expect(botonAsignar().getAttribute('aria-disabled')).toBe('true');
  });

  it('ignora la respuesta tardía del profesor anterior', async () => {
    seleccionarProfesor(PROFESOR_ACTIVO);
    cambiarProfesor();
    seleccionarProfesor(PROFESOR_ACTIVO_2);

    // Responde primero el segundo profesor y después, tarde, el primero (que tiene Cálculo asignada).
    peticionAsignadas(PROFESOR_ACTIVO_2).flush([]);
    peticionAsignadas(PROFESOR_ACTIVO).flush([CALCULO_ASIGNADA]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.textContent).toContain('Agregar materias a Carlos Segundo');
    expect(html.textContent).toContain('Carlos Segundo no tiene materias asignadas todavía');
    expect(html.querySelector('.lista-seleccionable')?.textContent).toContain('Cálculo');
  });

  it('asigna las seleccionadas, muestra el resultado y actualiza las materias del profesor', async () => {
    await elegirProfesor();

    casillasDeAgregar()[0].click(); // Cálculo
    fixture.detectChanges();
    expect(botonAsignar().getAttribute('aria-disabled')).toBeNull();
    botonAsignar().click();

    const req = http.expectOne(URL_ASIGNACIONES);
    expect(req.request.body).toEqual({
      profesorIds: [PROFESOR_ACTIVO.id],
      asignaturaIds: [ASIGNATURA_ACTIVA.id],
    });

    const resultado: ResultadoAsignacionMasiva = {
      creadas: [
        {
          id: 'asig-doc-1',
          profesorId: PROFESOR_ACTIVO.id,
          nombreProfesor: PROFESOR_ACTIVO.nombreCompleto,
          asignaturaId: ASIGNATURA_ACTIVA.id,
          codigoAsignatura: ASIGNATURA_ACTIVA.codigo,
          nombreAsignatura: ASIGNATURA_ACTIVA.nombre,
          estado: 'ACTIVO',
          fechaAsignacion: '2026-10-16',
        },
      ],
      omitidas: [],
      rechazadas: [],
    };
    req.flush(resultado);
    fixture.detectChanges();

    // El profesor sigue elegido y se vuelve a consultar para ver su materia nueva en la tabla.
    peticionAsignadas(PROFESOR_ACTIVO).flush([CALCULO_ASIGNADA]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textoCompacto('.profesor-elegido__nombre')).toBe('Ana Activa');
    expect(textoCompacto('.resultado__resumen')).toBe('Se asignó 1 materia a Ana Activa.');
    expect(html.textContent).toContain('Asignadas (1)');
    expect(textoCompacto('.resultado__grupo ul')).toBe('Cálculo (MAT101)');
    expect(textoCompacto('.aviso > span')).toBe('Se asignó 1 materia a Ana Activa.');
    expect(html.querySelector('tbody')?.textContent).toContain('Cálculo');
    expect(html.querySelector('.lista-seleccionable')?.textContent).not.toContain('Cálculo');
    expect(textoCompacto('.resumen-seleccion')).toBe('Asignando a Ana Activa: 0 materia(s) seleccionada(s)');
  });

  it('explica en lenguaje claro las materias que ya estaban asignadas o no se pudieron asignar', async () => {
    await elegirProfesor();
    casillasDeAgregar()[0].click();
    fixture.detectChanges();
    botonAsignar().click();

    http.expectOne(URL_ASIGNACIONES).flush({
      creadas: [],
      omitidas: [
        {
          profesorId: PROFESOR_ACTIVO.id,
          asignaturaId: ASIGNATURA_ACTIVA_2.id,
          motivo: 'El profesor ya tiene esta materia asignada.',
        },
      ],
      rechazadas: [
        {
          profesorId: PROFESOR_ACTIVO.id,
          asignaturaId: ASIGNATURA_DERECHO.id,
          motivo: 'La materia está inactiva.',
        },
      ],
    } satisfies ResultadoAsignacionMasiva);
    peticionAsignadas(PROFESOR_ACTIVO).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(textoCompacto('.resultado__resumen')).toBe('No se asignó ninguna materia.');
    const texto = html.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(texto).not.toContain('Asignadas (');
    expect(texto).toContain('Ya estaban asignadas (1)');
    expect(texto).toContain('Física (FIS201) — El profesor ya tiene esta materia asignada.');
    expect(texto).toContain('No se pudieron asignar (1)');
    expect(texto).toContain('Derecho Civil (DER101) — La materia está inactiva.');
  });

  /** Elige a Ana, le asigna Cálculo y deja visible el «Resultado de la asignación». */
  async function asignarCalculoAAna(): Promise<void> {
    await elegirProfesor();
    casillasDeAgregar()[0].click();
    fixture.detectChanges();
    botonAsignar().click();
    http.expectOne(URL_ASIGNACIONES).flush({
      creadas: [
        {
          id: 'asig-doc-1',
          profesorId: PROFESOR_ACTIVO.id,
          nombreProfesor: PROFESOR_ACTIVO.nombreCompleto,
          asignaturaId: ASIGNATURA_ACTIVA.id,
          codigoAsignatura: ASIGNATURA_ACTIVA.codigo,
          nombreAsignatura: ASIGNATURA_ACTIVA.nombre,
          estado: 'ACTIVO',
          fechaAsignacion: '2026-10-16',
        },
      ],
      omitidas: [],
      rechazadas: [],
    } satisfies ResultadoAsignacionMasiva);
    peticionAsignadas(PROFESOR_ACTIVO).flush([CALCULO_ASIGNADA]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(html.querySelector('.resultado')).not.toBeNull();
  }

  it('el resultado desaparece al desasignar, para no mostrar algo desactualizado', async () => {
    await asignarCalculoAAna();

    (html.querySelector('.btn--peligro') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(html.querySelector('.resultado')).toBeNull();

    http.expectOne(`${URL_ASIGNACIONES}/asig-doc-1/desasignar`).flush(null);
    peticionAsignadas(PROFESOR_ACTIVO).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(html.querySelector('.resultado')).toBeNull();
  });

  it('el resultado desaparece al marcar otra materia para agregar', async () => {
    await asignarCalculoAAna();

    casillasDeAgregar()[0].click();
    fixture.detectChanges();

    expect(html.querySelector('.resultado')).toBeNull();
  });

  it('desasigna una materia, vuelve a consultar y la ofrece otra vez para agregar', async () => {
    await elegirProfesor([CALCULO_ASIGNADA]);
    expect(html.querySelector('.lista-seleccionable')?.textContent).not.toContain('Cálculo');

    (html.querySelector('.btn--peligro') as HTMLButtonElement).click();

    http.expectOne(`${URL_ASIGNACIONES}/asig-doc-1/desasignar`).flush(null);
    peticionAsignadas(PROFESOR_ACTIVO).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(html.textContent).toContain('Ana Activa no tiene materias asignadas todavía');
    expect(html.querySelector('.lista-seleccionable')?.textContent).toContain('Cálculo');
  });
});

describe('AsignacionDocentePage con muchos profesores', () => {
  it('muestra solo los primeros resultados y pide acotar la búsqueda', async () => {
    TestBed.configureTestingModule({
      imports: [AsignacionDocentePage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AsignacionDocentePage);
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    fixture.detectChanges();

    const muchos: Profesor[] = Array.from({ length: 45 }, (_, i) => ({
      ...PROFESOR_ACTIVO,
      id: `prof-${i}`,
      nombreCompleto: `Profesor ${i}`,
      correoInstitucional: `profesor${i}@uco.net.co`,
    }));
    http.expectOne(URL_PROFESORES).flush(muchos);
    http.expectOne((r) => r.url === URL_ASIGNATURAS).flush([]);
    http.expectOne(URL_FACULTADES).flush([]);
    http.expectOne(URL_PROGRAMAS).flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    const resumen = () => html.querySelector('.resumen-seleccion')?.textContent?.replace(/\s+/g, ' ').trim();
    expect(html.querySelectorAll('.profesor-opcion').length).toBe(30);
    expect(resumen()).toBe('Mostrando 30 de 45 profesores. Escribe para acotar la búsqueda.');

    const buscador = html.querySelector('#buscar-profesor') as HTMLInputElement;
    buscador.value = 'Profesor 4';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // «Profesor 4» y «Profesor 40» a «Profesor 44».
    expect(html.querySelectorAll('.profesor-opcion').length).toBe(6);
    expect(resumen()).toBe('6 profesor(es)');

    html.remove();
    http.verify();
  });
});
