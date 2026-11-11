import { FormControl } from '@angular/forms';

import {
  LONGITUD_MAXIMA_PARTE_NOMBRE,
  PATRON_CORREO_INSTITUCIONAL,
  PATRON_NUMERO_DOCUMENTO,
  PATRON_PARTE_NOMBRE,
  partesNombreParaPeticion,
  validadoresEstudiante,
} from './validadores-estudiante';

describe('PATRON_PARTE_NOMBRE', () => {
  it.each(['Ana', 'José', 'Ñústes', 'PEREZ', 'ü'])('"%s" es una parte de nombre válida', (parte) => {
    expect(PATRON_PARTE_NOMBRE.test(parte)).toBe(true);
  });

  it.each(['Ana2', 'Ana@', 'Ana_', 'Ana-Pérez', 'Ana María', ' Ana', 'Ana ', ''])(
    '"%s" no es una parte de nombre válida',
    (parte) => {
      expect(PATRON_PARTE_NOMBRE.test(parte)).toBe(false);
    },
  );
});

describe('validadoresEstudiante: partes del nombre', () => {
  const control = (campo: 'primerNombre' | 'segundoNombre' | 'primerApellido' | 'segundoApellido', valor: string) =>
    new FormControl(valor, validadoresEstudiante()[campo]);

  it.each(['primerNombre', 'primerApellido', 'segundoApellido'] as const)(
    '%s es obligatorio',
    (campo) => {
      expect(control(campo, '').hasError('required')).toBe(true);
    },
  );

  it('segundoNombre es opcional', () => {
    expect(control('segundoNombre', '').valid).toBe(true);
    expect(control('segundoNombre', 'María').valid).toBe(true);
  });

  it.each(['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido'] as const)(
    '%s rechaza espacios y dígitos',
    (campo) => {
      expect(control(campo, 'Ana María').hasError('pattern')).toBe(true);
      expect(control(campo, 'Ana2').hasError('pattern')).toBe(true);
    },
  );

  it('rechaza más de 50 caracteres y acepta exactamente 50', () => {
    expect(control('primerNombre', 'a'.repeat(LONGITUD_MAXIMA_PARTE_NOMBRE + 1)).hasError('maxlength')).toBe(
      true,
    );
    expect(control('primerNombre', 'a'.repeat(LONGITUD_MAXIMA_PARTE_NOMBRE)).valid).toBe(true);
  });
});

describe('partesNombreParaPeticion', () => {
  it('omite el segundo nombre vacío', () => {
    const partes = partesNombreParaPeticion({
      primerNombre: 'Ana',
      segundoNombre: '',
      primerApellido: 'Gómez',
      segundoApellido: 'Ruiz',
    });
    expect(partes).toEqual({ primerNombre: 'Ana', primerApellido: 'Gómez', segundoApellido: 'Ruiz' });
    expect('segundoNombre' in partes).toBe(false);
  });

  it('incluye el segundo nombre cuando existe', () => {
    expect(
      partesNombreParaPeticion({
        primerNombre: 'Ana',
        segundoNombre: 'María',
        primerApellido: 'Gómez',
        segundoApellido: 'Ruiz',
      }).segundoNombre,
    ).toBe('María');
  });
});

// Mismo patrón que el backend (EstudianteRequestDTO): basta con un par de casos de humo aquí,
// la cobertura exhaustiva vive en los specs de los diálogos que los consumen.
describe('PATRON_NUMERO_DOCUMENTO y PATRON_CORREO_INSTITUCIONAL', () => {
  it('siguen vigentes y exportados para los formularios', () => {
    expect(PATRON_NUMERO_DOCUMENTO.test('1234567890')).toBe(true);
    expect(PATRON_CORREO_INSTITUCIONAL.test('ana@uco.net.co')).toBe(true);
  });
});
