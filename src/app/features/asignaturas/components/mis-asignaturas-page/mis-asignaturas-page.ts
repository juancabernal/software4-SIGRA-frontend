import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, finalize, of, skip } from 'rxjs';

import { refrescoAutomatico } from '../../../../core/util/refresco-automatico';
import { mensajeDeError, MensajeError } from '../../../../core/http/mensaje-de-error';
import { ChipEstado, VarianteChip } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { MiAsignatura, EstadoAsignatura } from '../../models/asignatura.model';
import { AsignaturaService } from '../../services/asignatura.service';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { ResultadoAprendizajeService } from '../../../resultadosaprendizaje/services/resultado-aprendizaje.service';

export type VistaMisAsignaturas = 'PROFESOR' | 'ESTUDIANTE';

interface PresentacionEstado {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
}

interface OpcionPrograma {
  id: string;
  nombre: string;
}

const PRESENTACION_ESTADO: Readonly<Record<EstadoAsignatura, PresentacionEstado>> = {
  BORRADOR: { etiqueta: 'Borrador', variante: 'advertencia', icono: 'documento-borrador' },
  ACTIVA: { etiqueta: 'Activa', variante: 'ok', icono: 'check' },
  INACTIVA: { etiqueta: 'Inactiva', variante: 'neutro', icono: 'prohibido' },
};

/** Quita tildes y normaliza mayúsculas para comparar texto sin distinguir acentos. */
/** .. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Consulta de las asignaturas que el backend ya autorizó para la sesión actual.
 * La misma pantalla se usa en profesor y estudiante; el modo solo cambia las acciones visibles.
 */
@Component({
  selector: 'app-mis-asignaturas-page',
  imports: [ChipEstado, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mis-asignaturas-page.html',
  styleUrl: './mis-asignaturas-page.scss',
})
export class MisAsignaturasPage {
  readonly vista = input<VistaMisAsignaturas>('PROFESOR');

  private readonly asignaturaService = inject(AsignaturaService);
  private readonly resultadoService = inject(ResultadoAprendizajeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly presentacionEstado = PRESENTACION_ESTADO;
  protected readonly asignaturas = signal<MiAsignatura[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly seleccionada = signal<MiAsignatura | null>(null);
  protected readonly resultados = signal<ResultadoAprendizaje[]>([]);
  protected readonly cargandoResultados = signal(false);
  protected readonly errorResultados = signal<MensajeError | null>(null);
  protected readonly hayResultados = computed(() => this.resultados().length > 0);

  protected readonly titulo = computed(() =>
    this.vista() === 'PROFESOR' ? 'Mis asignaturas' : 'Mis materias',
  );

  protected readonly subtitulo = computed(() =>
    this.vista() === 'PROFESOR'
      ? 'Asignaturas asignadas al profesor autenticado'
      : 'Materias matriculadas por el estudiante autenticado',
  );

  protected readonly esProfesor = computed(() => this.vista() === 'PROFESOR');

  protected readonly etiquetaRecurso = computed(() => (this.esProfesor() ? 'asignaturas' : 'materias'));

  protected readonly tituloVacio = computed(() =>
    this.esProfesor() ? 'Aún no tienes asignaturas asignadas' : 'Aún no estás matriculado en ninguna materia',
  );

  protected readonly mensajeVacio = computed(() =>
    this.esProfesor()
      ? 'Cuando el administrador te asigne una asignatura, aparecerá en esta lista.'
      : 'Cuando te matricules en una materia, aparecerá en esta lista.',
  );

  protected readonly texto = signal('');
  protected readonly programaId = signal('');
  protected readonly estadoFiltro = signal<EstadoAsignatura | ''>('');

  protected readonly programas = computed<OpcionPrograma[]>(() => {
    const vistos = new Map<string, string>();
    for (const asignatura of this.asignaturas()) {
      if (!vistos.has(asignatura.programaId)) {
        vistos.set(asignatura.programaId, asignatura.programaNombre);
      }
    }
    return Array.from(vistos, ([id, nombre]) => ({ id, nombre })).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  });

  protected readonly estadosDisponibles = computed<EstadoAsignatura[]>(() => {
    const vistos = new Set<EstadoAsignatura>();
    for (const asignatura of this.asignaturas()) {
      vistos.add(asignatura.estado);
    }
    return Array.from(vistos);
  });

  protected readonly hayFiltros = computed(
    () => this.texto().trim() !== '' || this.programaId() !== '' || this.estadoFiltro() !== '',
  );

  protected readonly asignaturasFiltradas = computed(() => {
    const texto = normalizar(this.texto().trim());
    const programaId = this.programaId();
    const estado = this.estadoFiltro();
    return this.asignaturas().filter((asignatura) => {
      if (programaId && asignatura.programaId !== programaId) {
        return false;
      }
      if (estado && asignatura.estado !== estado) {
        return false;
      }
      if (texto) {
        const coincide =
          normalizar(asignatura.codigo).includes(texto) || normalizar(asignatura.nombre).includes(texto);
        if (!coincide) {
          return false;
        }
      }
      return true;
    });
  });

  private readonly refresco = refrescoAutomatico();

  constructor() {
    this.cargarAsignaturas();

    toObservable(this.refresco)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => this.refrescarAsignaturasEnSegundoPlano());
  }

  protected seleccionar(asignatura: MiAsignatura): void {
    this.seleccionada.set(asignatura);
    this.resultados.set([]);
    this.errorResultados.set(null);

    if (!this.esProfesor()) {
      return;
    }

    this.cargandoResultados.set(true);
    this.resultadoService
      .listarPorAsignatura(asignatura.id)
      .pipe(
        catchError((error: unknown) => {
          this.errorResultados.set(mensajeDeError(error));
          return of<ResultadoAprendizaje[]>([]);
        }),
        finalize(() => this.cargandoResultados.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultados) => this.resultados.set(resultados));
  }

  protected irAMatricula(asignatura: MiAsignatura): void {
    void this.router.navigate(['/profesor/matricula'], {
      queryParams: { asignaturaId: asignatura.id },
    });
  }

  protected reintentar(): void {
    this.cargarAsignaturas();
  }

  protected alEscribir(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
  }

  protected alCambiarPrograma(evento: Event): void {
    this.programaId.set((evento.target as HTMLSelectElement).value);
  }

  protected alCambiarEstado(evento: Event): void {
    this.estadoFiltro.set((evento.target as HTMLSelectElement).value as EstadoAsignatura | '');
  }

  protected limpiarFiltros(): void {
    this.texto.set('');
    this.programaId.set('');
    this.estadoFiltro.set('');
  }

  /** Vuelve a consultar las asignaturas sin mostrar "cargando" ni borrar lo que ya hay en pantalla. */
  private refrescarAsignaturasEnSegundoPlano(): void {
    if (this.cargando()) {
      return;
    }
    this.asignaturaService
      .misAsignaturas()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((asignaturas) => {
        if (asignaturas === null) {
          return;
        }
        if (JSON.stringify(this.asignaturas()) === JSON.stringify(asignaturas)) {
          return;
        }
        this.asignaturas.set(asignaturas);
      });
  }

  private cargarAsignaturas(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.asignaturaService
      .misAsignaturas()
      .pipe(
        catchError((error: unknown) => {
          this.errorCarga.set(mensajeDeError(error));
          return of<MiAsignatura[]>([]);
        }),
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((asignaturas) => {
        this.asignaturas.set(asignaturas);
        if (asignaturas.length === 0) {
          this.seleccionada.set(null);
          this.resultados.set([]);
        }
      });
  }
}
