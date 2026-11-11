import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Facultad } from '../../../facultades/models/facultad.model';
import { FACULTAD_SIN_ASIGNAR_ID, Programa } from '../../models/programa.model';
import { ProgramaFormDialog } from './programa-form-dialog';

const URL = `${environment.apiUrl}/v1/programas`;
const URL_FACULTADES = `${environment.apiUrl}/v1/facultades`;

const INGENIERIA: Facultad = { id: 'f1', nombre: 'Facultad de Ingeniería', estado: 'ACTIVO' };
const DERECHO: Facultad = { id: 'f2', nombre: 'Facultad de Derecho', estado: 'ACTIVO' };
const SIN_ASIGNAR: Facultad = {
  id: FACULTAD_SIN_ASIGNAR_ID,
  nombre: 'Facultad sin asignar',
  estado: 'ACTIVO',
};

const EXISTENTE: Programa = {
  id: 'p1',
  codigo: 'ISIS',
  nombre: 'Ingeniería de Sistemas',
  facultadId: INGENIERIA.id,
  facultadNombre: INGENIERIA.nombre,
  estado: 'ACTIVO',
};

describe('ProgramaFormDialog', () => {
  let fixture: ComponentFixture<ProgramaFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;
  let guardados: Programa[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProgramaFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProgramaFormDialog);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    guardados = [];
    fixture.componentInstance.guardado.subscribe((p) => guardados.push(p));
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const campo = <T extends HTMLElement>(id: string) => html.querySelector(`#${id}`) as T;
  const facultad = () => campo<HTMLSelectElement>('programa-facultad');
  const opciones = () => Array.from(facultad().options).map((o) => o.textContent?.trim());
  const enviarBoton = () => html.querySelector('button[type="submit"]') as HTMLButtonElement;
  const errorModal = () => html.querySelector('.modal__error')?.textContent?.trim() ?? null;
  const facultadesReq = () =>
    http.expectOne((r) => r.url === URL_FACULTADES && r.params.get('estado') === 'ACTIVO');

  async function abrir(
    programa: Programa | null,
    facultades: Facultad[] | 'error' = [INGENIERIA, DERECHO, SIN_ASIGNAR],
  ): Promise<void> {
    fixture.componentRef.setInput('programa', programa);
    fixture.componentRef.setInput('abierto', true);
    await fixture.whenStable();
    const req = facultadesReq();
    if (facultades === 'error') {
      req.flush(
        { status: 503, error: 'X', mensaje: 'x' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    } else {
      req.flush(facultades);
    }
    await fixture.whenStable();
  }

  async function escribir(id: string, valor: string): Promise<void> {
    const control = campo<HTMLInputElement | HTMLSelectElement>(id);
    control.value = valor;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
    control.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function enviar(): Promise<void> {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  }

  async function llenarCrear(): Promise<void> {
    await escribir('programa-nombre', '  Derecho Penal ');
    await escribir('programa-codigo', 'der-pen');
    await escribir('programa-facultad', DERECHO.id);
  }

  describe('modo crear', () => {
    it('ofrece solo las facultades activas, sin «Facultad sin asignar»', async () => {
      await abrir(null);

      expect(opciones()).toEqual(['Selecciona...', INGENIERIA.nombre, DERECHO.nombre]);
    });

    it('sin facultad elegida no se puede enviar', async () => {
      await abrir(null);
      await escribir('programa-nombre', 'Derecho Penal');
      await escribir('programa-codigo', 'DER-PEN');

      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
      await enviar();
      http.expectNone(URL);
      expect(html.textContent).toContain('Selecciona una facultad activa.');
    });

    it('sin facultades activas avisa y bloquea el envío', async () => {
      await abrir(null, []);

      expect(html.textContent).toContain('No hay facultades activas disponibles');
      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
    });

    it('si fallan las facultades muestra el error y bloquea el envío', async () => {
      await abrir(null, 'error');

      expect(campo('programa-facultad-ayuda').textContent).toContain(
        'El servicio no está disponible',
      );
      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
    });

    it('registra enviando nombre, código y facultad', async () => {
      await abrir(null);
      await llenarCrear();
      await enviar();

      const req = http.expectOne(URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        nombre: 'Derecho Penal',
        codigo: 'der-pen',
        facultadId: DERECHO.id,
      });
      const creado: Programa = {
        ...EXISTENTE,
        id: 'p9',
        codigo: 'DER-PEN',
        nombre: 'Derecho Penal',
        facultadId: DERECHO.id,
        facultadNombre: DERECHO.nombre,
      };
      req.flush(creado, { status: 201, statusText: 'Created' });
      await fixture.whenStable();

      expect(guardados).toEqual([creado]);
    });

    it.each([
      [
        400,
        { mensaje: 'Los datos de entrada no cumplen', detalles: { facultadId: 'La facultad es obligatoria' } },
        ['Los datos de entrada no cumplen', 'La facultad es obligatoria'],
      ],
      [404, { mensaje: 'No existe la facultad indicada' }, ['No existe la facultad indicada']],
      [
        409,
        {
          mensaje:
            "No se puede asociar un programa a la facultad 'Facultad de Derecho' porque está inactiva",
        },
        ["No se puede asociar un programa a la facultad 'Facultad de Derecho' porque está inactiva"],
      ],
    ])('un %s al registrar muestra el mensaje del backend y conserva lo escrito', async (status, cuerpo, textos) => {
      await abrir(null);
      await llenarCrear();
      await enviar();

      http.expectOne(URL).flush({ status, error: 'X', ...cuerpo }, { status, statusText: 'X' });
      await fixture.whenStable();

      for (const texto of textos) {
        expect(errorModal()).toContain(texto);
      }
      expect(campo<HTMLInputElement>('programa-nombre').value).toBe('  Derecho Penal ');
      expect(guardados).toEqual([]);
    });
  });

  describe('modo editar', () => {
    it('muestra el código bloqueado y preselecciona la facultad actual', async () => {
      await abrir(EXISTENTE);

      expect(campo<HTMLInputElement>('programa-codigo').disabled).toBe(true);
      expect(facultad().disabled).toBe(false);
      expect(facultad().value).toBe(INGENIERIA.id);
      expect(opciones()).toEqual([INGENIERIA.nombre, DERECHO.nombre]);
    });

    it('agrega la facultad actual marcada como inactiva si ya no está activa', async () => {
      const enArtes: Programa = {
        ...EXISTENTE,
        facultadId: 'f-artes',
        facultadNombre: 'Facultad de Artes',
      };
      await abrir(enArtes);

      expect(opciones()).toEqual([
        'Facultad de Artes (inactiva)',
        INGENIERIA.nombre,
        DERECHO.nombre,
      ]);
      expect(facultad().value).toBe('f-artes');

      await enviar();
      const req = http.expectOne(`${URL}/${EXISTENTE.id}`);
      expect(req.request.body).toEqual({ nombre: EXISTENTE.nombre, facultadId: 'f-artes' });
      req.flush(enArtes);
      await fixture.whenStable();
      expect(guardados).toEqual([enArtes]);
    });

    it('un programa en «Facultad sin asignar» pide reasignarlo', async () => {
      await abrir({
        ...EXISTENTE,
        facultadId: FACULTAD_SIN_ASIGNAR_ID,
        facultadNombre: SIN_ASIGNAR.nombre,
      });

      expect(html.querySelector('.aviso-reasignar')?.textContent).toContain(
        'Selecciona la facultad a la que pertenece',
      );
      expect(opciones()).toEqual([SIN_ASIGNAR.nombre, INGENIERIA.nombre, DERECHO.nombre]);
    });

    it('guarda enviando nombre y la nueva facultad, nunca el código', async () => {
      await abrir(EXISTENTE);
      await escribir('programa-nombre', ' Ingeniería de Software ');
      await escribir('programa-facultad', DERECHO.id);
      await enviar();

      const req = http.expectOne(`${URL}/${EXISTENTE.id}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ nombre: 'Ingeniería de Software', facultadId: DERECHO.id });
      req.flush({ ...EXISTENTE, nombre: 'Ingeniería de Software', facultadId: DERECHO.id });
      await fixture.whenStable();
      expect(guardados.length).toBe(1);
    });

    it('si fallan las facultades permite guardar conservando la actual', async () => {
      await abrir(EXISTENTE, 'error');

      expect(opciones()).toEqual([INGENIERIA.nombre]);
      expect(campo('programa-facultad-ayuda').textContent).toContain(
        'El programa conservará su facultad actual.',
      );
      expect(enviarBoton().hasAttribute('aria-disabled')).toBe(false);
      await enviar();
      http.expectOne(`${URL}/${EXISTENTE.id}`).flush(EXISTENTE);
      await fixture.whenStable();
    });

    it.each([
      [404, 'No existe la facultad indicada'],
      [409, "No se puede asociar un programa a la facultad 'Facultad de Derecho' porque está inactiva"],
    ])('un %s al guardar muestra el mensaje del backend', async (status, mensaje) => {
      await abrir(EXISTENTE);
      await escribir('programa-facultad', DERECHO.id);
      await enviar();

      http
        .expectOne(`${URL}/${EXISTENTE.id}`)
        .flush({ status, error: 'X', mensaje }, { status, statusText: 'X' });
      await fixture.whenStable();

      expect(errorModal()).toContain(mensaje);
      expect(guardados).toEqual([]);
    });
  });
});
