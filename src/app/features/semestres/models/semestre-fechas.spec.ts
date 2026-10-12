import { duracionEnDias, formatearFecha, sumarDias } from './semestre-fechas';

describe('semestre-fechas', () => {
  it('formatea la fecha como «25 ene 2027» sin desfase de zona horaria', () => {
    expect(formatearFecha('2027-01-25')).toBe('25 ene 2027');
    expect(formatearFecha('2026-12-31')).toBe('31 dic 2026');
  });

  it('cuenta la duración incluyendo el día de inicio y el de fin', () => {
    expect(duracionEnDias('2090-01-20', '2090-01-20')).toBe(1);
    expect(duracionEnDias('2090-01-20', '2090-06-10')).toBe(142);
  });

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2090-06-10', 1)).toBe('2090-06-11');
    expect(sumarDias('2090-12-31', 1)).toBe('2091-01-01');
  });
});
