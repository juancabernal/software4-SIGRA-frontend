import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { Icono } from '../../../../shared/ui/icono/icono';
import { AsignaturaProfesor, Profesor } from '../../../profesores/models/profesor.model';
import { ProfesorService } from '../../../profesores/services/profesor.service';
import { AsignacionDocenteService } from '../../services/asignacion-docente.service';

const DURACION_AVISO_MS = 8000;

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

/**
 * Pestaña «Consultar y desasignar» de RF-07: elige un profesor y, solo entonces, aparecen sus
 * materias asignadas, con la opción de desasignar cada una (eliminación lógica).
 */
@Component({
  selector: 'app-consultar-tab',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './consultar-tab.html',
  styleUrl: './consultar-tab.scss',
})
export class ConsultarTab {
  private readonly asignacionService = inject(AsignacionDocenteService);
  private readonly profesorService = inject(ProfesorService);
  private readonly destroyRef = inject(DestroyRef);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  protected readonly profesores = signal<Profesor[]>([]);
  protected readonly cargandoProfesores = signal(true);
  protected readonly errorProfesores = signal<MensajeError | null>(null);
  protected readonly profesoresActivos = computed(() =>
    this.profesores().filter((p) => p.estado === 'ACTIVO'),
  );

  protected readonly profesorElegido = signal<string>('');
  protected readonly asignaciones = signal<AsignaturaProfesor[]>([]);
  protected readonly cargandoAsignaciones = signal(false);
  protected readonly desasignandoId = signal<string | null>(null);
  protected readonly aviso = signal<Aviso | null>(null);

  constructor() {
    this.cargarProfesores();
  }

  private cargarProfesores(): void {
    this.cargandoProfesores.set(true);
    this.errorProfesores.set(null);
    this.profesorService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profesores) => {
          this.profesores.set(profesores);
          this.cargandoProfesores.set(false);
        },
        error: (error: unknown) => {
          this.errorProfesores.set(mensajeDeError(error));
          this.cargandoProfesores.set(false);
        },
      });
  }

  protected recargarProfesores(): void {
    this.cargarProfesores();
  }

  protected alCambiarProfesor(evento: Event): void {
    this.profesorElegido.set((evento.target as HTMLSelectElement).value);
    this.consultarAsignaciones();
  }

  private consultarAsignaciones(): void {
    const profesorId = this.profesorElegido();
    if (!profesorId) {
      this.asignaciones.set([]);
      return;
    }
    this.cargandoAsignaciones.set(true);
    this.profesorService
      .consultarAsignaturas(profesorId, 'ACTIVO')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (asignaciones) => {
          this.asignaciones.set(asignaciones);
          this.cargandoAsignaciones.set(false);
        },
        error: (error: unknown) => {
          this.cargandoAsignaciones.set(false);
          this.mostrarAviso(mensajeDeError(error).mensaje, 'error');
        },
      });
  }

  protected desasignar(asignacionId: string): void {
    if (this.desasignandoId()) {
      return;
    }
    this.desasignandoId.set(asignacionId);
    this.asignacionService
      .desasignar(asignacionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.desasignandoId.set(null);
          this.mostrarAviso('Profesor desasignado de la materia.');
          this.consultarAsignaciones();
        },
        error: (error: unknown) => {
          this.desasignandoId.set(null);
          this.mostrarAviso(mensajeDeError(error).mensaje, 'error');
        },
      });
  }

  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  private mostrarAviso(texto: string, tono: Aviso['tono'] = 'ok'): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set({ texto, tono });
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }
}
