import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { AsignaturaService } from '../../../asignaturas/services/asignatura.service';
import { Profesor } from '../../../profesores/models/profesor.model';
import { ProfesorService } from '../../../profesores/services/profesor.service';
import { ResultadoAsignacionMasiva } from '../../models/asignacion-docente.model';
import { AsignacionDocenteService } from '../../services/asignacion-docente.service';

const DURACION_AVISO_MS = 8000;

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

/**
 * Pestaña «Asignar» de RF-07: elige uno o más profesores, y solo entonces aparecen las materias
 * para elegir (decisión del equipo: no mostrar las materias hasta que haya al menos un profesor
 * elegido, para no abrumar con dos listas largas a la vez). Asigna el cartesiano profesores ×
 * materias en una sola petición y muestra el resumen (creadas, omitidas por duplicado, rechazadas
 * por inactivas).
 *
 * Solo se listan profesores ACTIVOS y materias ACTIVAS: el backend rechazaría cualquier otro caso.
 */
@Component({
  selector: 'app-asignar-tab',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asignar-tab.html',
  styleUrl: './asignar-tab.scss',
})
export class AsignarTab {
  private readonly asignacionService = inject(AsignacionDocenteService);
  private readonly profesorService = inject(ProfesorService);
  private readonly asignaturaService = inject(AsignaturaService);
  private readonly destroyRef = inject(DestroyRef);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  // ── Catálogos ──────────────────────────────────────────────────────
  protected readonly profesores = signal<Profesor[]>([]);
  protected readonly asignaturas = signal<Asignatura[]>([]);
  protected readonly cargandoCatalogos = signal(true);
  protected readonly errorCatalogos = signal<MensajeError | null>(null);

  protected readonly profesoresActivos = computed(() =>
    this.profesores().filter((p) => p.estado === 'ACTIVO'),
  );
  protected readonly asignaturasActivas = computed(() =>
    this.asignaturas().filter((a) => a.estado === 'ACTIVA'),
  );

  // ── Selección ──────────────────────────────────────────────────────
  protected readonly profesoresSeleccionados = signal<ReadonlySet<string>>(new Set());
  protected readonly asignaturasSeleccionadas = signal<ReadonlySet<string>>(new Set());
  /** Las materias no se muestran hasta que haya al menos un profesor elegido. */
  protected readonly hayProfesorElegido = computed(() => this.profesoresSeleccionados().size > 0);
  protected readonly haySeleccion = computed(
    () => this.profesoresSeleccionados().size > 0 && this.asignaturasSeleccionadas().size > 0,
  );

  /**
   * Materias que el único profesor elegido ya tiene asignadas (ACTIVO): se ocultan de la lista,
   * porque ofrecerlas de nuevo solo llevaría a un «omitido» seguro. Con más de un profesor
   * elegido no se filtra nada, porque cada uno puede tener una combinación distinta ya asignada.
   */
  protected readonly asignaturasYaAsignadas = signal<ReadonlySet<string>>(new Set());
  protected readonly cargandoYaAsignadas = signal(false);
  protected readonly asignaturasDisponibles = computed(() =>
    this.asignaturasActivas().filter((a) => !this.asignaturasYaAsignadas().has(a.id)),
  );

  // ── Buscador de materias ─────────────────────────────────────────────
  protected readonly filtroMateria = signal('');
  protected readonly asignaturasFiltradas = computed(() => {
    const filtro = this.filtroMateria().trim().toLowerCase();
    const disponibles = this.asignaturasDisponibles();
    if (!filtro) {
      return disponibles;
    }
    return disponibles.filter(
      (a) => a.nombre.toLowerCase().includes(filtro) || a.codigo.toLowerCase().includes(filtro),
    );
  });

  // ── Asignar ────────────────────────────────────────────────────────
  protected readonly asignando = signal(false);
  protected readonly resultado = signal<ResultadoAsignacionMasiva | null>(null);
  protected readonly aviso = signal<Aviso | null>(null);

  constructor() {
    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(null);
    forkJoin({
      profesores: this.profesorService.listar(),
      asignaturas: this.asignaturaService.listar(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ profesores, asignaturas }) => {
          this.profesores.set(profesores);
          this.asignaturas.set(asignaturas);
          this.cargandoCatalogos.set(false);
        },
        error: (error: unknown) => {
          this.errorCatalogos.set(mensajeDeError(error));
          this.cargandoCatalogos.set(false);
        },
      });
  }

  protected recargarCatalogos(): void {
    this.cargarCatalogos();
  }

  // ── Selección ──────────────────────────────────────────────────────
  protected alternarProfesor(id: string): void {
    this.profesoresSeleccionados.update((actual) => alternarEnConjunto(actual, id));
    // Si se deselecciona el último profesor, la selección de materias ya no tiene sentido.
    if (!this.hayProfesorElegido()) {
      this.asignaturasSeleccionadas.set(new Set());
    }
    this.actualizarAsignaturasYaAsignadas();
  }

  protected alternarAsignatura(id: string): void {
    this.asignaturasSeleccionadas.update((actual) => alternarEnConjunto(actual, id));
  }

  protected profesorEstaSeleccionado(id: string): boolean {
    return this.profesoresSeleccionados().has(id);
  }

  protected asignaturaEstaSeleccionada(id: string): boolean {
    return this.asignaturasSeleccionadas().has(id);
  }

  protected limpiarSeleccion(): void {
    this.profesoresSeleccionados.set(new Set());
    this.asignaturasSeleccionadas.set(new Set());
    this.asignaturasYaAsignadas.set(new Set());
    this.filtroMateria.set('');
  }

  private actualizarAsignaturasYaAsignadas(): void {
    const seleccionados = [...this.profesoresSeleccionados()];
    if (seleccionados.length !== 1) {
      this.asignaturasYaAsignadas.set(new Set());
      return;
    }
    this.cargandoYaAsignadas.set(true);
    this.profesorService
      .consultarAsignaturas(seleccionados[0], 'ACTIVO')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (asignaciones) => {
          const yaAsignadas = new Set(asignaciones.map((a) => a.asignaturaId));
          this.asignaturasYaAsignadas.set(yaAsignadas);
          this.cargandoYaAsignadas.set(false);
          // Si alguna materia seleccionada quedó oculta, se quita de la selección.
          this.asignaturasSeleccionadas.update((actual) => {
            const copia = new Set(actual);
            for (const id of yaAsignadas) {
              copia.delete(id);
            }
            return copia;
          });
        },
        error: () => {
          this.cargandoYaAsignadas.set(false);
        },
      });
  }

  protected alEscribirFiltroMateria(evento: Event): void {
    this.filtroMateria.set((evento.target as HTMLInputElement).value);
  }

  // ── Asignar ────────────────────────────────────────────────────────
  protected asignar(): void {
    if (!this.haySeleccion() || this.asignando()) {
      return;
    }
    this.asignando.set(true);
    this.resultado.set(null);
    const profesorIds = [...this.profesoresSeleccionados()];
    const asignaturaIds = [...this.asignaturasSeleccionadas()];

    this.asignacionService
      .asignarMasivo({ profesorIds, asignaturaIds })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.asignando.set(false);
          this.resultado.set(resultado);
          this.limpiarSeleccion();
          this.mostrarAviso(
            `${resultado.creadas.length} asignación(es) creada(s), ${resultado.omitidas.length} omitida(s), ${resultado.rechazadas.length} rechazada(s).`,
          );
        },
        error: (error: unknown) => {
          this.asignando.set(false);
          this.mostrarAviso(mensajeDeError(error).mensaje, 'error');
        },
      });
  }

  // ── Avisos ────────────────────────────────────────────────────────
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

function alternarEnConjunto(actual: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const copia = new Set(actual);
  if (copia.has(id)) {
    copia.delete(id);
  } else {
    copia.add(id);
  }
  return copia;
}
