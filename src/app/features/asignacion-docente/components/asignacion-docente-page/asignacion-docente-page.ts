import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, skip, switchMap, tap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Paginador } from '../../../../shared/ui/paginador/paginador';
import { paginarEnCliente } from '../../../../shared/ui/paginador/paginacion-cliente';
import { Asignatura, ProgramaOpcion } from '../../../asignaturas/models/asignatura.model';
import { AsignaturaService } from '../../../asignaturas/services/asignatura.service';
import { ProgramaOpcionesService } from '../../../asignaturas/services/programa-opciones.service';
import { Facultad } from '../../../facultades/models/facultad.model';
import { FacultadService } from '../../../facultades/services/facultad.service';
import { AsignaturaProfesor, Profesor } from '../../../profesores/models/profesor.model';
import { ProfesorService } from '../../../profesores/services/profesor.service';
import { ResultadoAsignacionMasiva } from '../../models/asignacion-docente.model';
import { AsignacionDocenteService } from '../../services/asignacion-docente.service';

const DURACION_AVISO_MS = 8000;

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

/**
 * Asignación docente (RF-07), en una sola pantalla (rediseño 0000037): se elige UN profesor y, solo
 * entonces, aparecen sus materias asignadas (con la opción de desasignar cada una) y la lista de
 * materias que se le pueden agregar. Todo se hace sobre el mismo profesor, sin cambiar de pestaña,
 * y siempre está claro a quién se le asigna qué.
 *
 * La petición al backend no cambia: se sigue enviando `profesorIds` y `asignaturaIds`, ahora con un
 * único profesor. Solo se listan profesores ACTIVOS y materias ACTIVAS: el backend rechazaría
 * cualquier otro caso.
 */
@Component({
  selector: 'app-asignacion-docente-page',
  imports: [Icono, Paginador],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './asignacion-docente-page.html',
  styleUrl: './asignacion-docente-page.scss',
})
export class AsignacionDocentePage {
  private readonly asignacionService = inject(AsignacionDocenteService);
  private readonly profesorService = inject(ProfesorService);
  private readonly asignaturaService = inject(AsignaturaService);
  private readonly programaOpciones = inject(ProgramaOpcionesService);
  private readonly facultadService = inject(FacultadService);
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

  // ── Profesor elegido y sus materias ────────────────────────────────
  /** Id del profesor elegido; cadena vacía mientras no se haya elegido ninguno. */
  protected readonly profesorElegido = signal('');
  protected readonly hayProfesorElegido = computed(() => this.profesorElegido() !== '');
  protected readonly nombreProfesorElegido = computed(
    () => this.profesoresActivos().find((p) => p.id === this.profesorElegido())?.nombreCompleto ?? '',
  );

  /** Materias ACTIVAS que el profesor elegido tiene asignadas hoy. */
  protected readonly asignaciones = signal<AsignaturaProfesor[]>([]);
  /** Paginación en cliente, igual que en «Materias». */
  protected readonly paginacion = paginarEnCliente(this.asignaciones);
  protected readonly cargandoAsignaciones = signal(false);
  protected readonly desasignandoId = signal<string | null>(null);

  // ── Materias por agregar ───────────────────────────────────────────
  protected readonly asignaturasSeleccionadas = signal<ReadonlySet<string>>(new Set());
  protected readonly haySeleccion = computed(
    () => this.hayProfesorElegido() && this.asignaturasSeleccionadas().size > 0,
  );

  /**
   * Materias que el profesor elegido ya tiene asignadas: se ocultan de la lista de agregar, porque
   * ofrecerlas de nuevo solo llevaría a un «omitido» seguro.
   */
  private readonly asignaturasYaAsignadas = computed(
    () => new Set(this.asignaciones().map((a) => a.asignaturaId)),
  );
  protected readonly asignaturasDisponibles = computed(() =>
    this.asignaturasActivas().filter((a) => !this.asignaturasYaAsignadas().has(a.id)),
  );

  // ── Buscador de materias ─────────────────────────────────────────────
  protected readonly filtroMateria = signal('');

  // ── Filtros de facultad y programa (los aplica el backend) ───────────
  protected readonly facultadId = signal('');
  protected readonly programaId = signal('');
  protected readonly cargandoMaterias = signal(false);
  private readonly filtrosMaterias = computed(() => ({
    facultadId: this.facultadId() || undefined,
    programaId: this.programaId() || undefined,
  }));

  /** Opciones de «Facultad» (GET /facultades). Si fallan, el filtro no se ofrece. */
  protected readonly facultades = toSignal(
    this.facultadService.listar().pipe(catchError(() => of([] as Facultad[]))),
    { initialValue: [] as Facultad[] },
  );
  /** Programas con su facultad, para acotar el filtro «Programa» a la facultad elegida. */
  private readonly programas = toSignal(
    this.programaOpciones.listar().pipe(catchError(() => of([] as ProgramaOpcion[]))),
    { initialValue: [] as ProgramaOpcion[] },
  );
  protected readonly programasDeFacultad = computed(() => {
    const facultad = this.facultadId();
    return facultad ? this.programas().filter((p) => p.facultadId === facultad) : this.programas();
  });

  /** El buscador de texto filtra en pantalla la lista que ya devolvió el backend. */
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

  /** Frase en lenguaje claro de lo que pasó con la última asignación. */
  protected readonly resumenResultado = computed(() => {
    const resultado = this.resultado();
    return resultado ? resumirResultado(resultado, this.nombreProfesorElegido()) : '';
  });

  /** «Nombre (CÓDIGO)» de una materia del catálogo cargado; null si no está en la lista actual. */
  protected descripcionMateria(asignaturaId: string): string | null {
    const asignatura = this.asignaturas().find((a) => a.id === asignaturaId);
    return asignatura ? `${asignatura.nombre} (${asignatura.codigo})` : null;
  }

  constructor() {
    this.cargarCatalogos();

    // Cada cambio de facultad o programa vuelve a pedir las materias; switchMap descarta la
    // respuesta anterior. La carga inicial ya la hace cargarCatalogos.
    toObservable(this.filtrosMaterias)
      .pipe(
        skip(1),
        tap(() => this.cargandoMaterias.set(true)),
        switchMap((filtros) =>
          this.asignaturaService.listar(filtros).pipe(catchError((error: unknown) => of(error))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        this.cargandoMaterias.set(false);
        if (Array.isArray(resultado)) {
          this.asignaturas.set(resultado);
        } else {
          this.mostrarAviso(mensajeDeError(resultado).mensaje, 'error');
        }
      });
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(null);
    forkJoin({
      profesores: this.profesorService.listar(),
      asignaturas: this.asignaturaService.listar(this.filtrosMaterias()),
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

  // ── Profesor ───────────────────────────────────────────────────────
  /** Al cambiar de profesor se empieza de cero: lo marcado y el último resultado eran del anterior. */
  protected alCambiarProfesor(evento: Event): void {
    this.profesorElegido.set((evento.target as HTMLSelectElement).value);
    this.asignaturasSeleccionadas.set(new Set());
    this.resultado.set(null);
    this.asignaciones.set([]);
    this.paginacion.reiniciar();
    this.consultarAsignaciones();
  }

  private consultarAsignaciones(): void {
    const profesorId = this.profesorElegido();
    if (!profesorId) {
      this.cargandoAsignaciones.set(false);
      return;
    }
    this.cargandoAsignaciones.set(true);
    this.profesorService
      .consultarAsignaturas(profesorId, 'ACTIVO')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (asignaciones) => {
          // Si el usuario ya cambió de profesor, esta respuesta es del anterior: se descarta.
          if (this.profesorElegido() !== profesorId) {
            return;
          }
          this.asignaciones.set(asignaciones);
          this.cargandoAsignaciones.set(false);
          // Si alguna materia marcada quedó asignada (queda oculta de la lista), se quita.
          this.asignaturasSeleccionadas.update((actual) => {
            const copia = new Set(actual);
            for (const asignacion of asignaciones) {
              copia.delete(asignacion.asignaturaId);
            }
            return copia;
          });
        },
        error: (error: unknown) => {
          if (this.profesorElegido() !== profesorId) {
            return;
          }
          this.cargandoAsignaciones.set(false);
          this.mostrarAviso(mensajeDeError(error).mensaje, 'error');
        },
      });
  }

  // ── Desasignar ─────────────────────────────────────────────────────
  protected desasignar(asignacionId: string): void {
    if (this.desasignandoId()) {
      return;
    }
    // El resultado de «Asignar» solo vale justo después de asignar: otra acción lo deja desactualizado.
    this.resultado.set(null);
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

  // ── Materias por agregar ───────────────────────────────────────────
  protected alternarAsignatura(id: string): void {
    this.resultado.set(null);
    this.asignaturasSeleccionadas.update((actual) => alternarEnConjunto(actual, id));
  }

  protected asignaturaEstaSeleccionada(id: string): boolean {
    return this.asignaturasSeleccionadas().has(id);
  }

  protected alEscribirFiltroMateria(evento: Event): void {
    this.filtroMateria.set((evento.target as HTMLInputElement).value);
  }

  /** Al cambiar de facultad se descarta el programa elegido si no pertenece a ella. */
  protected alCambiarFacultad(evento: Event): void {
    const facultadId = (evento.target as HTMLSelectElement).value;
    this.facultadId.set(facultadId);
    const programa = this.programas().find((p) => p.id === this.programaId());
    if (facultadId && programa && programa.facultadId !== facultadId) {
      this.programaId.set('');
    }
  }

  protected alCambiarPrograma(evento: Event): void {
    this.programaId.set((evento.target as HTMLSelectElement).value);
  }

  // ── Asignar ────────────────────────────────────────────────────────
  protected asignar(): void {
    if (!this.haySeleccion() || this.asignando()) {
      return;
    }
    this.asignando.set(true);
    this.resultado.set(null);
    const profesorIds = [this.profesorElegido()];
    const asignaturaIds = [...this.asignaturasSeleccionadas()];

    this.asignacionService
      .asignarMasivo({ profesorIds, asignaturaIds })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultado) => {
          this.asignando.set(false);
          this.resultado.set(resultado);
          // El profesor sigue elegido: se vuelve a consultar para que sus materias nuevas aparezcan.
          this.asignaturasSeleccionadas.set(new Set());
          this.filtroMateria.set('');
          this.mostrarAviso(
            resumirResultado(resultado, this.nombreProfesorElegido()),
            resultado.creadas.length > 0 ? 'ok' : 'error',
          );
          this.consultarAsignaciones();
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

function resumirResultado(resultado: ResultadoAsignacionMasiva, profesor: string): string {
  const creadas = resultado.creadas.length;
  if (creadas === 0) {
    return 'No se asignó ninguna materia.';
  }
  return creadas === 1
    ? `Se asignó 1 materia a ${profesor}.`
    : `Se asignaron ${creadas} materias a ${profesor}.`;
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
