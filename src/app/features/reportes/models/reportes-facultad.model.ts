/**
 * «Reportes por facultad»: tablero comparativo que agrupa el rendimiento por facultad, programa y
 * materia. No hay endpoint propio: se arma en el frontend con datos que ya calcula el backend
 * (R1, R6, acciones de mejora, asignaturas y, para el estudiante, su progreso). Aquí solo se
 * agrupa y se resume; el nivel de cada RA es siempre el que calculó el backend.
 */
import { RangoNivelLogro } from '../../estadisticas/models/nivel-logro.model';

export type NivelLogro = 'BAJO' | 'MEDIO' | 'ALTO' | 'SOBRESALIENTE';
export const NIVELES: readonly NivelLogro[] = ['BAJO', 'MEDIO', 'ALTO', 'SOBRESALIENTE'];

/** Qué ve cada rol: el administrador, todo; el profesor, sus materias; el estudiante, lo suyo. */
export type VistaReporteFacultad = 'ADMINISTRADOR' | 'PROFESOR' | 'ESTUDIANTE';

export type NivelAgrupacion = 'FACULTAD' | 'PROGRAMA' | 'ASIGNATURA';

export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'gris';

/** Un RA de una materia, con la facultad y el programa a los que pertenece. */
export interface RaPlano {
  facultadId: string;
  facultadNombre: string;
  programaId: string;
  programaNombre: string;
  asignaturaId: string;
  asignaturaCodigo: string;
  asignaturaNombre: string;
  /** null = sin evaluar o sin datos suficientes. */
  nivel: NivelLogro | null;
  promedio: number | null;
}

/** Una materia del alcance, aunque todavía no tenga RA evaluados. */
export interface MateriaPlana {
  facultadId: string;
  facultadNombre: string;
  programaId: string;
  programaNombre: string;
  asignaturaId: string;
  asignaturaCodigo: string;
  asignaturaNombre: string;
  /** RA activos de la materia; null si no se conoce (vista del estudiante). */
  cantidadRa: number | null;
}

/** Datos ya unidos y listos para agrupar, en el alcance del rol. */
export interface DatosReporteFacultad {
  semestreId: string | null;
  semestreCodigo: string | null;
  materias: MateriaPlana[];
  ras: RaPlano[];
  /** Pares estudiante–materia en riesgo (R6). Vacío en la vista del estudiante. */
  riesgo: { estudianteId: string; asignaturaId: string }[];
  /** Acciones de mejora del semestre. Vacío en la vista del estudiante. */
  acciones: { asignaturaId: string; convertida: boolean }[];
}

export type Distribucion = Record<NivelLogro | 'SIN_NIVEL', number>;

/** Una fila del tablero: una facultad, un programa o una materia con sus indicadores. */
export interface FilaReporteFacultad {
  id: string;
  nombre: string;
  /** Código de la materia en el nivel ASIGNATURA. */
  codigo: string | null;
  cantidadMaterias: number;
  totalRa: number;
  distribucion: Distribucion;
  /** Promedio de las notas de los RA con promedio; null si ninguno lo tiene. */
  promedio: number | null;
  nivel: NivelLogro | null;
  semaforo: Semaforo;
  /** % de RA en nivel Bajo sobre los RA con nivel; null si no hay RA con nivel. */
  porcentajeBajo: number | null;
  raSinNivel: number;
  estudiantesEnRiesgo: number;
  accionesPropuestas: number;
  accionesConvertidas: number;
  materiasRaInsuficientes: number;
}

/** Mínimo de RA activos para activar una materia (RF-03). */
export const MIN_RA = 5;

const SEMAFORO_POR_NIVEL: Readonly<Record<NivelLogro, Semaforo>> = {
  BAJO: 'rojo',
  MEDIO: 'amarillo',
  ALTO: 'verde',
  SOBRESALIENTE: 'verde',
};

export const ETIQUETA_NIVEL: Readonly<Record<NivelLogro | 'SIN_NIVEL', string>> = {
  BAJO: 'Bajo',
  MEDIO: 'Medio',
  ALTO: 'Alto',
  SOBRESALIENTE: 'Sobresaliente',
  SIN_NIVEL: 'Sin nivel',
};

export const ETIQUETA_SEMAFORO: Readonly<Record<Semaforo, string>> = {
  verde: 'Logro alto',
  amarillo: 'Logro medio',
  rojo: 'Logro bajo',
  gris: 'Sin datos',
};

/** Clasifica un promedio con el catálogo de niveles del backend (mismos rangos que las estadísticas). */
export function nivelDePromedio(
  promedio: number | null,
  rangos: readonly RangoNivelLogro[],
): NivelLogro | null {
  if (promedio === null) {
    return null;
  }
  const rango = rangos.find(
    (r) =>
      promedio >= r.notaMinima &&
      (r.limiteIncluido ? promedio <= r.notaLimite : promedio < r.notaLimite),
  );
  return rango ? rango.nivel : null;
}

export function semaforoDe(nivel: NivelLogro | null): Semaforo {
  return nivel ? SEMAFORO_POR_NIVEL[nivel] : 'gris';
}

interface Clave {
  id: string;
  nombre: string;
  codigo: string | null;
}

function claveDe(
  e: Pick<
    MateriaPlana,
    | 'facultadId'
    | 'facultadNombre'
    | 'programaId'
    | 'programaNombre'
    | 'asignaturaId'
    | 'asignaturaCodigo'
    | 'asignaturaNombre'
  >,
  nivel: NivelAgrupacion,
): Clave {
  switch (nivel) {
    case 'FACULTAD':
      return { id: e.facultadId, nombre: e.facultadNombre, codigo: null };
    case 'PROGRAMA':
      return { id: e.programaId, nombre: e.programaNombre, codigo: null };
    case 'ASIGNATURA':
      return { id: e.asignaturaId, nombre: e.asignaturaNombre, codigo: e.asignaturaCodigo };
  }
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Agrupa los datos en el nivel pedido, dentro de la facultad o el programa elegidos, y calcula los
 * indicadores de cada grupo. Las filas salen ordenadas por promedio (mejor primero); las que no
 * tienen promedio van al final, por nombre.
 */
export function agrupar(
  datos: DatosReporteFacultad,
  nivel: NivelAgrupacion,
  alcance: { facultadId?: string; programaId?: string },
  rangos: readonly RangoNivelLogro[],
): FilaReporteFacultad[] {
  const enAlcance = (e: { facultadId: string; programaId: string }) =>
    (!alcance.facultadId || e.facultadId === alcance.facultadId) &&
    (!alcance.programaId || e.programaId === alcance.programaId);

  const materias = datos.materias.filter(enAlcance);
  const ras = datos.ras.filter(enAlcance);
  const materiaPorId = new Map(datos.materias.map((m) => [m.asignaturaId, m]));

  const grupos = new Map<
    string,
    { clave: Clave; materias: Set<string>; ras: RaPlano[]; insuficientes: number }
  >();
  const grupo = (clave: Clave) => {
    let g = grupos.get(clave.id);
    if (!g) {
      g = { clave, materias: new Set(), ras: [], insuficientes: 0 };
      grupos.set(clave.id, g);
    }
    return g;
  };

  for (const m of materias) {
    const g = grupo(claveDe(m, nivel));
    g.materias.add(m.asignaturaId);
    if (m.cantidadRa !== null && m.cantidadRa < MIN_RA) {
      g.insuficientes += 1;
    }
  }
  for (const ra of ras) {
    const g = grupo(claveDe(ra, nivel));
    g.materias.add(ra.asignaturaId);
    g.ras.push(ra);
  }

  /** Grupo al que pertenece una materia del alcance, o null si está fuera. */
  const grupoDeMateria = (asignaturaId: string): string | null => {
    const m = materiaPorId.get(asignaturaId) ?? ras.find((r) => r.asignaturaId === asignaturaId);
    return m && enAlcance(m) ? claveDe(m, nivel).id : null;
  };

  const riesgoPorGrupo = new Map<string, Set<string>>();
  for (const r of datos.riesgo) {
    const id = grupoDeMateria(r.asignaturaId);
    if (id) {
      const set = riesgoPorGrupo.get(id) ?? new Set<string>();
      set.add(r.estudianteId);
      riesgoPorGrupo.set(id, set);
    }
  }

  const accionesPorGrupo = new Map<string, { propuestas: number; convertidas: number }>();
  for (const a of datos.acciones) {
    const id = grupoDeMateria(a.asignaturaId);
    if (id) {
      const c = accionesPorGrupo.get(id) ?? { propuestas: 0, convertidas: 0 };
      c.propuestas += 1;
      if (a.convertida) {
        c.convertidas += 1;
      }
      accionesPorGrupo.set(id, c);
    }
  }

  const filas = [...grupos.values()].map(({ clave, materias: ids, ras: rasGrupo, insuficientes }) => {
    const distribucion: Distribucion = { BAJO: 0, MEDIO: 0, ALTO: 0, SOBRESALIENTE: 0, SIN_NIVEL: 0 };
    for (const ra of rasGrupo) {
      distribucion[ra.nivel ?? 'SIN_NIVEL'] += 1;
    }
    const conPromedio = rasGrupo.filter((ra) => ra.promedio !== null);
    const promedio = conPromedio.length
      ? redondear(conPromedio.reduce((suma, ra) => suma + (ra.promedio as number), 0) / conPromedio.length)
      : null;
    const conNivel = rasGrupo.length - distribucion.SIN_NIVEL;
    const nivelGrupo = nivelDePromedio(promedio, rangos);
    const acciones = accionesPorGrupo.get(clave.id);
    return {
      id: clave.id,
      nombre: clave.nombre,
      codigo: clave.codigo,
      cantidadMaterias: ids.size,
      totalRa: rasGrupo.length,
      distribucion,
      promedio,
      nivel: nivelGrupo,
      semaforo: semaforoDe(nivelGrupo),
      porcentajeBajo: conNivel ? redondear((distribucion.BAJO / conNivel) * 100) : null,
      raSinNivel: distribucion.SIN_NIVEL,
      estudiantesEnRiesgo: riesgoPorGrupo.get(clave.id)?.size ?? 0,
      accionesPropuestas: acciones?.propuestas ?? 0,
      accionesConvertidas: acciones?.convertidas ?? 0,
      materiasRaInsuficientes: insuficientes,
    } satisfies FilaReporteFacultad;
  });

  return filas.sort((a, b) => {
    if (a.promedio !== null && b.promedio !== null && a.promedio !== b.promedio) {
      return b.promedio - a.promedio;
    }
    if ((a.promedio === null) !== (b.promedio === null)) {
      return a.promedio === null ? 1 : -1;
    }
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

/** Resumen de todo el alcance, para la cabecera del tablero. */
export function resumenGeneral(
  datos: DatosReporteFacultad,
  rangos: readonly RangoNivelLogro[],
): FilaReporteFacultad | null {
  if (datos.materias.length === 0 && datos.ras.length === 0) {
    return null;
  }
  const todo: DatosReporteFacultad = {
    ...datos,
    materias: datos.materias.map((m) => ({ ...m, facultadId: '*', facultadNombre: 'Total' })),
    ras: datos.ras.map((r) => ({ ...r, facultadId: '*', facultadNombre: 'Total' })),
  };
  return agrupar(todo, 'FACULTAD', {}, rangos)[0] ?? null;
}
