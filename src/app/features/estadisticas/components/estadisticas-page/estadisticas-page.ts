import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, skip, startWith, switchMap } from 'rxjs';

import { refrescoAutomatico } from '../../../../core/util/refresco-automatico';
import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { AsignaturaService } from '../../../asignaturas/services/asignatura.service';
import { AccionMejoraFormDialog } from '../../../mejoras/components/accion-mejora-form-dialog/accion-mejora-form-dialog';
import { ConversionAccionMejoraDialog } from '../../../mejoras/components/conversion-accion-mejora-dialog/conversion-accion-mejora-dialog';
import { AccionMejora } from '../../../mejoras/models/accion-mejora.model';
import { AccionMejoraService } from '../../../mejoras/services/accion-mejora.service';
import {
  ResultadoAprendizaje,
  EstadoResultadoAprendizaje,
} from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { ResultadoAprendizajeService } from '../../../resultadosaprendizaje/services/resultado-aprendizaje.service';
import { Semestre } from '../../../semestres/models/semestre.model';
import { SemestreService } from '../../../semestres/services/semestre.service';
import { Conclusion, ConclusionEstado } from '../../models/conclusion.model';
import { ConclusionService } from '../../services/conclusion.service';

type CargaRa =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; lista: ResultadoAprendizaje[] }
  | { estado: 'error'; error: MensajeError };

type CargaConclusion =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; resultado: ConclusionEstado }
  | { estado: 'error'; error: MensajeError };

type CargaAccionesMejora =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; lista: AccionMejora[] }
  | { estado: 'error'; error: MensajeError };

const ESTADO_RA_ACTIVO: EstadoResultadoAprendizaje = 'ACTIVO';

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

const DURACION_AVISO_MS = 6000;

/**
 * RF-16: vista de estadísticas del profesor. Se elige materia → RA activo → semestre y se
 * consulta el estado de ese (RA, semestre): Vigente (desempeño insuficiente sin atender),
 * Atendida (ya tiene acción de mejora), Satisfactorio o datos insuficientes.
 *
 * La generación de la conclusión la dispara el recálculo de estadísticas de otro módulo; aquí
 * solo se consulta, sin generar ni modificar nada. «Crear acción de mejora» abre el registro de
 * RF-17; la conversión a evaluación (RF-18) todavía no existe.
 */
@Component({
  selector: 'app-estadisticas-page',
  imports: [AccionMejoraFormDialog, ConversionAccionMejoraDialog, ChipEstado, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estadisticas-page.html',
  styleUrl: './estadisticas-page.scss',
})
export class EstadisticasPage {
  private readonly asignaturaService = inject(AsignaturaService);
  private readonly resultadosService = inject(ResultadoAprendizajeService);
  private readonly semestreService = inject(SemestreService);
  private readonly conclusionService = inject(ConclusionService);
  private readonly accionMejoraService = inject(AccionMejoraService);

  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;
  protected readonly aviso = signal<Aviso | null>(null);

  private readonly refresco = refrescoAutomatico();

  // ── Materias ─────────────────────────────────────────────────────────
  protected readonly cargandoAsignaturas = signal(true);
  protected readonly errorAsignaturas = signal<MensajeError | null>(null);
  protected readonly asignaturas = signal<Asignatura[]>([]);
  protected readonly asignaturaId = signal('');

  // ── RA activos de la materia elegida ────────────────────────────────
  private readonly cargaRa = toSignal(
    toObservable(this.asignaturaId).pipe(
      switchMap((id) => {
        if (!id) {
          return of<CargaRa>({ estado: 'inactivo' });
        }
        return this.resultadosService.listarPorAsignatura(id).pipe(
          map((lista): CargaRa => ({ estado: 'listo', lista })),
          catchError((error: unknown) => of<CargaRa>({ estado: 'error', error: mensajeDeError(error) })),
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

  // ── Consulta de la conclusión ────────────────────────────────────────
  protected readonly consulta = signal<CargaConclusion>({ estado: 'inactivo' });
  protected readonly puedeConsultar = computed(
    () => this.asignaturaId() !== '' && this.resultadoAprendizajeId() !== '' && this.semestreId() !== '',
  );

  // ── Acciones de mejora del (RA, semestre) elegidos (RF-18) ─────────────
  private readonly recargaAcciones = signal(0);
  protected readonly cargaAcciones = signal<CargaAccionesMejora>({ estado: 'inactivo' });

  protected readonly accionesEstado = computed(() => this.cargaAcciones().estado);
  protected readonly accionesError = computed(() => {
    const carga = this.cargaAcciones();
    return carga.estado === 'error' ? carga.error : null;
  });
  protected readonly accionesMejora = computed(() => {
    const carga = this.cargaAcciones();
    return carga.estado === 'listo' ? carga.lista : [];
  });

  protected readonly dialogoConversionAbierto = signal(false);
  protected readonly accionEnConversion = signal<AccionMejora | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizadorAviso));
    this.cargarAsignaturas();
    this.cargarSemestres();

    combineLatest([
      toObservable(this.resultadoAprendizajeId),
      toObservable(this.semestreId),
      toObservable(this.recargaAcciones),
    ])
      .pipe(
        switchMap(([resultadoAprendizajeId, semestreId]) => {
          if (!resultadoAprendizajeId || !semestreId) {
            return of<CargaAccionesMejora>({ estado: 'inactivo' });
          }
          return this.accionMejoraService.listar({ resultadoAprendizajeId, semestreId }).pipe(
            map((lista): CargaAccionesMejora => ({ estado: 'listo', lista })),
            catchError((error: unknown) =>
              of<CargaAccionesMejora>({ estado: 'error', error: mensajeDeError(error) }),
            ),
            startWith<CargaAccionesMejora>({ estado: 'cargando' }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => this.cargaAcciones.set(carga));

    toObservable(this.refresco)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => {
        if (this.dialogoAbierto() || this.dialogoConversionAbierto()) {
          return;
        }
        this.refrescarConclusionEnSegundoPlano();
        this.refrescarAccionesEnSegundoPlano();
      });
  }

  /** Vuelve a consultar el estado sin mostrar "cargando" ni borrar lo que ya hay en pantalla. */
  private refrescarConclusionEnSegundoPlano(): void {
    if (!this.puedeConsultar() || this.consulta().estado === 'inactivo') {
      return;
    }
    this.conclusionService
      .consultarEstado(this.resultadoAprendizajeId(), this.semestreId())
      .subscribe({
        next: (resultado) => {
          const actual = this.consulta();
          if (actual.estado === 'listo' && JSON.stringify(actual.resultado) === JSON.stringify(resultado)) {
            return;
          }
          this.consulta.set({ estado: 'listo', resultado });
        },
        error: () => {
          // refresco en segundo plano: ante un fallo se conservan los datos previos sin avisar
        },
      });
  }

  /** Vuelve a cargar las acciones de mejora sin mostrar "cargando" ni borrar lo que ya hay en pantalla. */
  private refrescarAccionesEnSegundoPlano(): void {
    const resultadoAprendizajeId = this.resultadoAprendizajeId();
    const semestreId = this.semestreId();
    if (!resultadoAprendizajeId || !semestreId || this.cargaAcciones().estado === 'inactivo') {
      return;
    }
    this.accionMejoraService.listar({ resultadoAprendizajeId, semestreId }).subscribe({
      next: (lista) => {
        const actual = this.cargaAcciones();
        if (actual.estado === 'listo' && JSON.stringify(actual.lista) === JSON.stringify(lista)) {
          return;
        }
        this.cargaAcciones.set({ estado: 'listo', lista });
      },
      error: () => {
        // refresco en segundo plano: ante un fallo se conservan los datos previos sin avisar
      },
    });
  }

  protected cargarAsignaturas(): void {
    this.cargandoAsignaturas.set(true);
    this.errorAsignaturas.set(null);
    this.asignaturaService.listar().subscribe({
      next: (asignaturas) => {
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
    this.semestreService.listar().subscribe({
      next: (semestres) => {
        this.semestres.set(semestres);
        const activo = semestres.find((s) => s.estado === 'ACTIVO');
        if (activo) {
          this.semestreId.set(activo.id);
        }
        this.cargandoSemestres.set(false);
      },
      error: (error: unknown) => {
        this.errorSemestres.set(mensajeDeError(error));
        this.cargandoSemestres.set(false);
      },
    });
  }

  protected alCambiarAsignatura(evento: Event): void {
    this.asignaturaId.set((evento.target as HTMLSelectElement).value);
    this.resultadoAprendizajeId.set('');
    this.consulta.set({ estado: 'inactivo' });
  }

  protected alCambiarRa(evento: Event): void {
    this.resultadoAprendizajeId.set((evento.target as HTMLSelectElement).value);
    this.consulta.set({ estado: 'inactivo' });
  }

  protected alCambiarSemestre(evento: Event): void {
    this.semestreId.set((evento.target as HTMLSelectElement).value);
    this.consulta.set({ estado: 'inactivo' });
  }

  protected consultar(): void {
    if (!this.puedeConsultar()) {
      return;
    }
    this.consulta.set({ estado: 'cargando' });
    this.conclusionService
      .consultarEstado(this.resultadoAprendizajeId(), this.semestreId())
      .subscribe({
        next: (resultado) => this.consulta.set({ estado: 'listo', resultado }),
        error: (error: unknown) =>
          this.consulta.set({ estado: 'error', error: mensajeDeError(error) }),
      });
  }

  protected consultaEstado(): CargaConclusion['estado'] {
    return this.consulta().estado;
  }

  protected consultaError(): MensajeError | null {
    const consulta = this.consulta();
    return consulta.estado === 'error' ? consulta.error : null;
  }

  /** Resultado completo de RF-16 (estado + conclusión + cifras), cuando la consulta ya respondió. */
  protected consultaResultado(): ConclusionEstado | null {
    const consulta = this.consulta();
    return consulta.estado === 'listo' ? consulta.resultado : null;
  }

  protected consultaConclusion(): Conclusion | null {
    const consulta = this.consulta();
    return consulta.estado === 'listo' ? consulta.resultado.conclusion : null;
  }

  protected readonly dialogoAbierto = signal(false);

  protected crearAccionDeMejora(): void {
    this.dialogoAbierto.set(true);
  }

  protected alGuardarAccionMejora(): void {
    this.dialogoAbierto.set(false);
    this.mostrarAviso('Acción de mejora registrada correctamente.');
    this.consultar();
    this.recargaAcciones.update((valor) => valor + 1);
  }

  protected alCancelarAccionMejora(): void {
    this.dialogoAbierto.set(false);
  }

  protected abrirConversion(accion: AccionMejora): void {
    this.accionEnConversion.set(accion);
    this.dialogoConversionAbierto.set(true);
  }

  protected alConvertirAccionMejora(): void {
    this.dialogoConversionAbierto.set(false);
    this.mostrarAviso('Acción de mejora convertida en evaluación.');
    this.recargaAcciones.update((valor) => valor + 1);
  }

  protected alCancelarConversion(): void {
    this.dialogoConversionAbierto.set(false);
  }

  private mostrarAviso(texto: string, tono: Aviso['tono'] = 'ok'): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set({ texto, tono });
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }

  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  /** Cantidad de estudiantes en nivel Bajo o Medio (por debajo del nivel esperado). */
  protected debajoDelNivel(conclusion: Conclusion): number {
    return (conclusion.enNivelBajo ?? 0) + (conclusion.enNivelMedio ?? 0);
  }

  /** Redacta la comparación con el semestre anterior, o indica que es la primera conclusión del RA. */
  protected comparacionSemestreAnterior(conclusion: Conclusion): string {
    const anterior = conclusion.porcentajeSemestreAnterior;
    if (anterior == null) {
      return 'Es la primera vez que este RA genera una conclusión.';
    }
    const actual = conclusion.porcentajeInsuficiente;
    const semestre = conclusion.semestreAnteriorCodigo ?? '';
    if (actual > anterior) {
      return `Empeoró frente al semestre ${semestre} (${anterior}%).`;
    }
    if (actual < anterior) {
      return `Mejoró frente al semestre ${semestre} (${anterior}%), pero sigue por encima del umbral.`;
    }
    return `Se mantiene igual que en el semestre ${semestre} (${anterior}%).`;
  }
}
