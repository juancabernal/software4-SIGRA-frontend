import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Subscription, catchError, map, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { SesionService } from '../../../../core/services/sesion';
import { facultadesDe } from '../../../../shared/filtros/filtro-por-facultad';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { AsignaturaService } from '../../../asignaturas/services/asignatura.service';
import {
  EstadoResultadoAprendizaje,
  ResultadoAprendizaje,
} from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { ResultadoAprendizajeService } from '../../../resultadosaprendizaje/services/resultado-aprendizaje.service';
import { Semestre } from '../../../semestres/models/semestre.model';
import { SemestreService } from '../../../semestres/services/semestre.service';

/** Lo que cada página de estadísticas necesita saber de la selección. */
export interface FiltrosEstadisticas {
  asignaturaId: string;
  resultadoAprendizajeId: string;
  semestreId: string;
}

export const FILTROS_ESTADISTICAS_VACIOS: FiltrosEstadisticas = {
  asignaturaId: '',
  resultadoAprendizajeId: '',
  semestreId: '',
};

type CargaRa =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; lista: ResultadoAprendizaje[] }
  | { estado: 'error'; error: MensajeError };

const ESTADO_RA_ACTIVO: EstadoResultadoAprendizaje = 'ACTIVO';

/**
 * Filtros Facultad → Materia → Semestre → RA de las páginas de estadísticas del profesor. Cada página
 * crea su propia instancia: la selección no se comparte entre páginas ni hay un servicio de estado.
 * Emite `cambio` en cuanto la persona modifica un filtro (o llega el semestre activo preseleccionado).
 * Los botones propios de cada página se proyectan en `<ng-content />`, debajo de los selectores.
 */
@Component({
  selector: 'app-estadisticas-filtros',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estadisticas-filtros.html',
  styleUrls: ['../estadisticas-comun.scss', './estadisticas-filtros.scss'],
})
export class EstadisticasFiltros {
  private readonly asignaturaService = inject(AsignaturaService);
  private readonly resultadosService = inject(ResultadoAprendizajeService);
  private readonly semestreService = inject(SemestreService);
  private readonly sesion = inject(SesionService);

  readonly cambio = output<FiltrosEstadisticas>();

  // ── Materias ─────────────────────────────────────────────────────────
  protected readonly cargandoAsignaturas = signal(true);
  protected readonly errorAsignaturas = signal<MensajeError | null>(null);
  /** Todas las materias del usuario, sin filtrar: de aquí salen las opciones de «Facultad». */
  protected readonly todas = signal<Asignatura[]>([]);
  /** Lo que devolvió el backend con la facultad elegida (igual a `todas` sin facultad). */
  protected readonly asignaturas = signal<Asignatura[]>([]);
  protected readonly asignaturaId = signal('');

  /** La facultad la filtra el backend (GET /asignaturas?facultadId=…). */
  protected readonly facultadId = signal('');
  /** El Profesor no puede consultar GET /facultades: las opciones salen de sus materias. */
  protected readonly facultades = computed(() => facultadesDe(this.todas()));
  private consultaFacultad: Subscription | undefined;

  // ── RA activos de la materia elegida ────────────────────────────────
  private readonly cargaRa = toSignal(
    toObservable(this.asignaturaId).pipe(
      switchMap((id) => {
        if (!id) {
          return of<CargaRa>({ estado: 'inactivo' });
        }
        return this.resultadosService.listarPorAsignatura(id).pipe(
          map((lista): CargaRa => ({ estado: 'listo', lista })),
          catchError((error: unknown) =>
            of<CargaRa>({ estado: 'error', error: mensajeDeError(error) }),
          ),
          startWith<CargaRa>({ estado: 'cargando' }),
        );
      }),
    ),
    { initialValue: { estado: 'inactivo' } as CargaRa },
  );

  protected readonly cargandoRa = computed(() => this.cargaRa().estado === 'cargando');
  protected readonly errorRa = computed(() => {
    const carga = this.cargaRa();
    return carga.estado === 'error' ? carga.error : null;
  });
  protected readonly resultadosActivos = computed(() => {
    const carga = this.cargaRa();
    return carga.estado === 'listo'
      ? carga.lista.filter((ra) => ra.estado === ESTADO_RA_ACTIVO)
      : [];
  });
  protected readonly resultadoAprendizajeId = signal('');

  // ── Semestres ────────────────────────────────────────────────────────
  protected readonly cargandoSemestres = signal(true);
  protected readonly errorSemestres = signal<MensajeError | null>(null);
  protected readonly semestres = signal<Semestre[]>([]);
  protected readonly semestreId = signal('');

  constructor() {
    this.cargarAsignaturas();
    this.cargarSemestres();
  }

  protected cargarAsignaturas(): void {
    this.cargandoAsignaturas.set(true);
    this.errorAsignaturas.set(null);
    this.consultaFacultad?.unsubscribe();
    this.facultadId.set('');
    this.asignaturaService.listar().subscribe({
      next: (asignaturas) => {
        this.todas.set(asignaturas);
        this.asignaturas.set(asignaturas);
        this.cargandoAsignaturas.set(false);
      },
      error: (error: unknown) => {
        this.errorAsignaturas.set(mensajeDeError(error));
        this.cargandoAsignaturas.set(false);
      },
    });
  }

  protected cargarSemestres(): void {
    this.cargandoSemestres.set(true);
    this.errorSemestres.set(null);
    // El Profesor solo ve los semestres en los que tiene asignaturas (Mantis 0000045).
    const semestres$ =
      this.sesion.rol() === 'profesor'
        ? this.semestreService.listarMios()
        : this.semestreService.listar();
    semestres$.subscribe({
      next: (semestres) => {
        this.semestres.set(semestres);
        const activo = semestres.find((s) => s.estado === 'ACTIVO');
        if (activo) {
          this.semestreId.set(activo.id);
          this.emitir();
        }
        this.cargandoSemestres.set(false);
      },
      error: (error: unknown) => {
        this.errorSemestres.set(mensajeDeError(error));
        this.cargandoSemestres.set(false);
      },
    });
  }

  private emitir(): void {
    this.cambio.emit({
      asignaturaId: this.asignaturaId(),
      resultadoAprendizajeId: this.resultadoAprendizajeId(),
      semestreId: this.semestreId(),
    });
  }

  /**
   * Pide al backend las materias de la facultad. Si la materia elegida es de otra facultad, se
   * descartan la materia y el RA.
   */
  protected alCambiarFacultad(evento: Event): void {
    const facultadId = (evento.target as HTMLSelectElement).value;
    const elegida = this.todas().find((a) => a.id === this.asignaturaId());
    const descartaMateria = !!facultadId && !!elegida && elegida.facultadId !== facultadId;
    if (descartaMateria) {
      this.asignaturaId.set('');
      this.resultadoAprendizajeId.set('');
    }
    this.facultadId.set(facultadId);
    if (descartaMateria) {
      this.emitir();
    }

    this.consultaFacultad?.unsubscribe();
    if (!facultadId) {
      this.asignaturas.set(this.todas());
      return;
    }
    this.consultaFacultad = this.asignaturaService.listar({ facultadId }).subscribe({
      next: (asignaturas) => this.asignaturas.set(asignaturas),
      error: (error: unknown) => this.errorAsignaturas.set(mensajeDeError(error)),
    });
  }

  protected alCambiarAsignatura(evento: Event): void {
    this.asignaturaId.set((evento.target as HTMLSelectElement).value);
    this.resultadoAprendizajeId.set('');
    this.emitir();
  }

  protected alCambiarRa(evento: Event): void {
    this.resultadoAprendizajeId.set((evento.target as HTMLSelectElement).value);
    this.emitir();
  }

  protected alCambiarSemestre(evento: Event): void {
    this.semestreId.set((evento.target as HTMLSelectElement).value);
    this.emitir();
  }
}
