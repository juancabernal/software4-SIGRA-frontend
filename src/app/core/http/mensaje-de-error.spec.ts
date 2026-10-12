import { HttpErrorResponse } from '@angular/common/http';

import { INESPERADO, SIN_CONEXION, mensajeDeError } from './mensaje-de-error';

const errorHttp = (status: number, cuerpo: unknown = null) =>
  new HttpErrorResponse({ status, error: cuerpo, statusText: 'x' });

describe('mensajeDeError', () => {
  it('sin conexión (status 0) pide verificar la conexión', () => {
    expect(mensajeDeError(errorHttp(0))).toEqual({ mensaje: SIN_CONEXION, detalles: [] });
  });

  it('un 5xx muestra un mensaje genérico y nunca el cuerpo', () => {
    const resultado = mensajeDeError(
      errorHttp(500, { mensaje: 'SQL: select * from tabla', detalles: ['org.hibernate...'] }),
    );
    expect(resultado).toEqual({ mensaje: INESPERADO, detalles: [] });
  });

  it('un 4xx muestra el mensaje del backend tal cual', () => {
    const resultado = mensajeDeError(
      errorHttp(409, { status: 409, error: 'CONFLICT', mensaje: 'Ya existe una asignatura.' }),
    );
    expect(resultado).toEqual({ mensaje: 'Ya existe una asignatura.', detalles: [] });
  });

  it('quita el prefijo «campo: » de los detalles de validación', () => {
    const resultado = mensajeDeError(
      errorHttp(400, {
        mensaje: 'Los datos de entrada no cumplen con las validaciones requeridas',
        detalles: ['nombre: El nombre es obligatorio', 'sin prefijo', 42],
      }),
    );
    expect(resultado.detalles).toEqual(['El nombre es obligatorio', 'sin prefijo']);
  });

  it('un 4xx sin mensaje legible usa el mensaje genérico', () => {
    expect(mensajeDeError(errorHttp(404, 'texto plano')).mensaje).toBe(INESPERADO);
  });

  it('un error que no es HTTP usa el mensaje genérico', () => {
    expect(mensajeDeError(new Error('falla'))).toEqual({ mensaje: INESPERADO, detalles: [] });
  });
});
