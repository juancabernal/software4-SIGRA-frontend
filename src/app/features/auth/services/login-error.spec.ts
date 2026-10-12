import { HttpErrorResponse } from '@angular/common/http';

import { mensajeDeErrorLogin } from './login-error';

const URL = '/api/v1/auth/login';

const error = (status: number, cuerpo: unknown = null) =>
  new HttpErrorResponse({ status, error: cuerpo, url: URL });

describe('mensajeDeErrorLogin', () => {
  it('400 pide revisar los datos', () => {
    expect(mensajeDeErrorLogin(error(400))).toBe('Revisa los datos ingresados.');
  });

  it('401 indica correo o contraseña incorrectos', () => {
    expect(mensajeDeErrorLogin(error(401))).toBe('Correo o contraseña incorrectos.');
  });

  it('423 indica que el usuario está bloqueado temporalmente', () => {
    expect(mensajeDeErrorLogin(error(423))).toBe(
      'Tu usuario está temporalmente bloqueado. Intenta nuevamente más tarde.',
    );
  });

  it('sin conexión (status 0) pide verificar la conexión', () => {
    expect(mensajeDeErrorLogin(error(0))).toBe(
      'No fue posible conectar con el servidor. Verifica tu conexión e intenta nuevamente.',
    );
  });

  it('500 muestra un mensaje genérico', () => {
    expect(mensajeDeErrorLogin(error(500))).toBe(
      'No fue posible iniciar sesión. Intenta nuevamente.',
    );
  });

  it('nunca expone el contenido técnico del cuerpo (RNF-17)', () => {
    const cuerpo = {
      mensaje: 'could not execute statement; SQL [select * from usuarios]',
      detalles: 'org.hibernate.exception.SQLGrammarException at co.edu.uco.sigra',
    };
    for (const status of [400, 401, 423, 500]) {
      const mensaje = mensajeDeErrorLogin(error(status, cuerpo));
      expect(mensaje).not.toMatch(/SQL|hibernate|Exception|co\.edu|select/i);
    }
  });

  it('cualquier error que no sea HTTP usa el mensaje genérico', () => {
    expect(mensajeDeErrorLogin(new Error('boom'))).toBe(
      'No fue posible iniciar sesión. Intenta nuevamente.',
    );
  });
});
