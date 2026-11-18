/**
 * Datos y direcciones comunes de las pruebas de las páginas de estadísticas. No usa la API de
 * pruebas (`vi`, `expect`) para poder quedar fuera de los specs sin entrar al build.
 */
import { environment } from '../../../../environments/environment';
import { Asignatura } from '../../asignaturas/models/asignatura.model';
import { AccionMejora } from '../../mejoras/models/accion-mejora.model';
import {
  RendimientoAsignatura,
  ResultadoAprendizaje,
} from '../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { Semestre } from '../../semestres/models/semestre.model';
import { Conclusion, ConclusionEstado } from '../models/conclusion.model';
import { EstadisticasResultadoAprendizaje, RangoNivelLogro } from '../models/nivel-logro.model';

export const API = `${environment.apiUrl}/v1`;
export const URL_ASIGNATURAS = `${API}/asignaturas`;
export const URL_SEMESTRES = `${API}/semestres`;
export const URL_ACCIONES_MEJORA = `${API}/acciones-mejora`;
export const URL_CATALOGO_NIVELES = `${API}/niveles-logro`;
export const urlRa = (asignaturaId: string) =>
  `${API}/asignaturas/${asignaturaId}/resultados-aprendizaje`;
export const urlEstadoConclusion = (raId: string, semestreId: string) =>
  `${API}/resultados-aprendizaje/${raId}/semestres/${semestreId}/conclusiones/estado`;
export const urlEstadisticas = (raId: string, semestreId: string) =>
  `${API}/resultados-aprendizaje/${raId}/semestres/${semestreId}/estadisticas`;

export const RENDIMIENTO_VACIO: RendimientoAsignatura = {
  asignaturaId: 'asig-1',
  semestreId: null,
  semestreCodigo: null,
  resultados: [],
};

export const MATERIA: Asignatura = {
  id: 'a1',
  codigo: 'MAT1',
  nombre: 'Matemáticas I',
  programaId: 'p1',
  programaNombre: 'Ingeniería de Sistemas',
  facultadId: 'f1',
  facultadNombre: 'Facultad de Ingeniería',
  estado: 'ACTIVA',
  cantidadRa: 5,
};

export const SEMESTRE_ACTIVO: Semestre = {
  id: 's-activo',
  codigo: '2026-1',
  fechaInicio: '2026-01-15',
  fechaFin: '2026-06-15',
  estado: 'ACTIVO',
};

export const SEMESTRE_INACTIVO: Semestre = {
  id: 's-inactivo',
  codigo: '2025-2',
  fechaInicio: '2025-07-15',
  fechaFin: '2025-12-15',
  estado: 'INACTIVO',
};

export function ra(n: number, estado: ResultadoAprendizaje['estado'] = 'ACTIVO'): ResultadoAprendizaje {
  return {
    id: `ra-${n}`,
    asignaturaId: MATERIA.id,
    codigo: `RA${n}`,
    descripcion: `Descripción ${n}`,
    estado,
  };
}

export const CONCLUSION: Conclusion = {
  id: 'c1',
  resultadoAprendizajeId: 'ra-1',
  resultadoAprendizajeCodigo: 'RA1',
  asignaturaId: MATERIA.id,
  semestreId: SEMESTRE_ACTIVO.id,
  semestreCodigo: SEMESTRE_ACTIVO.codigo,
  mensaje: 'Más del 40% de los estudiantes no alcanzó el RA.',
  tieneDatosSuficientes: true,
  fechaGeneracion: '2026-06-01',
  porcentajeInsuficiente: 45,
  estado: 'VIGENTE',
};

export const CATALOGO_NIVELES: RangoNivelLogro[] = [
  { nivel: 'BAJO', notaMinima: 0, notaLimite: 3, limiteIncluido: false },
  { nivel: 'MEDIO', notaMinima: 3, notaLimite: 4, limiteIncluido: false },
  { nivel: 'ALTO', notaMinima: 4, notaLimite: 4.5, limiteIncluido: false },
  { nivel: 'SOBRESALIENTE', notaMinima: 4.5, notaLimite: 5, limiteIncluido: true },
];

export const ESTADISTICAS: EstadisticasResultadoAprendizaje = {
  resultadoAprendizajeId: 'ra-1',
  codigoResultadoAprendizaje: 'RA1',
  asignaturaId: MATERIA.id,
  semestreId: SEMESTRE_ACTIVO.id,
  codigoSemestre: SEMESTRE_ACTIVO.codigo,
  totalEstudiantes: 20,
  evaluados: 20,
  sinDatosSuficientes: 0,
  sinEvaluar: 0,
  promedioNota: 3.25,
  promedioPorcentaje: 65,
  distribucion: [
    { nivel: 'BAJO', cantidad: 7, porcentaje: 35 },
    { nivel: 'MEDIO', cantidad: 5, porcentaje: 25 },
    { nivel: 'ALTO', cantidad: 6, porcentaje: 30 },
    { nivel: 'SOBRESALIENTE', cantidad: 2, porcentaje: 10 },
  ],
  fechaCalculo: '2026-10-17T10:05:00',
};

export const RESULTADO_VIGENTE: ConclusionEstado = {
  estado: 'VIGENTE',
  conclusion: CONCLUSION,
  totalEvaluados: null,
  porcentajeInsuficiente: null,
};

export const RESULTADO_ATENDIDA: ConclusionEstado = {
  estado: 'ATENDIDA',
  conclusion: null,
  totalEvaluados: 20,
  porcentajeInsuficiente: 45,
};

export const RESULTADO_SATISFACTORIO: ConclusionEstado = {
  estado: 'SATISFACTORIO',
  conclusion: null,
  totalEvaluados: 20,
  porcentajeInsuficiente: 10,
};

export const RESULTADO_SIN_DATOS: ConclusionEstado = {
  estado: 'SIN_DATOS_SUFICIENTES',
  conclusion: null,
  totalEvaluados: 2,
  porcentajeInsuficiente: null,
};

export const NO_CONVERTIDA: AccionMejora = {
  id: 'am1',
  nombre: 'Taller de refuerzo',
  descripcion: 'Taller para reforzar integrales',
  fechaPropuesta: '2026-06-01',
  resultadoAprendizajeId: 'ra-1',
  resultadoAprendizajeCodigo: 'RA1',
  asignaturaId: MATERIA.id,
  semestreId: SEMESTRE_ACTIVO.id,
  semestreCodigo: SEMESTRE_ACTIVO.codigo,
  conclusionOrigenId: 'c1',
  evaluacionGeneradaId: null,
  convertida: false,
};

export const CONVERTIDA: AccionMejora = {
  ...NO_CONVERTIDA,
  id: 'am2',
  nombre: 'Guía de ejercicios adicionales',
  convertida: true,
  evaluacionGeneradaId: 'ev1',
};

export const boton = (raiz: ParentNode, texto: string) =>
  Array.from(raiz.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === texto,
  ) as HTMLButtonElement;
