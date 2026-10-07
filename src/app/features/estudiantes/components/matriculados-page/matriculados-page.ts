import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { DialogoConfirmacion } from '../../../../shared/components/dialogo-confirmacion/dialogo-confirmacion';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import {
  EstudianteMatriculado,
  OpcionAsignatura,
  OpcionSemestre,
  PRESENTACION_ESTADO_MATRICULA,
} from '../../models/matricula.model';
import { MensajeError, mensajeDeError } from '../../services/estudiante-error';
import { CatalogosMatriculaService } from '../../services/catalogos-matricula.service';
import { MatriculaService } from '../../services/matricula.service';

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

type ResultadoCarga = { lista: EstudianteMatriculado[] } | { error: MensajeError };

const DURACION_AVISO_MS = 6000;

/**
 * Matriculados por asignatura y semestre (RF-08, RF-09): ambos filtros son obligatorios y, mientras
 * falte alguno, no se consulta nada (spec). El historial de un estudiante concreto vive en su
 * propia ficha (D1); esta vista mira la relación desde el lado de la asignatura y el semestre.
 */
@Component({
  selector: 'app-matriculados-page',
  imports: [ChipEstado, DialogoConfirmacion, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './matriculados-page.html',
  styleUrl: './matriculados-page.scss',
})
export class MatriculadosPage {
  private readonly catalogos = inject(CatalogosMatriculaService);
  private readonly service = inject(MatriculaService);
  private readonly destroyRef = inject(DestroyRef);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  protected readonly presentacion = PRESENTACION_ESTADO_MATRICULA;
  protected readonly aviso = signal<Aviso | null>(null);

  // ── Catálogos de los selectores ───────────────────────────────────
  protected readonly asignaturas = signal<OpcionAsignatura[]>([]);
  protected readonly semestres = signal<OpcionSemestre[]>([]);
  protected readonly cargandoCatalogos = signal(true);
  protected readonly errorCatalogos = signal(false);

  // ── Filtros ───────────────────────────────────────────────────────
  protected readonly asignaturaId = signal('');
  protected readonly semestreId = signal('');
  protected readonly incluirInactivas = signal(false);
  private readonly recargas = signal(0);

  protected readonly ambosElegidos = computed(() => !!this.asignaturaId() && !!this.semestreId());

  // ── Datos y estado de la consulta ──────────────────────────────────
  protected readonly cargando = signal(false);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly matriculados = signal<EstudianteMatriculado[]>([]);

  // ── Desvincular ───────────────────────────────────────────────────
  protected readonly aDesvincular = signal<EstudianteMatriculado | null>(null);
  protected readonly desvinculando = signal(false);
  protected readonly errorDesvincular = signal<string | null>(null);

  protected readonly tituloDesvincular = computed(() => {
    const matricula = this.aDesvincular();
    return matricula ? `¿Desvincular a «${matricula.nombreCompleto}»?` : '';
  });

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizadorAviso));
    this.cargarCatalogos();

    const consulta = computed(() => ({
      asignaturaId: this.asignaturaId(),
      semestreId: this.semestreId(),
      incluirInactivas: this.incluirInactivas(),
      recarga: this.recargas(),
    }));
    toObservable(consulta)
      .pipe(
        tap(() => this.errorCarga.set(null)),
        switchMap(({ asignaturaId, semestreId, incluirInactivas }) => {
          if (!asignaturaId || !semestreId) {
            return of<ResultadoCarga | null>(null);
          }
          this.cargando.set(true);
          return this.service.listarMatriculados(asignaturaId, semestreId, incluirInactivas).pipe(
            map((lista): ResultadoCarga => ({ lista })),
            catchError((error: unknown) => of<ResultadoCarga>({ error: mensajeDeError(error) })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        if (resultado === null) {
          this.matriculados.set([]);
          this.cargando.set(false);
          return;
        }
        if ('lista' in resultado) {
          this.matriculados.set(resultado.lista);
        } else {
          this.errorCarga.set(resultado.error);
        }
        this.cargando.set(false);
      });
  }

  // ── Filtros ───────────────────────────────────────────────────────
  protected alCambiarAsignatura(evento: Event): void {
    this.asignaturaId.set((evento.target as HTMLSelectElement).value);
  }

  protected alCambiarSemestre(evento: Event): void {
    this.semestreId.set((evento.target as HTMLSelectElement).value);
  }

  protected alCambiarIncluirInactivas(evento: Event): void {
    this.incluirInactivas.set((evento.target as HTMLInputElement).checked);
  }

  protected recargar(): void {
    this.recargas.update((n) => n + 1);
  }

  protected reintentarCatalogos(): void {
    this.cargarCatalogos();
  }

  // ── Desvincular ───────────────────────────────────────────────────
  protected pedirDesvincular(matricula: EstudianteMatriculado): void {
    this.errorDesvincular.set(null);
    this.aDesvincular.set(matricula);
  }

  protected cancelarDesvincular(): void {
    this.aDesvincular.set(null);
    this.errorDesvincular.set(null);
  }

  protected confirmarDesvincular(): void {
    const matricula = this.aDesvincular();
    if (!matricula || this.desvinculando()) {
      return;
    }
    this.desvinculando.set(true);
    this.errorDesvincular.set(null);
    this.service
      .desvincular(matricula.matriculaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.desvinculando.set(false);
          this.aDesvincular.set(null);
          this.mostrarAviso({
            texto: `Desvinculado: ${matricula.nombreCompleto}.`,
            tono: 'ok',
          });
          this.recargar();
        },
        error: (error: unknown) => {
          this.desvinculando.set(false);
          this.errorDesvincular.set(mensajeDeError(error).mensaje);
          this.recargar();
        },
      });
  }

  // ── Avisos ────────────────────────────────────────────────────────
  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  private mostrarAviso(aviso: Aviso): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(aviso);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(false);
    forkJoin({
      asignaturas: this.catalogos.listarAsignaturas().pipe(catchError(() => of(null))),
      semestres: this.catalogos.listarSemestres().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ asignaturas, semestres }) => {
        this.cargandoCatalogos.set(false);
        if (asignaturas === null || semestres === null) {
          this.errorCatalogos.set(true);
          this.asignaturas.set([]);
          this.semestres.set([]);
          return;
        }
        this.asignaturas.set(asignaturas);
        this.semestres.set(semestres);
      });
  }
}
