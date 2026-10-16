import {
  SemestreOpcion,
  enCentesimas,
  esSemestreEnCurso,
  formatearPorcentaje,
  normalizarTexto,
  tieneMaximoDosDecimales,
} from './evaluacion.model';

const SEMESTRE: SemestreOpcion = {
  id: 's1',
  codigo: '2026-2',
  fechaInicio: '2026-07-20',
  fechaFin: '2026-12-10',
};

describe('modelo de evaluaciones', () => {
  it('normaliza el texto igual que el backend', () => {
    expect(normalizarTexto('  Parcial \n\t  1  ')).toBe('Parcial 1');
  });

  it('acepta máximo dos decimales y compara en centésimas', () => {
    expect(tieneMaximoDosDecimales(25.5)).toBe(true);
    expect(tieneMaximoDosDecimales(33.33)).toBe(true);
    expect(tieneMaximoDosDecimales(33.333)).toBe(false);
    expect(enCentesimas(0.1 + 0.2)).toBe(30);
  });

  it('el semestre en curso es el que contiene la fecha de hoy, extremos incluidos', () => {
    expect(esSemestreEnCurso(SEMESTRE, '2026-07-20')).toBe(true);
    expect(esSemestreEnCurso(SEMESTRE, '2026-12-10')).toBe(true);
    expect(esSemestreEnCurso(SEMESTRE, '2026-12-11')).toBe(false);
  });

  it('formatea el porcentaje con coma decimal', () => {
    expect(formatearPorcentaje(25.5).replace(/\s/g, ' ')).toBe('25,5 %');
    expect(formatearPorcentaje(100).replace(/\s/g, ' ')).toBe('100 %');
  });
});
