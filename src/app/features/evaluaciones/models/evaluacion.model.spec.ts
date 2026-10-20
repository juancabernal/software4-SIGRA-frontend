import {
  SemestreOpcion,
  enCentesimas,
  esSemestreEnCurso,
  formatearPorcentaje,
  normalizarTexto,
  semestrePorDefecto,
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

  describe('semestrePorDefecto', () => {
    const s = (codigo: string, fechaInicio: string, fechaFin: string): SemestreOpcion => ({
      id: codigo,
      codigo,
      fechaInicio,
      fechaFin,
    });
    const LISTA = [
      s('2091-1', '2091-01-20', '2091-06-10'),
      s('2026-2', '2026-07-20', '2026-12-10'),
      s('2026-1', '2026-01-20', '2026-06-10'),
    ];

    it('elige el semestre en curso aunque haya semestres futuros', () => {
      expect(semestrePorDefecto(LISTA, '2026-10-20')?.codigo).toBe('2026-2');
    });

    it('entre dos semestres elige el último que ya empezó, no uno futuro', () => {
      expect(semestrePorDefecto(LISTA, '2026-06-30')?.codigo).toBe('2026-1');
    });

    it('si ninguno ha empezado, elige el próximo', () => {
      expect(semestrePorDefecto(LISTA, '2025-01-01')?.codigo).toBe('2026-1');
    });

    it('sin semestres no elige ninguno', () => {
      expect(semestrePorDefecto([], '2026-10-20')).toBeNull();
    });
  });
});
