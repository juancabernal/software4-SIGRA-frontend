import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Semestre } from '../../models/semestre.model';
import { SemestreFormDialog } from './semestre-form-dialog';

const URL = `${environment.apiUrl}/v1/semestres`;

describe('SemestreFormDialog', () => {
  let fixture: ComponentFixture<SemestreFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SemestreFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SemestreFormDialog);
    html = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function escribir(id: string, valor: string): void {
    const input = html.querySelector(`#${id}`) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  async function enviar(): Promise<void> {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('no llama a la API si faltan datos y marca los campos', async () => {
    await enviar();
    http.expectNone(URL);
    expect(html.textContent).toContain('Escribe el código del semestre.');
    expect(html.textContent).toContain('Selecciona la fecha de inicio.');
  });

  it('rechaza un código con formato inválido', async () => {
    escribir('semestre-codigo', '2027-3');
    await fixture.whenStable();
    expect(html.textContent).toContain('Usa el formato AAAA-1 o AAAA-2.');
  });

  it('exige que la fecha de fin sea posterior a la de inicio', async () => {
    escribir('semestre-codigo', '2098-1');
    escribir('semestre-inicio', '2098-06-10');
    escribir('semestre-fin', '2098-01-20');
    await enviar();
    http.expectNone(URL);
    expect(html.textContent).toContain('La fecha de fin debe ser posterior a la de inicio.');
  });

  it('envía el registro y emite el semestre creado', async () => {
    let creado: Semestre | undefined;
    fixture.componentInstance.guardado.subscribe((s) => (creado = s));

    escribir('semestre-codigo', '2098-1');
    escribir('semestre-inicio', '2098-01-20');
    escribir('semestre-fin', '2098-06-10');
    await enviar();

    const req = http.expectOne(URL);
    expect(req.request.body).toEqual({
      codigo: '2098-1',
      fechaInicio: '2098-01-20',
      fechaFin: '2098-06-10',
    });
    req.flush({ id: 'x', ...req.request.body, estado: 'INACTIVO' });
    expect(creado?.codigo).toBe('2098-1');
  });

  it('muestra el mensaje del backend cuando rechaza el registro', async () => {
    escribir('semestre-codigo', '2090-2');
    escribir('semestre-inicio', '2090-06-01');
    escribir('semestre-fin', '2090-12-01');
    await enviar();

    http
      .expectOne(URL)
      .flush(
        { status: 409, error: 'CONFLICT', mensaje: 'El rango de fechas se cruza con el de otro semestre registrado' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    expect(html.querySelector('[role="alert"]')?.textContent).toContain(
      'El rango de fechas se cruza con el de otro semestre registrado',
    );
  });
});
