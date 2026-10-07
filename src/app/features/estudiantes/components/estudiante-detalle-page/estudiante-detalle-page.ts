import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { DialogoConfirmacion } from '../../../../shared/components/dialogo-confirmacion/dialogo-confirmacion';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Estudiante, PRESENTACION_ESTADO_ESTUDIANTE } from '../../models/estudiante.model';
import { AsignaturaDeEstudiante, PRESENTACION_ESTADO_MATRICULA } from '../../models/matricula.model';
import { MensajeError, mensajeDeError } from '../../services/estudiante-error';
import { EstudianteService } from '../../services/estudiante.service';
import { MatriculaService } from '../../services/matricula.service';
import { MatriculaFormDialog } from '../matricula-form-dialog/matricula-form-dialog';

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

const DURACION_AVISO_MS = 6000;

/**
 * Ficha de un estudiante (RF-09a) con su historial completo de asignaturas (RF-08, RF-09). La
 * ficha y el historial se cargan por separado: cada uno con su propio estado de carga, error y
 * reintento, porque el historial solo tiene sentido pedirlo una vez la ficha existe.
 */
@Component({
  selector: 'app-estudiante-detalle-page',
  imports: [ChipEstado, DialogoConfirmacion, Icono, MatriculaFormDialog, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estudiante-detalle-page.html',
  styleUrl: './estudiante-detalle-page.scss',
})
export class EstudianteDetallePage {
  private readonly service = inject(EstudianteService);
  private readonly matriculaService = inject(MatriculaService);
  private readonly destroyRef = inject(DestroyRef);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  /** Enlazado por el router a `:id` (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  protected readonly presentacionEstudiante = PRESENTACION_ESTADO_ESTUDIANTE;
  protected readonly presentacionMatricula = PRESENTACION_ESTADO_MATRICULA;
  protected readonly aviso = signal<Aviso | null>(null);

  // ── Ficha ─────────────────────────────────────────────────────────
  protected readonly cargando = signal(true);
  protected readonly noExiste = signal(false);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly estudiante = signal<Estudiante | null>(null);

  // ── Historial de asignaturas ──────────────────────────────────────
  protected readonly cargandoHistorial = signal(false);
  protected readonly errorHistorial = signal<MensajeError | null>(null);
  protected readonly historial = signal<AsignaturaDeEstudiante[]>([]);

  // ── Matricular ────────────────────────────────────────────────────
  protected readonly matriculaAbierta = signal(false);

  // ── Desvincular ───────────────────────────────────────────────────
  protected readonly aDesvincular = signal<AsignaturaDeEstudiante | null>(null);
  protected readonly desvinculando = signal(false);
  protected readonly errorDesvincular = signal<string | null>(null);

  protected readonly tituloDesvincular = computed(() => {
    const matricula = this.aDesvincular();
    return matricula
      ? `¿Desvincular de «${matricula.asignaturaNombre}» (${matricula.semestreCodigo})?`
      : '';
  });

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizadorAviso));
    effect(() => {
      const id = this.id();
      untracked(() => this.cargarFicha(id));
    });
  }

  protected reintentarFicha(): void {
    this.cargarFicha(this.id());
  }

  protected reintentarHistorial(): void {
    this.cargarHistorial(this.id());
  }

  // ── Matricular ────────────────────────────────────────────────────
  protected abrirMatricula(): void {
    this.matriculaAbierta.set(true);
  }

  protected cerrarMatricula(): void {
    this.matriculaAbierta.set(false);
  }

  protected alMatricular(texto: string): void {
    this.matriculaAbierta.set(false);
    this.mostrarAviso({ texto, tono: 'ok' });
    this.cargarHistorial(this.id());
  }

  // ── Desvincular ───────────────────────────────────────────────────
  protected pedirDesvincular(matricula: AsignaturaDeEstudiante): void {
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
    this.matriculaService
      .desvincular(matricula.matriculaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.desvinculando.set(false);
          this.aDesvincular.set(null);
          this.mostrarAviso({
            texto: `Desvinculado de «${matricula.asignaturaNombre}».`,
            tono: 'ok',
          });
          this.cargarHistorial(this.id());
        },
        error: (error: unknown) => {
          this.desvinculando.set(false);
          this.errorDesvincular.set(mensajeDeError(error).mensaje);
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

  // ── Carga ─────────────────────────────────────────────────────────
  private cargarFicha(id: string): void {
    this.cargando.set(true);
    this.noExiste.set(false);
    this.errorCarga.set(null);
    this.service
      .consultarPorId(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (estudiante) => {
          this.estudiante.set(estudiante);
          this.cargando.set(false);
          this.cargarHistorial(id);
        },
        error: (error: unknown) => {
          this.cargando.set(false);
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.noExiste.set(true);
          } else {
            this.errorCarga.set(mensajeDeError(error));
          }
        },
      });
  }

  private cargarHistorial(id: string): void {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set(null);
    this.service
      .asignaturasDe(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (historial) => {
          this.historial.set(historial);
          this.cargandoHistorial.set(false);
        },
        error: (error: unknown) => {
          this.cargandoHistorial.set(false);
          this.errorHistorial.set(mensajeDeError(error));
        },
      });
  }
}
