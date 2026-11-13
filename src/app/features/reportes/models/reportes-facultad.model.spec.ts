import { RangoNivelLogro } from '../../estadisticas/models/nivel-logro.model';
import {
  DatosReporteFacultad,
  MateriaPlana,
  RaPlano,
  agrupar,
  nivelDePromedio,
  resumenGeneral,
  semaforoDe,
} from './reportes-facultad.model';

const RANGOS: RangoNivelLogro[] = [
  { nivel: 'BAJO', notaMinima: 0, notaLimite: 3, limiteIncluido: false },
  { nivel: 'MEDIO', notaMinima: 3, notaLimite: 4, limiteIncluido: false },
  { nivel: 'ALTO', notaMinima: 4, notaLimite: 4.5, limiteIncluido: false },
  { nivel: 'SOBRESALIENTE', notaMinima: 4.5, notaLimite: 5, limiteIncluido: true },
];

const ING = { facultadId: 'f-ing', facultadNombre: 'Facultad de Ingeniería' };
const DER = { facultadId: 'f-der', facultadNombre: 'Facultad de Derecho' };

function materia(
  facultad: typeof ING,
  programaId: string,
  asignaturaId: string,
  cantidadRa: number | null = 5,
): MateriaPlana {
  return {
    ...facultad,
    programaId,
    programaNombre: `Programa ${programaId}`,
    asignaturaId,
    asignaturaCodigo: asignaturaId.toUpperCase(),
    asignaturaNombre: `Materia ${asignaturaId}`,
    cantidadRa,
  };
}

function ra(m: MateriaPlana, nivel: RaPlano['nivel'], promedio: number | null): RaPlano {
  const { cantidadRa: _omitida, ...base } = m;
  return { ...base, nivel, promedio };
}

const SISTEMAS = materia(ING, 'p-sis', 'sis1');
const CIVIL = materia(ING, 'p-civ', 'civ1', 3);
const PENAL = materia(DER, 'p-der', 'der1');

const DATOS: DatosReporteFacultad = {
  semestreId: 's1',
  semestreCodigo: '2026-2',
  materias: [SISTEMAS, CIVIL, PENAL],
  ras: [
    ra(SISTEMAS, 'ALTO', 4.2),
    ra(SISTEMAS, 'SOBRESALIENTE', 4.8),
    ra(CIVIL, 'BAJO', 2.5),
    ra(CIVIL, null, null),
    ra(PENAL, 'MEDIO', 3.4),
  ],
  riesgo: [
    { estudianteId: 'e1', asignaturaId: 'civ1' },
    { estudianteId: 'e1', asignaturaId: 'sis1' },
    { estudianteId: 'e2', asignaturaId: 'der1' },
  ],
  acciones: [
    { asignaturaId: 'civ1', convertida: true },
    { asignaturaId: 'civ1', convertida: false },
    { asignaturaId: 'der1', convertida: false },
  ],
};

describe('nivelDePromedio y semaforoDe', () => {
  it.each([
    [2.99, 'BAJO'],
    [3, 'MEDIO'],
    [4.49, 'ALTO'],
    [5, 'SOBRESALIENTE'],
  ] as const)('clasifica %s como %s con el catálogo del backend', (promedio, nivel) => {
    expect(nivelDePromedio(promedio, RANGOS)).toBe(nivel);
  });

  it('sin promedio o sin catálogo no hay nivel', () => {
    expect(nivelDePromedio(null, RANGOS)).toBeNull();
    expect(nivelDePromedio(4, [])).toBeNull();
  });

  it('Bajo es rojo, Medio amarillo, Alto y Sobresaliente verde, sin nivel gris', () => {
    expect(semaforoDe('BAJO')).toBe('rojo');
    expect(semaforoDe('MEDIO')).toBe('amarillo');
    expect(semaforoDe('ALTO')).toBe('verde');
    expect(semaforoDe('SOBRESALIENTE')).toBe('verde');
    expect(semaforoDe(null)).toBe('gris');
  });
});

describe('agrupar', () => {
  it('por facultad calcula promedio, distribución, % en Bajo y el semáforo', () => {
    const [primera, segunda] = agrupar(DATOS, 'FACULTAD', {}, RANGOS);

    // Ingeniería: (4,2 + 4,8 + 2,5) / 3 = 3,83 → Medio; Derecho: 3,4 → Medio. Gana Ingeniería.
    expect(primera.id).toBe('f-ing');
    expect(primera.promedio).toBe(3.83);
    expect(primera.nivel).toBe('MEDIO');
    expect(primera.semaforo).toBe('amarillo');
    expect(primera.distribucion).toEqual({ BAJO: 1, MEDIO: 0, ALTO: 1, SOBRESALIENTE: 1, SIN_NIVEL: 1 });
    expect(primera.totalRa).toBe(4);
    // 1 RA en Bajo de 3 con nivel (el sin nivel no cuenta).
    expect(primera.porcentajeBajo).toBe(33.33);
    expect(primera.cantidadMaterias).toBe(2);

    expect(segunda.id).toBe('f-der');
    expect(segunda.promedio).toBe(3.4);
  });

  it('cuenta estudiantes en riesgo sin repetirlos, acciones y materias con pocos RA', () => {
    const [ing, der] = agrupar(DATOS, 'FACULTAD', {}, RANGOS);

    expect(ing.estudiantesEnRiesgo).toBe(1); // e1 aparece en dos materias de Ingeniería
    expect(ing.accionesPropuestas).toBe(2);
    expect(ing.accionesConvertidas).toBe(1);
    expect(ing.materiasRaInsuficientes).toBe(1); // Civil tiene 3 RA
    expect(der.estudiantesEnRiesgo).toBe(1);
    expect(der.accionesPropuestas).toBe(1);
    expect(der.materiasRaInsuficientes).toBe(0);
  });

  it('dentro de una facultad agrupa por programa, ordenado de mejor a peor promedio', () => {
    const filas = agrupar(DATOS, 'PROGRAMA', { facultadId: 'f-ing' }, RANGOS);

    expect(filas.map((f) => f.id)).toEqual(['p-sis', 'p-civ']);
    expect(filas[0].promedio).toBe(4.5);
    expect(filas[0].semaforo).toBe('verde');
    expect(filas[1].semaforo).toBe('rojo');
  });

  it('dentro de un programa agrupa por materia con su código', () => {
    const filas = agrupar(DATOS, 'ASIGNATURA', { facultadId: 'f-ing', programaId: 'p-civ' }, RANGOS);

    expect(filas).toHaveLength(1);
    expect(filas[0].codigo).toBe('CIV1');
    expect(filas[0].estudiantesEnRiesgo).toBe(1);
  });

  it('una materia sin RA aparece al final, con semáforo gris y sin porcentajes', () => {
    const nueva = materia(DER, 'p-der', 'der2', 0);
    const filas = agrupar(
      { ...DATOS, materias: [...DATOS.materias, nueva] },
      'ASIGNATURA',
      { facultadId: 'f-der' },
      RANGOS,
    );

    const ultima = filas[filas.length - 1];
    expect(ultima.id).toBe('der2');
    expect(ultima.promedio).toBeNull();
    expect(ultima.semaforo).toBe('gris');
    expect(ultima.porcentajeBajo).toBeNull();
    expect(ultima.materiasRaInsuficientes).toBe(1);
  });
});

describe('resumenGeneral', () => {
  it('resume todo el alcance en una sola fila', () => {
    const resumen = resumenGeneral(DATOS, RANGOS);

    expect(resumen?.totalRa).toBe(5);
    expect(resumen?.cantidadMaterias).toBe(3);
    expect(resumen?.estudiantesEnRiesgo).toBe(2);
    expect(resumen?.accionesPropuestas).toBe(3);
    expect(resumen?.materiasRaInsuficientes).toBe(1);
  });

  it('sin materias ni RA no hay resumen', () => {
    expect(resumenGeneral({ ...DATOS, materias: [], ras: [] }, RANGOS)).toBeNull();
  });
});
