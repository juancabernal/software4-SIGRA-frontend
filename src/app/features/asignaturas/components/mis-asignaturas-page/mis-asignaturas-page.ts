import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

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

const PRESENTACION_ESTADO: Readonly<Record<EstadoAsignatura, PresentacionEstado>> = {
  BORRADOR: { etiqueta: 'Borrador', variante: 'advertencia', icono: 'documento-borrador' },
  ACTIVA: { etiqueta: 'Activa', variante: 'ok', icono: 'check' },
  INACTIVA: { etiqueta: 'Inactiva', variante: 'neutro', icono: 'prohibido' },
};

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

  constructor() {
    this.cargarAsignaturas();
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
