import { HttpErrorResponse } from '@angular/common/http';

import { mensajeDeError } from './estudiante-error';

const URL = 'http://localhost:8080/api/v1/estudiantes';

const error = (status: number, cuerpo: unknown) =>
  new HttpErrorResponse({ status, error: cuerpo, url: URL });

describe('mensajeDeError', () => {
  it('usa el mensaje del backend ante un 409 de documento duplicado', () => {
    const resultado = mensajeDeError(
      error(409, {
        status: 409,
        error: 'CONFLICT',
        mensaje: 'Ya existe un estudiante registrado con el número de documento 123456789',
      }),
    );
    expect(resultado).toEqual({
      mensaje: 'Ya existe un estudiante registrado con el número de documento 123456789',
      detalles: [],
    });
  });

  it('muestra los detalles de validación de un 400 sin el nombre del campo', () => {
    const resultado = mensajeDeError(
      error(400, {
        mensaje: 'Los datos de entrada no cumplen con las validaciones requeridas',
        detalles: [
          'numeroDocumento: El número de documento debe tener entre 6 y 10 dígitos',
          'correoInstitucional: El correo debe pertenecer al dominio @uco.net.co',
        ],
      }),
    );
    expect(resultado.detalles).toEqual([
      'El número de documento debe tener entre 6 y 10 dígitos',
      'El correo debe pertenecer al dominio @uco.net.co',
    ]);
  });

  it('usa el mensaje del backend ante un 404 sin detalles', () => {
    const resultado = mensajeDeError(
      error(404, { mensaje: 'No existe un estudiante con ese identificador' }),
    );
    expect(resultado).toEqual({
      mensaje: 'No existe un estudiante con ese identificador',
      detalles: [],
    });
  });

  it('no expone el cuerpo de un 500', () => {
    const resultado = mensajeDeError(
      error(500, {
        mensaje: 'Ocurrió un error',
        detalles: 'could not execute statement; SQL [...]',
      }),
    );
    expect(resultado.detalles).toEqual([]);
    expect(resultado.mensaje).not.toContain('SQL');
  });

  it('explica cuando no hay conexión con el backend', () => {
    expect(mensajeDeError(error(0, null)).mensaje).toContain('No se pudo conectar con el servidor');
  });
});
