import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { AccionMejora } from '../../models/accion-mejora.model';
import { ConversionAccionMejoraDialog } from './conversion-accion-mejora-dialog';

const URL = `${environment.apiUrl}/v1/acciones-mejora/am1/conversion`;

const ACCION: AccionMejora = {
  id: 'am1',
  nombre: 'Taller de refuerzo',
  descripcion: 'Taller para reforzar integrales',
  fechaPropuesta: '2026-06-01',
  resultadoAprendizajeId: 'ra-1',
  resultadoAprendizajeCodigo: 'RA1',
  asignaturaId: 'a1',
  semestreId: 's1',
  semestreCodigo: '2026-1',
  conclusionOrigenId: 'c1',
  evaluacionGeneradaId: null,
  convertida: false,
};

describe('ConversionAccionMejoraDialog', () => {
  let fixture: ComponentFixture<ConversionAccionMejoraDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;
  let convertidas: AccionMejora[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConversionAccionMejoraDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ConversionAccionMejoraDialog);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    convertidas = [];
    fixture.componentInstance.convertida.subscribe((a) => convertidas.push(a));
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const campo = <T extends HTMLElement>(id: string) => html.querySelector(`#${id}`) as T;
  const enviarBoton = () => html.querySelector('button[type="submit"]') as HTMLButtonElement;

  async function abrir(): Promise<void> {
    fixture.componentRef.setInput('accion', ACCION);
    fixture.componentRef.setInput('abierto', true);
    await fixture.whenStable();
  }

  async function escribir(valor: string): Promise<void> {
    const control = campo<HTMLInputElement>('conversion-porcentaje');
    control.value = valor;
    control.dispatchEvent(new Event('input'));
    control.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function enviar(): Promise<void> {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  }

  it.each(['', '0', '-5', '101'])(
    'no deja confirmar con porcentaje «%s»',
    async (valor) => {
      await abrir();
      if (valor !== '') {
        await escribir(valor);
      }

      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
      await enviar();
      http.expectNone(URL);
    },
  );

  it('al confirmar con un valor válido llama al endpoint de conversión', async () => {
    await abrir();
    await escribir('20');
    expect(enviarBoton().hasAttribute('aria-disabled')).toBe(false);

    await enviar();
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ porcentaje: 20 });
    const convertida = { ...ACCION, convertida: true, evaluacionGeneradaId: 'ev1' };
    req.flush(convertida);
    await fixture.whenStable();

    expect(convertidas).toEqual([convertida]);
  });

  it('un error del backend (ya convertida o supera el 100%) muestra el mensaje y no deja la pantalla rota', async () => {
    await abrir();
    await escribir('20');
    await enviar();

    http.expectOne(URL).flush(
      { status: 409, error: 'CONFLICT', mensaje: 'La acción de mejora ya fue convertida.' },
      { status: 409, statusText: 'Conflict' },
    );
    await fixture.whenStable();

    const alerta = html.querySelector('[role="alert"]') as HTMLElement;
    expect(alerta.textContent).toContain('La acción de mejora ya fue convertida.');
    expect(convertidas).toEqual([]);
  });
});
