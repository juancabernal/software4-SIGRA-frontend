import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { AsignaturaService } from '../../../asignaturas/services/asignatura.service';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { ResultadoAprendizajeService } from '../../../resultadosaprendizaje/services/resultado-aprendizaje.service';
import { Semestre } from '../../../semestres/models/semestre.model';
import { SemestreService } from '../../../semestres/services/semestre.service';
import {
  Calificacion,
  EvaluacionOpcion,
  FilaPlanilla,
  PlanillaCalificaciones,
} from '../../models/calificacion.model';
import { CalificacionService } from '../../services/calificacion.service';
import { EvaluacionOpcionesService } from '../../services/evaluacion-opciones.service';
import { CalificacionFormDialog } from '../calificacion-form-dialog/calificacion-form-dialog';

type Carga<T> =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; valor: T }
  | { estado: 'error'; error: MensajeError };

const DURACION_AVISO_MS = 6000;

/**
 * Vista del profesor (RF-12): planilla de notas por evaluación. Se elige materia → RA → semestre →
 * evaluación y se muestra un estudiante matriculado por fila con su nota. Cada nota registrada o
 * modificada después de la fecha tentativa lleva el ícono ⚠. Las matrículas desvinculadas que
 * conservan nota se muestran, pero no se editan; tampoco se editan las de una evaluación inactiva.
 */
@Component({
  selector: 'app-planilla-notas-page',
  imports: [CalificacionFormDialog, ChipEstado, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planilla-notas-page.html',
  styleUrl: './planilla-notas-page.scss',
})
export class PlanillaNotasPage {
  private readonly asignaturaService = inject(AsignaturaService);
  private readonly resultadosService = inject(ResultadoAprendizajeService);
  private readonly semestreService = inject(SemestreService);
  private readonly evaluacionesService = inject(EvaluacionOpcionesService);
  private readonly calificacionService = inject(CalificacionService);

  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;
  protected readonly aviso = signal<string | null>(null);

  // ── Selectores ───────────────────────────────────────────────────────
  protected readonly asignaturas = signal<Carga<Asignatura[]>>({ estado: 'cargando' });
  protected readonly semestres = signal<Carga<Semestre[]>>({ estado: 'cargando' });
  protected readonly asignaturaId = signal('');
  protected readonly resultadoAprendizajeId = signal('');
  protected readonly semestreId = signal('');
  protected readonly evaluacionId = signal('');

  private readonly cargaRa = toSignal(
    toObservable(this.asignaturaId).pipe(
      switchMap((id) =>
        id ? this.cargar(this.resultadosService.listarPorAsignatura(id)) : of<Carga<ResultadoAprendizaje[]>>({ estado: 'inactivo' }),
      ),
    ),
    { initialValue: { estado: 'inactivo' } as Carga<ResultadoAprendizaje[]> },
  );

  protected readonly estadoRa = computed(() => this.cargaRa().estado);
  protected readonly errorRa = computed(() => errorDe(this.cargaRa()));
  protected readonly resultadosActivos = computed(() =>
    valorDe(this.cargaRa(), []).filter((ra) => ra.estado === 'ACTIVO'),
  );

  private readonly cargaEvaluaciones = toSignal(
    combineLatest([toObservable(this.resultadoAprendizajeId), toObservable(this.semestreId)]).pipe(
      switchMap(([raId, semestreId]) =>
        raId && semestreId
          ? this.cargar(
              this.evaluacionesService.listar(raId, semestreId)
            )
          : of<Carga<EvaluacionOpcion[]>>({ estado: 'inactivo' }),
      ),
    ),
    { initialValue: { estado: 'inactivo' } as Carga<EvaluacionOpcion[]> },
  );

  protected readonly estadoEvaluaciones = computed(() => this.cargaEvaluaciones().estado);
  protected readonly errorEvaluaciones = computed(() => errorDe(this.cargaEvaluaciones()));
  protected readonly evaluaciones = computed(() => valorDe(this.cargaEvaluaciones(), []));

  // ── Planilla ─────────────────────────────────────────────────────────
  private readonly recarga = signal(0);
  private readonly cargaPlanilla = toSignal(
    combineLatest([toObservable(this.evaluacionId), toObservable(this.recarga)]).pipe(
      switchMap(([id]) =>
        id ? this.cargar(this.calificacionService.planilla(id)) : of<Carga<PlanillaCalificaciones>>({ estado: 'inactivo' }),
      ),
    ),
    { initialValue: { estado: 'inactivo' } as Carga<PlanillaCalificaciones> },
  );

  protected readonly estadoPlanilla = computed(() => this.cargaPlanilla().estado);
  protected readonly errorPlanilla = computed(() => errorDe(this.cargaPlanilla()));
  protected readonly planilla = computed(() => valorDe<PlanillaCalificaciones | null>(this.cargaPlanilla(), null));
  protected readonly evaluacionActiva = computed(() => this.planilla()?.estadoEvaluacion === 'ACTIVA');

  // ── Diálogo ──────────────────────────────────────────────────────────
  protected readonly dialogoAbierto = signal(false);
  protected readonly filaEnEdicion = signal<FilaPlanilla | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizadorAviso));
    this.cargarAsignaturas();
    this.cargarSemestres();
  }

  protected cargarAsignaturas(): void {
    this.asignaturas.set({ estado: 'cargando' });
    this.asignaturaService.listar().subscribe({
      next: (lista) => this.asignaturas.set({ estado: 'listo', valor: lista }),
      error: (error: unknown) => this.asignaturas.set({ estado: 'error', error: mensajeDeError(error) }),
    });
  }

  protected cargarSemestres(): void {
    this.semestres.set({ estado: 'cargando' });
    this.semestreService.listar().subscribe({
      next: (lista) => {
        this.semestres.set({ estado: 'listo', valor: lista });
        const activo = lista.find((s) => s.estado === 'ACTIVO');
        if (activo) {
          this.semestreId.set(activo.id);
        }
      },
      error: (error: unknown) => this.semestres.set({ estado: 'error', error: mensajeDeError(error) }),
    });
  }

  protected listaAsignaturas(): Asignatura[] {
    return valorDe(this.asignaturas(), []);
  }

  protected listaSemestres(): Semestre[] {
    return valorDe(this.semestres(), []);
  }

  protected errorCarga(carga: Carga<unknown>): MensajeError | null {
    return errorDe(carga);
  }

  protected alCambiarAsignatura(evento: Event): void {
    this.asignaturaId.set(valorDeSelector(evento));
    this.resultadoAprendizajeId.set('');
    this.evaluacionId.set('');
  }

  protected alCambiarRa(evento: Event): void {
    this.resultadoAprendizajeId.set(valorDeSelector(evento));
    this.evaluacionId.set('');
  }

  protected alCambiarSemestre(evento: Event): void {
    this.semestreId.set(valorDeSelector(evento));
    this.evaluacionId.set('');
  }

  protected alCambiarEvaluacion(evento: Event): void {
    this.evaluacionId.set(valorDeSelector(evento));
  }

  protected recargarPlanilla(): void {
    this.recarga.update((n) => n + 1);
  }

  protected puedeEditar(fila: FilaPlanilla): boolean {
    return this.evaluacionActiva() && fila.matriculaActiva;
  }

  protected abrirDialogo(fila: FilaPlanilla): void {
    if (!this.puedeEditar(fila)) {
      return;
    }
    this.filaEnEdicion.set(fila);
    this.dialogoAbierto.set(true);
  }

  protected cerrarDialogo(): void {
    this.dialogoAbierto.set(false);
    this.filaEnEdicion.set(null);
  }

  protected alGuardar(calificacion: Calificacion): void {
    const eraModificacion = !!this.filaEnEdicion()?.calificacionId;
    this.cerrarDialogo();
    this.recargarPlanilla();
    const base = eraModificacion ? 'Nota modificada' : 'Nota registrada';
    this.mostrarAviso(
      calificacion.fueraDeFecha
        ? `${base}. Quedó marcada como fuera de la fecha tentativa.`
        : `${base} para ${calificacion.estudianteNombre}.`,
    );
  }

  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  protected formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return '';
    }
    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }

  private mostrarAviso(texto: string): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(texto);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }

  private cargar<T>(fuente: Observable<T>): Observable<Carga<T>> {
    return fuente.pipe(
      map((valor): Carga<T> => ({ estado: 'listo', valor })),
      catchError((error: unknown) => of<Carga<T>>({ estado: 'error', error: mensajeDeError(error) })),
      startWith<Carga<T>>({ estado: 'cargando' }),
    );
  }
}

function valorDe<T>(carga: Carga<T>, porDefecto: T): T {
  return carga.estado === 'listo' ? carga.valor : porDefecto;
}

function errorDe(carga: Carga<unknown>): MensajeError | null {
  return carga.estado === 'error' ? carga.error : null;
}

function valorDeSelector(evento: Event): string {
  return (evento.target as HTMLSelectElement).value;
}