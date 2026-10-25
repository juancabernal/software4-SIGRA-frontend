import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, combineLatest, map, of, skip, startWith, switchMap } from 'rxjs';

import { formatearFechaHora } from '../../../../core/util/formato-fecha';
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
import { presentarRendimiento } from '../../../resultadosaprendizaje/components/resultados-aprendizaje-page/resultados-aprendizaje-page';
import {
  RendimientoAsignatura,
  ResultadoAprendizaje,
  EstadoResultadoAprendizaje,
} from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { marcarRefrescoSilencioso } from '../../../resultadosaprendizaje/services/consulta-con-refresco';
import { ResultadoAprendizajeService } from '../../../resultadosaprendizaje/services/resultado-aprendizaje.service';
import { Semestre } from '../../../semestres/models/semestre.model';
import { SemestreService } from '../../../semestres/services/semestre.service';
import { Conclusion, ConclusionEstado } from '../../models/conclusion.model';
import { EstadisticasResultadoAprendizaje, RangoNivelLogro } from '../../models/nivel-logro.model';
import { ConclusionService } from '../../services/conclusion.service';
import { NivelLogroService } from '../../services/nivel-logro.service';
import { NivelLogroResumen } from '../nivel-logro-resumen/nivel-logro-resumen';

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

type CargaEstadisticas =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; estadisticas: EstadisticasResultadoAprendizaje }
  | { estado: 'error'; error: MensajeError };

type CargaRendimiento =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; datos: RendimientoAsignatura }
  | { estado: 'error' };

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
 * Vista de estadísticas del profesor. Se elige materia → RA activo → semestre y «Consultar» trae,
 * en paralelo y con estados independientes:
 *
 * 1. RF-14 / RF-15: nivel de logro — totales, promedio y distribución por los 4 niveles.
 * 2. RF-16: el estado de la conclusión de ese (RA, semestre): Vigente (desempeño insuficiente sin
 *    atender), Atendida (ya tiene acción de mejora), Satisfactorio o datos insuficientes.
 * 3. RF-17 / RF-18: las acciones de mejora y su conversión en evaluación.
 *
 * Consultar es de solo lectura. «Recalcular» fuerza el cálculo del nivel de logro (en operación
 * normal lo dispara el registro de calificaciones), que a su vez genera la conclusión de RF-16;
 * por eso después se vuelve a consultar la conclusión.
 */
@Component({
  selector: 'app-estadisticas-page',
  imports: [
    AccionMejoraFormDialog,
    ConversionAccionMejoraDialog,
    ChipEstado,
    Icono,
    NivelLogroResumen,
  ],
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
  private readonly nivelLogroService = inject(NivelLogroService);

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

  // ── Rendimiento del RA elegido en el semestre elegido ────
  private readonly recargaRendimiento = signal(0);
  private readonly refrescoSilencioso = signal(0);

  private readonly disparoRendimiento = computed(() => ({
    id: this.asignaturaId(),
    raId: this.resultadoAprendizajeId(),
    semestreId: this.semestreId(),
    recarga: this.recargaRendimiento(),
    refresco: this.refrescoSilencioso(),
  }));

  /**
   * Con materia, RA y semestre elegidos se muestra el rendimiento de ese RA, sin pedir «Consultar»:
   * el profesor lo necesita para decidir si atenderlo con una acción de mejora. El backend calcula
   * los RA de la materia; aquí solo se muestra el elegido. Un fallo no afecta al resto de la pantalla.
   */
  private readonly cargaRendimiento = toSignal(
    toObservable(this.disparoRendimiento).pipe(
      marcarRefrescoSilencioso(),
      switchMap(({ id, raId, semestreId, silencioso }) => {
        if (!id || !raId || !semestreId) {
          return of<CargaRendimiento>({ estado: 'inactivo' });
        }
        const consulta = this.resultadosService
          .consultarRendimiento(id, semestreId)
          .pipe(map((datos): CargaRendimiento => ({ estado: 'listo', datos })));
        return silencioso
          ? consulta.pipe(catchError(() => EMPTY))
          : consulta.pipe(
              catchError(() => of<CargaRendimiento>({ estado: 'error' })),
              startWith<CargaRendimiento>({ estado: 'cargando' }),
            );
      }),
    ),
    { initialValue: { estado: 'inactivo' } as CargaRendimiento },
  );

  protected readonly mostrarRendimiento = computed(
    () => this.puedeConsultar(),
  );
  protected readonly rendimientoCargando = computed(
    () => this.cargaRendimiento().estado === 'cargando',
  );
  protected readonly rendimientoConError = computed(
    () => this.cargaRendimiento().estado === 'error',
  );
  protected readonly filasRendimiento = computed(() => {
    const carga = this.cargaRendimiento();
    const elegido = this.resultadoAprendizajeId();
    return (carga.estado === 'listo' ? carga.datos.resultados : [])
      .filter((r) => r.resultadoAprendizajeId === elegido)
      .map((r) => ({
      id: r.resultadoAprendizajeId,
      codigo: r.codigo,
      presentacion: presentarRendimiento(r),
    }));
  });

  // ── Consulta de la conclusión ────────────────────────────────────────
  protected readonly consulta = signal<CargaConclusion>({ estado: 'inactivo' });
  protected readonly puedeConsultar = computed(
    () =>
      this.asignaturaId() !== '' &&
      this.resultadoAprendizajeId() !== '' &&
      this.semestreId() !== '',
  );

  // ── Nivel de logro y estadísticas (RF-14, RF-15) ──────────────────────
  protected readonly cargaEstadisticas = signal<CargaEstadisticas>({ estado: 'inactivo' });
  protected readonly recalculando = signal(false);
  /** Catálogo de rangos; si falla, la distribución se muestra igual, sin la leyenda de rangos. */
  protected readonly rangos = signal<RangoNivelLogro[]>([]);

  protected readonly estadisticas = computed(() => {
    const carga = this.cargaEstadisticas();
    return carga.estado === 'listo' ? carga.estadisticas : null;
  });
  protected readonly errorEstadisticas = computed(() => {
    const carga = this.cargaEstadisticas();
    return carga.estado === 'error' ? carga.error : null;
  });

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
    this.cargarCatalogoNiveles();

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
        this.refrescoSilencioso.update((n) => n + 1);
        this.refrescarEstadisticasEnSegundoPlano();
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
          if (
            actual.estado === 'listo' &&
            JSON.stringify(actual.resultado) === JSON.stringify(resultado)
          ) {
            return;
          }
          this.consulta.set({ estado: 'listo', resultado });
        },
        error: () => {
          // refresco en segundo plano: ante un fallo se conservan los datos previos sin avisar
        },
      });
  }

  /** Vuelve a consultar el nivel de logro sin mostrar "cargando" ni borrar lo que ya hay en pantalla. */
  private refrescarEstadisticasEnSegundoPlano(): void {
    if (
      !this.puedeConsultar() ||
      this.cargaEstadisticas().estado !== 'listo' ||
      this.recalculando()
    ) {
      return;
    }
    this.nivelLogroService
      .consultarEstadisticas(this.resultadoAprendizajeId(), this.semestreId())
      .subscribe({
        next: (estadisticas) => {
          const actual = this.estadisticas();
          if (actual && JSON.stringify(actual) === JSON.stringify(estadisticas)) {
            return;
          }
          this.cargaEstadisticas.set({ estado: 'listo', estadisticas });
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

  private cargarCatalogoNiveles(): void {
    this.nivelLogroService.consultarCatalogo().subscribe({
      next: (rangos) => this.rangos.set(rangos),
      error: () => {
        // sin catálogo solo se pierde la leyenda de rangos; la distribución se muestra igual
      },
    });
  }

  /** Al cambiar la selección se descarta lo consultado, para no mostrar datos de otro RA. */
  private reiniciarConsulta(): void {
    this.consulta.set({ estado: 'inactivo' });
    this.cargaEstadisticas.set({ estado: 'inactivo' });
  }

  protected alCambiarAsignatura(evento: Event): void {
    this.asignaturaId.set((evento.target as HTMLSelectElement).value);
    this.resultadoAprendizajeId.set('');
    this.reiniciarConsulta();
  }

  protected alCambiarRa(evento: Event): void {
    this.resultadoAprendizajeId.set((evento.target as HTMLSelectElement).value);
    this.reiniciarConsulta();
  }

  protected alCambiarSemestre(evento: Event): void {
    this.semestreId.set((evento.target as HTMLSelectElement).value);
    this.reiniciarConsulta();
  }

  /** Consulta a la vez el nivel de logro y la conclusión; cada sección carga y falla por su cuenta. */
  protected consultar(): void {
    if (!this.puedeConsultar()) {
      return;
    }
    this.consultarEstadisticas();
    this.consultarConclusion();
    this.recargaRendimiento.update((n) => n + 1);
  }

  protected consultarEstadisticas(): void {
    if (!this.puedeConsultar()) {
      return;
    }
    this.cargaEstadisticas.set({ estado: 'cargando' });
    this.nivelLogroService
      .consultarEstadisticas(this.resultadoAprendizajeId(), this.semestreId())
      .subscribe({
        next: (estadisticas) => this.cargaEstadisticas.set({ estado: 'listo', estadisticas }),
        error: (error: unknown) =>
          this.cargaEstadisticas.set({ estado: 'error', error: mensajeDeError(error) }),
      });
  }

  /**
   * Fuerza el recálculo del nivel de logro. La respuesta trae las estadísticas nuevas; la
   * conclusión se vuelve a consultar porque el recálculo pudo generarla o cambiarla (RF-16).
   */
  protected recalcular(): void {
    if (!this.puedeConsultar() || this.recalculando()) {
      return;
    }
    this.recalculando.set(true);
    this.nivelLogroService.recalcular(this.resultadoAprendizajeId(), this.semestreId()).subscribe({
      next: (respuesta) => {
        this.recalculando.set(false);
        this.cargaEstadisticas.set({ estado: 'listo', estadisticas: respuesta.estadisticas });
        this.consultarConclusion();
        this.recargaRendimiento.update((n) => n + 1);
        this.mostrarAviso(
          respuesta.conclusion?.generada
            ? 'Nivel de logro recalculado. Se generó una conclusión de desempeño insuficiente.'
            : 'Nivel de logro recalculado correctamente.',
        );
      },
      error: (error: unknown) => {
        this.recalculando.set(false);
        this.mostrarAviso(mensajeDeError(error).mensaje, 'error');
      },
    });
  }

  protected consultarConclusion(): void {
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
  protected readonly accionEnEdicion = signal<AccionMejora | null>(null);

  protected crearAccionDeMejora(): void {
    this.accionEnEdicion.set(null);
    this.dialogoAbierto.set(true);
  }

  protected editarAccionMejora(accion: AccionMejora): void {
    this.accionEnEdicion.set(accion);
    this.dialogoAbierto.set(true);
  }

  protected alGuardarAccionMejora(): void {
    const editando = this.accionEnEdicion() !== null;
    this.dialogoAbierto.set(false);
    this.accionEnEdicion.set(null);
    this.mostrarAviso(
      editando
        ? 'Acción de mejora actualizada correctamente.'
        : 'Acción de mejora registrada correctamente.',
    );
    this.consultarConclusion();
    this.recargaAcciones.update((valor) => valor + 1);
  }

  protected alCancelarAccionMejora(): void {
    this.dialogoAbierto.set(false);
    this.accionEnEdicion.set(null);
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

  protected formatearFecha(fecha: string | null | undefined): string {
    return formatearFechaHora(fecha);
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
