import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { Estudiante, EstudianteRequest } from '../../models/estudiante.model';
import { TIPOS_DOCUMENTO } from '../../models/tipos-documento';
import { EstudiantesPage } from './estudiantes-page';

/**
 * Pruebas de integración (ver design.md): `EstudiantesPage` montada con su diálogo hijo real
 * `EstudianteFormDialog` (no un doble), compartiendo el mismo `HttpTestingController`. Cubren el
 * flujo de registrar y de modificar un estudiante hasta ver la fila reflejada en el listado, que
 * las pruebas unitarias aisladas de cada componente nunca combinan.
 */

const URL = `${environment.apiUrl}/v1/estudiantes`;

function estudiante(parcial: Partial<Estudiante>): Estudiante {
  return {
    id: 'e1',
    tipoDocumentoNombre: TIPOS_DOCUMENTO[0].nombre,
    numeroDocumento: '1234567890',
    nombreCompleto: 'Ana María Gómez',
    correoInstitucional: 'ana@uco.net.co',
    estado: 'ACTIVO',
    ...parcial,
  };
}

const ANA = estudiante({});
const LUIS = estudiante({
  id: 'e2',
  numeroDocumento: '1122334455',
  nombreCompleto: 'Luis Fernando Ortiz',
  correoInstitucional: 'luis@uco.net.co',
});

describe('EstudiantesPage (integración con EstudianteFormDialog)', () => {
  let fixture: ComponentFixture<EstudiantesPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EstudiantesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EstudiantesPage);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const listado = () => http.expectOne((r) => r.url === URL && r.method === 'GET');
  const fila = (texto: string) =>
    Array.from(html.querySelectorAll('tbody tr')).find((tr) =>
      tr.textContent?.includes(texto),
    ) as HTMLTableRowElement;
  const boton = (raiz: ParentNode, texto: string) =>
    Array.from(raiz.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  function campo<T extends HTMLElement>(raiz: ParentNode, id: string): T {
    return raiz.querySelector(`#${id}`) as T;
  }

  function escribir(raiz: ParentNode, id: string, valor: string): void {
    const control = campo<HTMLInputElement | HTMLSelectElement>(raiz, id);
    control.value = valor;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
    control.dispatchEvent(new Event('blur'));
  }

  async function iniciar(estudiantes: Estudiante[]): Promise<void> {
    await fixture.whenStable();
    listado().flush(estudiantes);
    await fixture.whenStable();
  }

  it('registrar un estudiante desde la página muestra la fila nueva sin recargar la página completa', async () => {
    await iniciar([ANA]);

    boton(html, 'Registrar estudiante').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-estudiante-form-dialog dialog') as HTMLDialogElement;
    expect(dialogo).toBeTruthy();

    escribir(dialogo, 'estudiante-tipo-documento', TIPOS_DOCUMENTO[0].id);
    escribir(dialogo, 'estudiante-numero-documento', LUIS.numeroDocumento);
    escribir(dialogo, 'estudiante-nombre', LUIS.nombreCompleto);
    escribir(dialogo, 'estudiante-correo', LUIS.correoInstitucional);
    await fixture.whenStable();

    (dialogo.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const registro = http.expectOne((r) => r.url === URL && r.method === 'POST');
    const cuerpoEsperado: EstudianteRequest = {
      tipoDocumentoId: TIPOS_DOCUMENTO[0].id,
      numeroDocumento: LUIS.numeroDocumento,
      nombreCompleto: LUIS.nombreCompleto,
      correoInstitucional: LUIS.correoInstitucional,
    };
    expect(registro.request.body).toEqual(cuerpoEsperado);
    registro.flush(LUIS, { status: 201, statusText: 'Created' });
    await fixture.whenStable();

    expect(html.querySelector('app-estudiante-form-dialog')).toBeNull();
    expect(html.querySelector('.aviso-zona')?.textContent).toContain(
      `Estudiante registrado: ${LUIS.nombreCompleto}.`,
    );

    listado().flush([ANA, LUIS]);
    await fixture.whenStable();

    expect(html.querySelectorAll('tbody tr').length).toBe(2);
    expect(fila(LUIS.nombreCompleto)).toBeTruthy();
  });

  it('modificar un estudiante desde la página muestra la fila actualizada', async () => {
    await iniciar([ANA]);

    boton(fila(ANA.nombreCompleto), 'Modificar').click();
    await fixture.whenStable();

    const dialogo = html.querySelector('app-estudiante-form-dialog dialog') as HTMLDialogElement;
    expect(dialogo.querySelector('h2')?.textContent).toContain('Modificar estudiante');

    const nombreActualizado = 'Ana María Gómez Pérez';
    escribir(dialogo, 'estudiante-nombre', nombreActualizado);
    await fixture.whenStable();

    (dialogo.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const modificado = estudiante({ nombreCompleto: nombreActualizado });
    const peticion = http.expectOne((r) => r.url === `${URL}/${ANA.id}` && r.method === 'PUT');
    const cuerpoEsperado: EstudianteRequest = {
      tipoDocumentoId: TIPOS_DOCUMENTO[0].id,
      numeroDocumento: ANA.numeroDocumento,
      nombreCompleto: nombreActualizado,
      correoInstitucional: ANA.correoInstitucional,
    };
    expect(peticion.request.body).toEqual(cuerpoEsperado);
    peticion.flush(modificado);
    await fixture.whenStable();

    expect(html.querySelector('app-estudiante-form-dialog')).toBeNull();
    expect(html.querySelector('.aviso-zona')?.textContent).toContain(
      `Estudiante modificado: ${nombreActualizado}.`,
    );

    listado().flush([modificado]);
    await fixture.whenStable();

    expect(html.querySelectorAll('tbody tr').length).toBe(1);
    expect(fila(nombreActualizado)).toBeTruthy();
  });
});
