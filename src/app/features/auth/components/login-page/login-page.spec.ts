import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import { SessionService } from '../../../../core/services/session.service';
import { LoginResponse } from '../../models/auth.model';
import { LoginPage } from './login-page';

const URL = `${environment.apiUrl}/v1/auth/login`;

const RESPUESTA: LoginResponse = {
  token: 'jwt-de-prueba',
  tipo: 'Bearer',
  expiraEn: 3600,
  usuario: {
    id: '00000000-0000-4000-c000-000000000010',
    nombreCompleto: 'Profesor Bruno',
    correoInstitucional: 'profesor.bruno@uco.net.co',
    rol: 'PROFESOR',
  },
};

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let http: HttpTestingController;
  let html: HTMLElement;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginPage],
      // El componente navega a la pantalla del rol tras guardar la sesión (§7.2): sin router no
      // se puede construir. Se declara la ruta de destino del PROFESOR, que es la del RESPUESTA.
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'profesor/asignaturas', children: [] }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoginPage);
    html = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function escribir(id: string, valor: string): void {
    const input = html.querySelector(`#${id}`) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function enviar(): void {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function llenarFormularioValido(
    correo = 'profesor.bruno@uco.net.co',
    contrasena = 'PasswordSeguro123*',
  ) {
    escribir('login-correo', correo);
    escribir('login-contrasena', contrasena);
  }

  const alerta = (): HTMLElement | null => html.querySelector('[role="alert"]');
  const campo = (id: string): HTMLInputElement => html.querySelector(`#${id}`) as HTMLInputElement;
  const esInvalido = (id: string): boolean => campo(id).getAttribute('aria-invalid') === 'true';

  it('muestra el estado inicial sin mensajes de error', () => {
    expect(html.querySelector('h1')?.textContent).toContain('Iniciar sesión');
    expect(alerta()).toBeNull();
    expect(html.querySelector('.error-campo')).toBeNull();
    expect(esInvalido('login-correo')).toBe(false);
    expect(esInvalido('login-contrasena')).toBe(false);
  });

  describe('validaciones', () => {
    it('un formulario vacío es inválido y al enviarlo marca los dos campos', () => {
      enviar();
      http.expectNone(URL);
      expect(html.textContent).toContain('Escribe tu correo institucional.');
      expect(html.textContent).toContain('Escribe tu contraseña.');
    });

    it('el correo vacío es inválido', () => {
      escribir('login-correo', '');
      expect(esInvalido('login-correo')).toBe(true);
      expect(html.textContent).toContain('Escribe tu correo institucional.');
    });

    it('la contraseña vacía es inválida', () => {
      escribir('login-contrasena', '');
      expect(esInvalido('login-contrasena')).toBe(true);
      expect(html.textContent).toContain('Escribe tu contraseña.');
    });

    it('rechaza un correo de otro dominio como @gmail.com', () => {
      escribir('login-correo', 'profesor@gmail.com');
      expect(esInvalido('login-correo')).toBe(true);
      expect(html.textContent).toContain(
        'Usa tu correo institucional, que termina en @uco.net.co.',
      );
    });

    it('acepta el dominio @UCO.NET.CO en mayúsculas', () => {
      escribir('login-correo', 'PROFESOR@UCO.NET.CO');
      expect(esInvalido('login-correo')).toBe(false);
      expect(html.querySelector('#login-correo-error')).toBeNull();
    });

    it('un correo solo con espacios se trata como vacío', () => {
      escribir('login-correo', '   ');
      expect(html.textContent).toContain('Escribe tu correo institucional.');
    });
  });

  describe('envío', () => {
    it('un formulario inválido no llama al AuthService', () => {
      escribir('login-correo', 'profesor@gmail.com');
      escribir('login-contrasena', 'PasswordSeguro123*');
      enviar();
      http.expectNone(URL);
    });

    it('normaliza el correo con espacios y mayúsculas antes de enviarlo', () => {
      llenarFormularioValido('  PROFESOR.BRUNO@UCO.NET.CO  ');
      enviar();

      const req = http.expectOne(URL);
      expect(req.request.body.correoInstitucional).toBe('profesor.bruno@uco.net.co');
      req.flush(RESPUESTA);
    });

    it('no modifica la contraseña', () => {
      const contrasena = '  Clave Con Espacios*  ';
      llenarFormularioValido('profesor.bruno@uco.net.co', contrasena);
      enviar();

      const req = http.expectOne(URL);
      expect(req.request.body.contrasena).toBe(contrasena);
      req.flush(RESPUESTA);
    });

    it('un formulario válido llama al AuthService una sola vez', () => {
      llenarFormularioValido();
      enviar();

      http.expectOne(URL).flush(RESPUESTA);
    });

    it('durante la petición bloquea el botón y muestra el texto de carga', () => {
      llenarFormularioValido();
      enviar();

      const boton = html.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(boton.disabled).toBe(true);
      expect(boton.textContent).toContain('Iniciando sesión…');

      http.expectOne(URL).flush(null, { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();
      expect(boton.disabled).toBe(false);
      expect(boton.textContent).toContain('Iniciar sesión');
    });

    it('impide un doble envío mientras la petición está en curso', () => {
      llenarFormularioValido();
      enviar();
      enviar();

      http.expectOne(URL).flush(RESPUESTA);
    });
  });

  describe('resultados', () => {
    it('con 200 guarda la sesión y confirma el inicio', () => {
      llenarFormularioValido();
      enviar();
      http.expectOne(URL).flush(RESPUESTA);
      fixture.detectChanges();

      const sesion = TestBed.inject(SessionService);
      expect(sesion.getToken()).toBe('jwt-de-prueba');
      expect(sesion.getUser()).toEqual(RESPUESTA.usuario);
      expect(html.querySelector('[role="status"]')?.textContent).toContain(
        'Bienvenido, Profesor Bruno',
      );
    });

    it('con 200 entra a la pantalla por defecto del rol (§7.2)', async () => {
      const router = TestBed.inject(Router);
      llenarFormularioValido();
      enviar();
      http.expectOne(URL).flush(RESPUESTA);
      await fixture.whenStable();

      expect(router.url).toBe('/profesor/asignaturas');
    });

    it('tras un login correcto borra la contraseña del formulario', () => {
      llenarFormularioValido();
      enviar();
      http.expectOne(URL).flush(RESPUESTA);

      expect(campo('login-contrasena').value).toBe('');
    });

    it('con 400 muestra el mensaje de revisar los datos', () => {
      llenarFormularioValido();
      enviar();
      http
        .expectOne(URL)
        .flush(
          { status: 400, error: 'BAD_REQUEST', mensaje: 'Los datos no son válidos' },
          { status: 400, statusText: 'Bad Request' },
        );
      fixture.detectChanges();

      expect(alerta()?.textContent).toContain('Revisa los datos ingresados.');
    });

    it('con 401 muestra que el correo o la contraseña son incorrectos', () => {
      llenarFormularioValido();
      enviar();
      http
        .expectOne(URL)
        .flush(
          { status: 401, error: 'UNAUTHORIZED', mensaje: 'Correo o contraseña incorrectos' },
          { status: 401, statusText: 'Unauthorized' },
        );
      fixture.detectChanges();

      expect(alerta()?.textContent).toContain('Correo o contraseña incorrectos.');
      expect(TestBed.inject(SessionService).hasSession()).toBe(false);
    });

    it('con 423 muestra el mensaje de bloqueo temporal', () => {
      llenarFormularioValido();
      enviar();
      http
        .expectOne(URL)
        .flush(
          { status: 423, error: 'LOCKED', mensaje: 'Usuario bloqueado' },
          { status: 423, statusText: 'Locked' },
        );
      fixture.detectChanges();

      expect(alerta()?.textContent).toContain('temporalmente bloqueado');
    });

    it('con 500 muestra un mensaje genérico', () => {
      llenarFormularioValido();
      enviar();
      http.expectOne(URL).flush(null, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(alerta()?.textContent).toContain('No fue posible iniciar sesión. Intenta nuevamente.');
    });

    it('sin conexión muestra el mensaje de conexión', () => {
      llenarFormularioValido();
      enviar();
      http
        .expectOne(URL)
        .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
      fixture.detectChanges();

      expect(alerta()?.textContent).toContain('No fue posible conectar con el servidor');
    });

    it('nunca muestra texto técnico del backend (RNF-17)', () => {
      llenarFormularioValido();
      enviar();
      http
        .expectOne(URL)
        .flush(
          { mensaje: 'could not execute statement; SQL [select * from usuarios]' },
          { status: 500, statusText: 'Server Error' },
        );
      fixture.detectChanges();

      const texto = html.textContent ?? '';
      expect(texto).not.toMatch(/SQL|hibernate|Exception|co\.edu|JWT_SECRET|DB_PASSWORD/i);
    });

    it('al reenviar se limpia el error anterior', () => {
      llenarFormularioValido();
      enviar();
      http.expectOne(URL).flush(null, { status: 401, statusText: 'Unauthorized' });
      fixture.detectChanges();
      expect(alerta()).not.toBeNull();

      enviar();
      expect(alerta()).toBeNull();
      http.expectOne(URL).flush(RESPUESTA);
    });
  });
});
