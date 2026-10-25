import { formatearFechaHora } from './formato-fecha';

describe('formatearFechaHora', () => {
  it('formatea una fecha válida en español de Colombia', () => {
    expect(formatearFechaHora('2026-10-25T01:27:00.123456')).toBe(
      '25 de octubre de 2026, 1:27 a. m.',
    );
  });

  it('devuelve cadena vacía si el valor es nulo, indefinido o inválido', () => {
    expect(formatearFechaHora(null)).toBe('');
    expect(formatearFechaHora(undefined)).toBe('');
    expect(formatearFechaHora('no-es-una-fecha')).toBe('');
  });
});
