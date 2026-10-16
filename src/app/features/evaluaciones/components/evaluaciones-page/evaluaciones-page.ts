import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { DialogoConfirmacion } from '../../../../shared/components/dialogo-confirmacion/dialogo-confirmacion';
import { ChipEstado, VarianteChip } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { ResultadoAprendizaje } from '../../../resultadosaprendizaje/models/resultado-aprendizaje.model';
import { ResultadoAprendizajeService } from '../../../resultadosaprendizaje/services/resultado-aprendizaje.service';
import {
  AsignaturaOpcion,
  EstadoEvaluacion,
  Evaluacion,
  EvaluacionesRaResumen,
  SemestreOpcion,
  TAMANOS_PAGINA,
  enCentesimas,
  esSemestreEnCurso,
  formatearFecha,
  formatearPorcentaje,
} from '../../models/evaluacion.model';
import { CatalogosEvaluacionService } from '../../services/catalogos-evaluacion.service';
import { EvaluacionService } from '../../services/evaluacion.service';
import {
  EvaluacionFormDialog,
  ResultadoFormularioEvaluacion,
} from '../evaluacion-form-dialog/evaluacion-form-dialog';
import { PaginacionTabla } from '../paginacion-tabla/paginacion-tabla';

interface Presentacion {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
}

/** Ícono + texto + color: el color nunca va solo (RNF-21). */
export const PRESENTACION_EVALUACION: Readonly<Record<EstadoEvaluacion, Presentacion>> = {
  ACTIVA: { etiqueta: 'Activa', variante: 'ok', icono: 'check' },
  INACTIVA: { etiqueta: 'Inactiva', variante: 'neutro', icono: 'prohibido' },
};

/** Por qué una acción no está disponible; se muestra en el tooltip del botón. */
export const MOTIVO_SIN_DISPONIBLE =
  'Las evaluaciones activas ya suman el 100 %: inactiva una o reduce su porcentaje.';
export const MOTIVO_REACTIVAR =
  'Su porcentaje supera lo disponible del RA: libera porcentaje antes de reactivarla.';

/** Fila de la tabla con los textos ya preparados para la vista. */
interface FilaEvaluacion {
  evaluacion: Evaluacion;
  fecha: string;
  porcentaje: string;
  puedeReactivar: boolean;
}

type Carga<T> =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; valor: T }
  | { estado: 'error'; error: MensajeError };

type Confirmacion = { tipo: 'inactivar' | 'reactivar'; evaluacion: Evaluacion };

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

const DURACION_AVISO_MS = 6000;

/** Envuelve una consulta en el ciclo cargando → listo | error. */
function cargar<T>(fuente: Observable<T>): Observable<Carga<T>> {
  return fuente.pipe(
    map((valor): Carga<T> => ({ estado: 'listo', valor })),
    catchError((error: unknown) => of<Carga<T>>({ estado: 'error', error: mensajeDeError(error) })),
    startWith<Carga<T>>({ estado: 'cargando' }),
  );
}

/**
 * RF-10 / RF-11: evaluaciones de un RA (vista del profesor). Se elige materia ACTIVA → RA ACTIVO →
 * semestre (por defecto el que está en curso) y se listan sus evaluaciones con el porcentaje
 * acumulado de las activas, que no puede superar el 100 %.
 *
 * Solo se crean y modifican evaluaciones del semestre en curso; las de otros semestres son de
 * consulta. Los botones reflejan las reglas del backend para no ofrecer acciones que fallarían,
 * pero quien decide es el backend y su mensaje se muestra siempre.
 *
 * Las consultas encadenadas usan `switchMap`: si se cambia de materia, RA o semestre antes de que
 * llegue la respuesta, la anterior se descarta.
 */
@Component({
  selector: 'app-evaluaciones-page',
  imports: [ChipEstado, DialogoConfirmacion, EvaluacionFormDialog, Icono, PaginacionTabla],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evaluaciones-page.html',
  styleUrl: './evaluaciones-page.scss',
})
export class EvaluacionesPage {
  private readonly catalogos = inject(CatalogosEvaluacionService);
  private readonly resultadosService = inject(ResultadoAprendizajeService);
  private readonly evaluacionService = inject(EvaluacionService);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  protected readonly presentacion = PRESENTACION_EVALUACION;
  protected readonly motivoSinDisponible = MOTIVO_SIN_DISPONIBLE;
  protected readonly motivoReactivar = MOTIVO_REACTIVAR;
  protected readonly tamanos = TAMANOS_PAGINA;

  // ── Catálogos de los selectores ─────────────────────────────────────
  protected readonly cargandoCatalogos = signal(true);
  protected readonly errorCatalogos = signal<MensajeError | null>(null);
  protected readonly asignaturas = signal<AsignaturaOpcion[]>([]);
  protected readonly semestres = signal<SemestreOpcion[]>([]);

  protected readonly asignaturaId = signal('');
  protected readonly raId = signal('');
  protected readonly semestreId = signal('');

  protected readonly semestreEnCurso = computed(
    () => this.semestres().find((s) => esSemestreEnCurso(s)) ?? null,
  );
  protected readonly semestre = computed(
    () => this.semestres().find((s) => s.id === this.semestreId()) ?? null,
  );
  /** Las evaluaciones de un semestre que no está en curso solo se consultan. */
  protected readonly soloLectura = computed(
    () => !this.semestre() || this.semestre()?.id !== this.semestreEnCurso()?.id,
  );

  // ── RA activos de la materia ────────────────────────────────────────
  /** Se incrementa para volver a consultar los RA de la misma materia. */
  private readonly recargaRa = signal(0);

  private readonly cargaRa = toSignal(
    toObservable(computed(() => ({ id: this.asignaturaId(), recarga: this.recargaRa() }))).pipe(
      switchMap(({ id }) =>
        id
          ? cargar(
              this.resultadosService
                .listarPorAsignatura(id)
                .pipe(map((lista) => lista.filter((ra) => ra.estado === 'ACTIVO'))),
            )
          : of<Carga<ResultadoAprendizaje[]>>({ estado: 'inactivo' }),
      ),
    ),
    { initialValue: { estado: 'inactivo' } as Carga<ResultadoAprendizaje[]> },
  );
  protected readonly cargandoRa = computed(() => this.cargaRa().estado === 'cargando');
  protected readonly errorRa = computed(() => {
    const carga = this.cargaRa();
    return carga.estado === 'error' ? carga.error : null;
  });
  protected readonly resultados = computed(() => {
    const carga = this.cargaRa();
    return carga.estado === 'listo' ? carga.valor : [];
  });
  protected readonly ra = computed(
    () => this.resultados().find((r) => r.id === this.raId()) ?? null,
  );

  // ── Evaluaciones del RA en el semestre ──────────────────────────────
  /** Se incrementa para volver a consultar las evaluaciones con los mismos filtros. */
  private readonly recarga = signal(0);

  private readonly cargaResumen = toSignal(
    toObservable(
      computed(() => ({
        raId: this.ra()?.id ?? '',
        semestreId: this.semestreId(),
        recarga: this.recarga(),
      })),
    ).pipe(
      switchMap(({ raId, semestreId }) =>
        raId && semestreId
          ? cargar(this.evaluacionService.listarPorResultadoAprendizaje(raId, semestreId))
          : of<Carga<EvaluacionesRaResumen>>({ estado: 'inactivo' }),
      ),
    ),
    { initialValue: { estado: 'inactivo' } as Carga<EvaluacionesRaResumen> },
  );
  protected readonly cargandoResumen = computed(() => this.cargaResumen().estado === 'cargando');
  protected readonly errorResumen = computed(() => {
    const carga = this.cargaResumen();
    return carga.estado === 'error' ? carga.error : null;
  });
  protected readonly resumen = computed(() => {
    const carga = this.cargaResumen();
    return carga.estado === 'listo' ? carga.valor : null;
  });

  protected readonly asignado = computed(() => this.resumen()?.porcentajeAsignado ?? 0);
  protected readonly disponible = computed(() => this.resumen()?.porcentajeDisponible ?? 0);
  protected readonly textoAsignado = computed(() => formatearPorcentaje(this.asignado()));
  protected readonly textoDisponible = computed(() => formatearPorcentaje(this.disponible()));
  protected readonly completo = computed(() => enCentesimas(this.disponible()) <= 0);
  /** Ancho de la barra, acotado a 0–100 por si llegara un dato fuera de rango. */
  protected readonly anchoBarra = computed(() => Math.min(100, Math.max(0, this.asignado())));

  protected readonly puedeRegistrar = computed(() => !this.soloLectura() && !this.completo());

  protected readonly filas = computed<FilaEvaluacion[]>(() =>
    (this.resumen()?.evaluaciones ?? []).map((evaluacion) => ({
      evaluacion,
      fecha: formatearFecha(evaluacion.fechaTentativa),
      porcentaje: formatearPorcentaje(evaluacion.porcentaje),
      puedeReactivar: enCentesimas(evaluacion.porcentaje) <= enCentesimas(this.disponible()),
    })),
  );

  // ── Paginación ──────────────────────────────────────────────────────
  private readonly pagina = signal(1);
  protected readonly tamanoPagina = signal(TAMANOS_PAGINA[0]);
  private readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filas().length / this.tamanoPagina())),
  );
  /** Si la lista se acorta (p. ej. tras recargar), la página se ajusta a la última que exista. */
  protected readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));
  protected readonly filasPagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.tamanoPagina();
    return this.filas().slice(inicio, inicio + this.tamanoPagina());
  });

  // ── Diálogos y avisos ───────────────────────────────────────────────
  protected readonly formAbierto = signal(false);
  protected readonly enEdicion = signal<Evaluacion | null>(null);
  protected readonly confirmacion = signal<Confirmacion | null>(null);
  protected readonly procesandoConfirmacion = signal(false);
  protected readonly errorConfirmacion = signal<string | null>(null);
  protected readonly aviso = signal<Aviso | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizadorAviso));
    this.cargarCatalogos();
  }

  protected cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(null);
    forkJoin({
      asignaturas: this.catalogos.listarAsignaturasActivas(),
      semestres: this.catalogos.listarSemestres(),
    }).subscribe({
      next: ({ asignaturas, semestres }) => {
        this.asignaturas.set(asignaturas);
        this.semestres.set(semestres);
        // Por defecto, el semestre en curso; sin él, el más reciente (solo consulta).
        const porDefecto = semestres.find((s) => esSemestreEnCurso(s)) ?? semestres[0];
        this.semestreId.set(porDefecto?.id ?? '');
        this.cargandoCatalogos.set(false);
      },
      error: (error: unknown) => {
        this.errorCatalogos.set(mensajeDeError(error));
        this.cargandoCatalogos.set(false);
      },
    });
  }

  protected alCambiarAsignatura(evento: Event): void {
    this.asignaturaId.set((evento.target as HTMLSelectElement).value);
    this.raId.set('');
    this.pagina.set(1);
  }

  protected alCambiarRa(evento: Event): void {
    this.raId.set((evento.target as HTMLSelectElement).value);
    this.pagina.set(1);
  }

  protected alCambiarSemestre(evento: Event): void {
    this.semestreId.set((evento.target as HTMLSelectElement).value);
    this.pagina.set(1);
  }

  protected recargarRa(): void {
    this.recargaRa.update((n) => n + 1);
  }

  protected recargarEvaluaciones(): void {
    this.recarga.update((n) => n + 1);
  }

  protected irAPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  protected cambiarTamano(tamano: number): void {
    this.tamanoPagina.set(tamano);
    this.pagina.set(1);
  }

  protected etiquetaSemestre(semestre: SemestreOpcion): string {
    return semestre.id === this.semestreEnCurso()?.id
      ? `${semestre.codigo} · en curso`
      : `${semestre.codigo} · solo consulta`;
  }

  // ── Registrar y modificar ───────────────────────────────────────────
  protected abrirRegistro(): void {
    if (!this.puedeRegistrar()) {
      return;
    }
    this.enEdicion.set(null);
    this.formAbierto.set(true);
  }

  protected abrirEdicion(evaluacion: Evaluacion): void {
    if (this.soloLectura() || evaluacion.estado !== 'ACTIVA') {
      return;
    }
    this.enEdicion.set(evaluacion);
    this.formAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.formAbierto.set(false);
  }

  protected alGuardar({ evaluacion, modo }: ResultadoFormularioEvaluacion): void {
    this.formAbierto.set(false);
    this.mostrarAviso(
      modo === 'crear'
        ? `Evaluación «${evaluacion.nombre}» registrada.`
        : `Evaluación «${evaluacion.nombre}» actualizada.`,
    );
    this.recargarEvaluaciones();
  }

  // ── Inactivar y reactivar ───────────────────────────────────────────
  protected pedirInactivar(evaluacion: Evaluacion): void {
    if (!this.soloLectura()) {
      this.abrirConfirmacion({ tipo: 'inactivar', evaluacion });
    }
  }

  protected pedirReactivar(fila: FilaEvaluacion): void {
    if (!this.soloLectura() && fila.puedeReactivar) {
      this.abrirConfirmacion({ tipo: 'reactivar', evaluacion: fila.evaluacion });
    }
  }

  protected cancelarConfirmacion(): void {
    this.confirmacion.set(null);
  }

  protected confirmar(): void {
    const confirmacion = this.confirmacion();
    if (!confirmacion) {
      return;
    }
    const { tipo, evaluacion } = confirmacion;
    this.procesandoConfirmacion.set(true);
    this.errorConfirmacion.set(null);

    const peticion =
      tipo === 'inactivar'
        ? this.evaluacionService.inactivar(evaluacion.id)
        : this.evaluacionService.reactivar(evaluacion.id);

    peticion.subscribe({
      next: () => {
        this.procesandoConfirmacion.set(false);
        this.confirmacion.set(null);
        this.mostrarAviso(
          `Evaluación «${evaluacion.nombre}» ${tipo === 'inactivar' ? 'inactivada' : 'reactivada'}.`,
        );
        this.recargarEvaluaciones();
      },
      error: (error: unknown) => {
        this.procesandoConfirmacion.set(false);
        this.errorConfirmacion.set(mensajeDeError(error).mensaje);
      },
    });
  }

  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  private abrirConfirmacion(confirmacion: Confirmacion): void {
    this.errorConfirmacion.set(null);
    this.confirmacion.set(confirmacion);
  }

  private mostrarAviso(texto: string): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set({ texto, tono: 'ok' });
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }
}
