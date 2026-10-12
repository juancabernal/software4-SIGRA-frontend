import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Semestre } from '../../models/semestre.model';
import { SemestreExtenderDialog } from './semestre-extender-dialog';

const URL = `${environment.apiUrl}/v1/semestres/2090-1`;

const SEMESTRE: Semestre = {
  id: 'a',
  codigo: '2090-1',
  fechaInicio: '2090-01-20',
  fechaFin: '2090-06-10',
  estado: 'INACTIVO',
};

describe('SemestreExtenderDialog', () => {
  let fixture: ComponentFixture<SemestreExtenderDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SemestreExtenderDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SemestreExtenderDialog);
    fixture.componentRef.setInput('semestre', SEMESTRE);
    html = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function elegirYEnviar(fecha: string): Promise<void> {
    const input = html.querySelector('#semestre-nueva-fin') as HTMLInputElement;
    input.value = fecha;
    input.dispatchEvent(new Event('input'));
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('muestra el código y el rango actual', () => {
    expect(html.textContent).toContain('Extender el semestre 2090-1');
  });

  it('no permite acortar ni repetir la fecha de fin', async () => {
    await elegirYEnviar('2090-06-10');
    http.expectNone(URL);
    expect(html.textContent).toContain('Elige una fecha posterior');
  });

  it('envía solo la nueva fecha de fin y emite el resultado', async () => {
    let extendido: Semestre | undefined;
    fixture.componentInstance.extendido.subscribe((s) => (extendido = s));

    await elegirYEnviar('2090-06-30');
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ fechaFin: '2090-06-30' });
    req.flush({ ...SEMESTRE, fechaFin: '2090-06-30' });
    expect(extendido?.fechaFin).toBe('2090-06-30');
  });

  it('muestra el mensaje del backend si la extensión se cruza con otro semestre', async () => {
    await elegirYEnviar('2091-02-01');
    http
      .expectOne(URL)
      .flush(
        { status: 409, mensaje: 'El rango de fechas se cruza con el de otro semestre registrado' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();
    expect(html.querySelector('[role="alert"]')?.textContent).toContain('se cruza');
  });
});
