import { MAX_RA, MIN_RA, puedeActivarse } from './asignatura.model';

describe('puedeActivarse', () => {
  it('el rango exigido es de 5 a 7 RA activos', () => {
    expect(MIN_RA).toBe(5);
    expect(MAX_RA).toBe(7);
  });

  it.each([
    [4, false],
    [5, true],
    [7, true],
    [8, false],
  ])('en BORRADOR con %i RA activos devuelve %s', (cantidadRa, esperado) => {
    expect(puedeActivarse({ estado: 'BORRADOR', cantidadRa })).toBe(esperado);
  });

  it('una asignatura ACTIVA o INACTIVA no se puede activar aunque tenga RA suficientes', () => {
    expect(puedeActivarse({ estado: 'ACTIVA', cantidadRa: 5 })).toBe(false);
    expect(puedeActivarse({ estado: 'INACTIVA', cantidadRa: 6 })).toBe(false);
  });
});
