import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { MatriculaRequest } from '../../models/matricula.model';
import { MatriculaFormDialog } from './matricula-form-dialog';

const URL_ASIGNATURAS = `${environment.apiUrl}/v1/asignaturas`;
const URL_SEMESTRES = `${environment.apiUrl}/v1/semestres`;
const URL_MATRICULAS = `${environment.apiUrl}/v1/matriculas`;

const ASIGNATURAS = [
  { id: 'a1', nombre: 'Cálculo I', estado: 'ACTIVA' as const },
  { id: 'a2', nombre: 'Física I', estado: 'BORRADOR' as const },
];

const SEMESTRES = [
  { id: 's1', codigo: '2026-1', estado: 'ACTIVO' as const },
  { id: 's2', codigo: '2025-2', estado: 'INACTIVO' as const },
];

describe('MatriculaFormDialog', () => {
  let fixture: ComponentFixture<MatriculaFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MatriculaFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MatriculaFormDialog);
    fixture.componentRef.setInput('estudianteId', 'e1');
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const catalogoAsignaturas = () => http.expectOne((r) => r.url === URL_ASIGNATURAS);
  const catalogoSemestres = () => http.expectOne((r) => r.url === URL_SEMESTRES);

  async function abrirConCatalogos(): Promise<void> {
    await fixture.whenStable();
    catalogoAsignaturas().flush(ASIGNATURAS);
    catalogoSemestres().flush(SEMESTRES);
    await fixture.whenStable();
  }

  function boton(texto: string): HTMLButtonElement {
    return Array.from(html.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;
  }

  function enviar(): void {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
  }

  it('no envía sin haber elegido asignatura o semestre', async () => {
    await abrirConCatalogos();
    enviar();
    await fixture.whenStable();

    http.expectNone(URL_MATRICULAS);
    expect(html.textContent).toContain('Selecciona una asignatura.');
    expect(html.textContent).toContain('Selecciona un semestre.');
  });

  it('envía la terna exacta al confirmar', async () => {
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();

    const req = http.expectOne(URL_MATRICULAS);
    expect(req.request.method).toBe('POST');
    const esperado: MatriculaRequest = { estudianteId: 'e1', asignaturaId: 'a1', semestreId: 's1' };
    expect(req.request.body).toEqual(esperado);
  });

  it('un 201 emite el mensaje de matriculado y un 200 el de reactivada', async () => {
    let avisos: string[] = [];
    fixture.componentInstance.matriculado.subscribe((texto) => avisos.push(texto));
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();
    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { id: 'm1', estudianteId: 'e1', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVO' },
        { status: 201, statusText: 'Created' },
      );
    await fixture.whenStable();

    expect(avisos).toEqual(['Estudiante matriculado.']);
  });

  it('un 200 emite el mensaje de matrícula reactivada', async () => {
    let avisos: string[] = [];
    fixture.componentInstance.matriculado.subscribe((texto) => avisos.push(texto));
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();
    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { id: 'm1', estudianteId: 'e1', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVO' },
        { status: 200, statusText: 'OK' },
      );
    await fixture.whenStable();

    expect(avisos).toEqual(['Matrícula reactivada.']);
  });

  it('muestra el mensaje del servidor ante un 409 de terna ya activa, sin cerrar el diálogo', async () => {
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();
    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { status: 409, error: 'CONFLICT', mensaje: 'El estudiante ya está matriculado' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'El estudiante ya está matriculado',
    );
    expect(html.querySelector('dialog')).toBeTruthy();
  });

  it('muestra el mensaje del servidor ante un 400 de asignatura no activa', async () => {
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a2';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();
    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { status: 400, error: 'BAD_REQUEST', mensaje: 'La asignatura no está activa' },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'La asignatura no está activa',
    );
  });

  it('muestra el reintento cuando falla la carga de catálogos', async () => {
    await fixture.whenStable();
    catalogoAsignaturas().flush(null, { status: 0, statusText: 'Unknown Error' });
    catalogoSemestres().flush(SEMESTRES);
    await fixture.whenStable();

    expect(html.textContent).toContain('No se pudieron cargar las opciones');
    expect(boton('Matricular').disabled).toBe(true);

    boton('Reintentar').click();
    await fixture.whenStable();
    catalogoAsignaturas().flush(ASIGNATURAS);
    catalogoSemestres().flush(SEMESTRES);
    await fixture.whenStable();

    expect(html.textContent).not.toContain('No se pudieron cargar las opciones');
    expect(boton('Matricular').disabled).toBe(false);
  });

  it('el botón "Cancelar" cierra el diálogo y emite "cerrado"', async () => {
    let cerrado = false;
    fixture.componentInstance.cerrado.subscribe(() => (cerrado = true));
    await abrirConCatalogos();

    boton('Cancelar').click();
    await fixture.whenStable();

    expect(cerrado).toBe(true);
    http.expectNone(URL_MATRICULAS);
  });

  it('el evento nativo "cancel" del <dialog> también cierra y emite "cerrado"', async () => {
    let cerrado = false;
    fixture.componentInstance.cerrado.subscribe(() => (cerrado = true));
    await abrirConCatalogos();

    const dialogo = html.querySelector('dialog') as HTMLDialogElement;
    dialogo.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();

    expect(cerrado).toBe(true);
    http.expectNone(URL_MATRICULAS);
  });

  it('mientras se matricula, el botón de envío queda deshabilitado y muestra "Matriculando…"', async () => {
    await abrirConCatalogos();

    const selectAsignatura = html.querySelector('#matricula-asignatura') as HTMLSelectElement;
    selectAsignatura.value = 'a1';
    selectAsignatura.dispatchEvent(new Event('change'));
    const selectSemestre = html.querySelector('#matricula-semestre') as HTMLSelectElement;
    selectSemestre.value = 's1';
    selectSemestre.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    enviar();
    await fixture.whenStable();

    const submit = html.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.textContent?.trim()).toBe('Matriculando…');
    expect(submit.disabled).toBe(true);

    http
      .expectOne(URL_MATRICULAS)
      .flush(
        { id: 'm1', estudianteId: 'e1', asignaturaId: 'a1', semestreId: 's1', estado: 'ACTIVO' },
        { status: 201, statusText: 'Created' },
      );
  });

  it('si fallan los dos catálogos a la vez, muestra un solo aviso de reintento', async () => {
    await fixture.whenStable();
    catalogoAsignaturas().flush(null, { status: 0, statusText: 'Unknown Error' });
    catalogoSemestres().flush(null, { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();

    expect(html.querySelectorAll('.alerta').length).toBe(1);
    expect(html.textContent).toContain('No se pudieron cargar las opciones');
  });
});
