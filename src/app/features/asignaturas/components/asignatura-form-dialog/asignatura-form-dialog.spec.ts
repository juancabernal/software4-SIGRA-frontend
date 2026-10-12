import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Asignatura, ProgramaOpcion } from '../../models/asignatura.model';
import {
  AsignaturaFormDialog,
  ERROR_PROGRAMAS,
  ResultadoFormulario,
} from './asignatura-form-dialog';

const URL = `${environment.apiUrl}/v1/asignaturas`;
const URL_PROGRAMAS = `${environment.apiUrl}/v1/programas`;

const PROGRAMAS: ProgramaOpcion[] = [
  { id: 'p1', codigo: 'ISIS', nombre: 'Ingeniería de Sistemas', estado: 'ACTIVO' },
  { id: 'p2', codigo: 'ICIV', nombre: 'Ingeniería Civil', estado: 'ACTIVO' },
];

const EXISTENTE: Asignatura = {
  id: 'a1',
  codigo: 'MAT-301',
  nombre: 'Cálculo Diferencial',
  programaId: 'p1',
  programaNombre: 'Ingeniería de Sistemas',
  estado: 'ACTIVA',
  cantidadRa: 5,
};

describe('AsignaturaFormDialog', () => {
  let fixture: ComponentFixture<AsignaturaFormDialog>;
  let http: HttpTestingController;
  let html: HTMLElement;
  let guardados: ResultadoFormulario[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AsignaturaFormDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AsignaturaFormDialog);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    guardados = [];
    fixture.componentInstance.guardado.subscribe((r) => guardados.push(r));
  });

  afterEach(() => {
    html.remove();
    http.verify();
  });

  const campo = <T extends HTMLElement>(id: string) => html.querySelector(`#${id}`) as T;
  const enviarBoton = () => html.querySelector('button[type="submit"]') as HTMLButtonElement;
  const programasReq = () =>
    http.expectOne((r) => r.url === URL_PROGRAMAS && r.params.get('estado') === 'ACTIVO');

  async function abrirCrear(programas: ProgramaOpcion[] | 'error' = PROGRAMAS): Promise<void> {
    fixture.componentRef.setInput('abierto', true);
    await fixture.whenStable();
    const req = programasReq();
    if (programas === 'error') {
      req.flush(null, { status: 404, statusText: 'Not Found' });
    } else {
      req.flush(programas);
    }
    await fixture.whenStable();
  }

  async function abrirEditar(): Promise<void> {
    fixture.componentRef.setInput('asignatura', EXISTENTE);
    fixture.componentRef.setInput('abierto', true);
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

  async function llenarValido(): Promise<void> {
    await escribir('materia-nombre', '  Cálculo Integral  ');
    await escribir('materia-codigo', 'mat-401');
    await escribir('materia-programa', 'p1');
  }

  describe('modo crear', () => {
    it('pide exactamente 3 campos obligatorios y solo programas ACTIVOS', async () => {
      await abrirCrear();

      expect(html.querySelector('h2')?.textContent).toContain('Registrar materia');
      const controles = html.querySelectorAll('.campos input, .campos select');
      expect(Array.from(controles).map((c) => c.id)).toEqual([
        'materia-nombre',
        'materia-codigo',
        'materia-programa',
      ]);
      expect(html.querySelectorAll('.obligatorio').length).toBe(3);
      const opciones = Array.from(campo<HTMLSelectElement>('materia-programa').options);
      expect(opciones.map((o) => o.textContent?.trim())).toEqual([
        'Selecciona...',
        'Ingeniería de Sistemas',
        'Ingeniería Civil',
      ]);
      expect(campo<HTMLInputElement>('materia-nombre').placeholder).toBe('Ej. Cálculo Integral');
      expect(campo<HTMLInputElement>('materia-codigo').placeholder).toBe('Ej. MAT-401');
      expect(campo('materia-nombre-ayuda').textContent?.trim()).toBe('Entre 3 y 100 caracteres');
      expect(campo('materia-codigo-ayuda').textContent?.trim()).toBe('Entre 3 y 20 caracteres');
    });

    it('con el formulario vacío el botón queda atenuado y enviar solo marca los errores', async () => {
      await abrirCrear();

      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
      await enviar();

      http.expectNone(URL);
      expect(html.textContent).toContain('Escribe el nombre de la materia.');
      expect(html.textContent).toContain('Escribe el código de la materia.');
      expect(html.textContent).toContain('Selecciona un programa académico.');
      expect(campo('materia-nombre').getAttribute('aria-invalid')).toBe('true');
    });

    const errorDe = (id: string) => campo(`${id}-error`)?.textContent?.trim() ?? null;
    const FORMATO_CODIGO =
      'Solo letras, números y guiones; sin espacios ni guiones al inicio, al final o seguidos';

    it.each([
      ['A'.repeat(2), 'Mínimo 3 caracteres'],
      ['A'.repeat(3), null],
      ['A'.repeat(20), null],
      ['A'.repeat(21), 'El código no puede superar los 20 caracteres.'],
      ['  ab  ', 'Mínimo 3 caracteres'],
      [` ${'a'.repeat(20)} `, null],
    ])('código «%s» (límites 2/3/20/21 sobre el valor recortado) → %s', async (valor, error) => {
      await abrirCrear();
      await escribir('materia-codigo', valor);
      expect(errorDe('materia-codigo')).toBe(error);
    });

    it.each([
      ['A'.repeat(2), 'Mínimo 3 caracteres'],
      ['A'.repeat(3), null],
      ['A'.repeat(100), null],
      ['A'.repeat(101), 'El nombre no puede superar los 100 caracteres.'],
      ['  A    B  ', null],
      [`${'A'.repeat(50)}     ${'A'.repeat(49)}`, null],
      ['A\t\n B', null],
      ['   ', 'Escribe el nombre de la materia.'],
    ])(
      'nombre «%s» (límites 2/3/100/101 sobre el valor normalizado) → %s',
      async (valor, error) => {
        await abrirCrear();
        await escribir('materia-nombre', valor);
        expect(errorDe('materia-nombre')).toBe(error);
      },
    );

    it.each(['AB C', '-AB', 'AB-', 'A--B', 'IS W4!', 'MAT_401', 'CÁL-101'])(
      'rechaza el código con formato inválido «%s»',
      async (valor) => {
        await abrirCrear();
        await escribir('materia-codigo', valor);
        expect(errorDe('materia-codigo')).toBe(FORMATO_CODIGO);
        expect(campo('materia-codigo').getAttribute('aria-invalid')).toBe('true');
      },
    );

    it.each(['mat-401', 'MAT401', 'A1-B2-C3', '  is-w4  '])(
      'acepta el código con formato válido «%s»',
      async (valor) => {
        await abrirCrear();
        await escribir('materia-codigo', valor);
        expect(errorDe('materia-codigo')).toBeNull();
      },
    );

    it.each([
      ['<script>x</script>', 'con < y >'],
      ['Cálculo > Álgebra', 'con >'],
      ['Cálculo\u0007Integral', 'con carácter de control'],
      ['Cálculo​Integral', 'con carácter de formato invisible'],
    ])('rechaza el nombre «%s» (%s)', async (valor) => {
      await abrirCrear();
      await escribir('materia-nombre', valor);
      expect(errorDe('materia-nombre')).toBe('El nombre contiene caracteres no permitidos');
    });

    it('con un campo inválido no se puede enviar', async () => {
      await abrirCrear();
      await llenarValido();
      await escribir('materia-codigo', 'A--B');

      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
      await enviar();
      http.expectNone(URL);
    });

    it('con datos válidos registra en mayúsculas y sin espacios sobrantes', async () => {
      await abrirCrear();
      await llenarValido();
      expect(enviarBoton().hasAttribute('aria-disabled')).toBe(false);

      await enviar();
      expect(enviarBoton().textContent?.trim()).toBe('Procesando…');
      const req = http.expectOne(URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        codigo: 'MAT-401',
        nombre: 'Cálculo Integral',
        programaId: 'p1',
      });
      const creada = { ...EXISTENTE, codigo: 'MAT-401', estado: 'BORRADOR' as const };
      req.flush(creada);
      await fixture.whenStable();

      expect(guardados).toEqual([{ asignatura: creada, modo: 'crear' }]);
    });

    it('envía el nombre con las rachas de espacios, tabs y saltos de línea reducidos a uno', async () => {
      await abrirCrear();
      await escribir('materia-nombre', '  Cálculo \t\n  Integral  ');
      await escribir('materia-codigo', '  mat-401 ');
      await escribir('materia-programa', 'p1');
      await enviar();

      const req = http.expectOne(URL);
      expect(req.request.body).toEqual({
        codigo: 'MAT-401',
        nombre: 'Cálculo Integral',
        programaId: 'p1',
      });
      req.flush({ ...EXISTENTE, codigo: 'MAT-401', estado: 'BORRADOR' as const });
      await fixture.whenStable();
    });

    it('un 400 muestra el mensaje y los detalles conservando lo escrito', async () => {
      await abrirCrear();
      await llenarValido();
      await enviar();

      http.expectOne(URL).flush(
        {
          status: 400,
          error: 'BAD_REQUEST',
          mensaje: 'Los datos de entrada no cumplen con las validaciones requeridas',
          detalles: ['nombre: El nombre es obligatorio'],
        },
        { status: 400, statusText: 'Bad Request' },
      );
      await fixture.whenStable();

      const alerta = html.querySelector('[role="alert"]') as HTMLElement;
      expect(alerta.textContent).toContain('no cumplen con las validaciones requeridas');
      expect(alerta.textContent).toContain('El nombre es obligatorio');
      expect(campo<HTMLInputElement>('materia-codigo').value).toBe('mat-401');
      expect(guardados).toEqual([]);
    });

    it('un 409 por código duplicado muestra el mensaje y marca el campo Código', async () => {
      await abrirCrear();
      await llenarValido();
      await enviar();

      http.expectOne(URL).flush(
        {
          status: 409,
          error: 'CONFLICT',
          mensaje: 'Ya existe una asignatura con el código MAT-401.',
        },
        { status: 409, statusText: 'Conflict' },
      );
      await fixture.whenStable();

      expect(html.querySelector('[role="alert"]')?.textContent).toContain(
        'Ya existe una asignatura con el código MAT-401.',
      );
      expect(html.textContent).toContain('Ya existe una materia con este código.');
      expect(campo('materia-codigo').getAttribute('aria-invalid')).toBe('true');
    });

    it('un 404 (programa inexistente) muestra el mensaje del backend', async () => {
      await abrirCrear();
      await llenarValido();
      await enviar();

      http.expectOne(URL).flush(
        {
          status: 404,
          error: 'NOT_FOUND',
          mensaje: 'No existe un programa académico con id p1.',
        },
        { status: 404, statusText: 'Not Found' },
      );
      await fixture.whenStable();

      expect(html.querySelector('[role="alert"]')?.textContent).toContain(
        'No existe un programa académico',
      );
    });

    it('si los programas no cargan, lo explica en el campo y no se puede enviar', async () => {
      await abrirCrear('error');
      await escribir('materia-nombre', 'Cálculo Integral');
      await escribir('materia-codigo', 'MAT-401');

      expect(html.textContent).toContain(ERROR_PROGRAMAS);
      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
      await enviar();
      http.expectNone(URL);
    });
  });

  describe('modo editar', () => {
    it('bloquea código y programa con candado y solo deja editar el nombre', async () => {
      await abrirEditar();

      expect(html.querySelector('h2')?.textContent).toContain('Modificar materia');
      expect(enviarBoton().textContent?.trim()).toBe('Guardar cambios');
      expect(campo<HTMLInputElement>('materia-nombre').value).toBe('Cálculo Diferencial');
      expect(campo<HTMLInputElement>('materia-codigo-fijo').readOnly).toBe(true);
      expect(campo<HTMLInputElement>('materia-codigo-fijo').value).toBe('MAT-301');
      expect(campo<HTMLInputElement>('materia-programa-fijo').value).toBe('Ingeniería de Sistemas');
      expect(html.querySelectorAll('.bloqueado svg').length).toBe(2);
      expect(html.textContent).toContain('No se puede modificar');
      expect(html.querySelector('#materia-codigo')).toBeNull();
      expect(html.querySelector('#materia-programa')).toBeNull();
      http.expectNone(URL_PROGRAMAS);
    });

    it('guardar envía solo el nombre con PUT', async () => {
      await abrirEditar();
      await escribir('materia-nombre', ' Cálculo   \t I ');
      await enviar();

      const req = http.expectOne(`${URL}/a1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ nombre: 'Cálculo I' });
      const actualizada = { ...EXISTENTE, nombre: 'Cálculo I' };
      req.flush(actualizada);
      await fixture.whenStable();

      expect(guardados).toEqual([{ asignatura: actualizada, modo: 'editar' }]);
    });

    it('en editar también valida el nombre normalizado y los caracteres prohibidos', async () => {
      await abrirEditar();
      await escribir('materia-nombre', ' A  B ');
      expect(campo('materia-nombre-error')).toBeNull();
      await escribir('materia-nombre', 'AB');
      expect(campo('materia-nombre-error')?.textContent?.trim()).toBe('Mínimo 3 caracteres');
      await escribir('materia-nombre', 'Cálculo <b>');
      expect(campo('materia-nombre-error')?.textContent?.trim()).toBe(
        'El nombre contiene caracteres no permitidos',
      );
      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
      await enviar();
      http.expectNone(`${URL}/a1`);
    });

    it('con el nombre vacío no envía', async () => {
      await abrirEditar();
      await escribir('materia-nombre', '');

      expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
      await enviar();
      http.expectNone(`${URL}/a1`);
    });
  });
});
