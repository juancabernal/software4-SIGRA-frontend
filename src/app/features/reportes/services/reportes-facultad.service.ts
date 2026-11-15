import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { Asignatura } from '../../asignaturas/models/asignatura.model';
import { AsignaturaService } from '../../asignaturas/services/asignatura.service';
import { MiProcesoService } from '../../estudiante/services/mi-proceso.service';
import { AccionMejoraService } from '../../mejoras/services/accion-mejora.service';
import { DatosReporteFacultad, MateriaPlana, NivelLogro, RaPlano } from '../models/reportes-facultad.model';
import { ReporteService } from './reporte.service';

const SIN_FACULTAD = 'Sin facultad';
const SIN_PROGRAMA = 'Sin programa';

/**
 * Junta los datos de «Reportes por facultad» según el rol. El backend ya aplica el alcance:
 * el Administrador recibe todo y el Profesor solo sus asignaturas. El Estudiante no puede consultar
 * los reportes R1/R6: usa su propio progreso y la facultad de sus materias.
 */
@Injectable({ providedIn: 'root' })
export class ReportesFacultadService {
  private readonly reportes = inject(ReporteService);
  private readonly asignaturas = inject(AsignaturaService);
  private readonly acciones = inject(AccionMejoraService);
  private readonly miProceso = inject(MiProcesoService);

  /**
   * Administrador y Profesor: R1, R6 y las materias en paralelo; luego las acciones de mejora del
   * semestre que resolvió R1 (sin semestre se usa el activo).
   */
  cargarInstitucional(esProfesor: boolean, semestreId?: string): Observable<DatosReporteFacultad> {
    const materias$: Observable<Asignatura[]> = esProfesor
      ? this.asignaturas.misAsignaturas()
      : this.asignaturas.listar();
    return forkJoin({
      rendimiento: this.reportes.rendimientoRa({ semestreId }),
      riesgo: this.reportes.riesgoAcademico({ semestreId, minRaNoAlcanzados: 1 }),
      materias: materias$,
    }).pipe(
      switchMap(({ rendimiento, riesgo, materias }) =>
        (rendimiento.semestreId
          ? this.acciones.listar({ semestreId: rendimiento.semestreId })
          : of([])
        ).pipe(
          map((acciones): DatosReporteFacultad => ({
            semestreId: rendimiento.semestreId,
            semestreCodigo: rendimiento.semestreCodigo,
            materias: materias
              .filter((a) => a.estado !== 'INACTIVA')
              .map((a) => ({
                facultadId: a.facultadId,
                facultadNombre: a.facultadNombre,
                programaId: a.programaId,
                programaNombre: a.programaNombre,
                asignaturaId: a.id,
                asignaturaCodigo: a.codigo,
                asignaturaNombre: a.nombre,
                cantidadRa: a.cantidadRa,
              })),
            ras: rendimiento.asignaturas.flatMap((a) =>
              a.resultados.map(
                (ra): RaPlano => ({
                  facultadId: a.facultadId,
                  facultadNombre: a.facultadNombre,
                  programaId: a.programaId,
                  programaNombre: a.programaNombre,
                  asignaturaId: a.asignaturaId,
                  asignaturaCodigo: a.codigo,
                  asignaturaNombre: a.nombre,
                  nivel: ra.estado === 'CON_NIVEL' ? ra.nivelLogro : null,
                  promedio: ra.promedioNota,
                }),
              ),
            ),
            riesgo: riesgo.estudiantes.map((e) => ({
              estudianteId: e.estudianteId,
              asignaturaId: e.asignaturaId,
            })),
            acciones: acciones.map((a) => ({ asignaturaId: a.asignaturaId, convertida: a.convertida })),
          })),
        ),
      ),
    );
  }

  /**
   * Estudiante: su progreso (nivel de cada RA en sus materias en curso) unido por código con
   * GET /asignaturas/mias, que trae la facultad y el programa de cada materia.
   */
  cargarEstudiante(): Observable<DatosReporteFacultad> {
    return forkJoin({
      progreso: this.miProceso.obtenerProgreso(),
      mias: this.asignaturas.misAsignaturas(),
    }).pipe(
      map(({ progreso, mias }): DatosReporteFacultad => {
        const porCodigo = new Map(mias.map((a) => [a.codigo, a]));
        const materias: MateriaPlana[] = progreso.map((m) => {
          const asignatura = porCodigo.get(m.asignaturaCodigo);
          return {
            facultadId: asignatura?.facultadId ?? SIN_FACULTAD,
            facultadNombre: asignatura?.facultadNombre ?? SIN_FACULTAD,
            programaId: asignatura?.programaId ?? m.programaNombre ?? SIN_PROGRAMA,
            programaNombre: asignatura?.programaNombre ?? m.programaNombre ?? SIN_PROGRAMA,
            asignaturaId: asignatura?.id ?? m.matriculaId,
            asignaturaCodigo: m.asignaturaCodigo,
            asignaturaNombre: m.asignaturaNombre,
            cantidadRa: null,
          };
        });
        const ras: RaPlano[] = progreso.flatMap((m, i) => {
          const materia = materias[i];
          return m.resultadosAprendizaje.map((ra) => ({
            facultadId: materia.facultadId,
            facultadNombre: materia.facultadNombre,
            programaId: materia.programaId,
            programaNombre: materia.programaNombre,
            asignaturaId: materia.asignaturaId,
            asignaturaCodigo: materia.asignaturaCodigo,
            asignaturaNombre: materia.asignaturaNombre,
            nivel: ra.nivelLogro === 'SIN_EVALUAR' ? null : (ra.nivelLogro as NivelLogro),
            promedio: ra.promedio,
          }));
        });
        return {
          semestreId: null,
          semestreCodigo: progreso[0]?.semestreCodigo ?? null,
          materias,
          ras,
          riesgo: [],
          acciones: [],
        };
      }),
    );
  }
}
