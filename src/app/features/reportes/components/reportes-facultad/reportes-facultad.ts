import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { SesionService } from '../../../../core/services/sesion';
import { Icono } from '../../../../shared/ui/icono/icono';
import { formatearNota, formatearPorcentaje } from '../../../estadisticas/models/nivel-logro-formato';
import { NivelLogroService } from '../../../estadisticas/services/nivel-logro.service';
import { Semestre } from '../../../semestres/models/semestre.model';
import { SemestreService } from '../../../semestres/services/semestre.service';
import {
  DatosReporteFacultad,
  ETIQUETA_NIVEL,
  ETIQUETA_SEMAFORO,
  FilaReporteFacultad,
  MIN_RA,
  NIVELES,
  NivelAgrupacion,
  VistaReporteFacultad,
  agrupar,
  resumenGeneral,
} from '../../models/reportes-facultad.model';
import { ReportesFacultadService } from '../../services/reportes-facultad.service';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; datos: DatosReporteFacultad }
  | { estado: 'error'; error: MensajeError };

interface Paso {
  id: string;
  nombre: string;
}

interface TextosVista {
  titulo: string;
  subtitulo: string;
  etiquetaRol: string;
}

const TEXTOS: Readonly<Record<VistaReporteFacultad, TextosVista>> = {
  ADMINISTRADOR: {
    titulo: 'Reportes por facultad',
    subtitulo: 'Comparativo institucional del logro de los RA, del ranking de facultades a cada materia',
    etiquetaRol: 'Vista institucional',
  },
  PROFESOR: {
    titulo: 'Reportes por facultad',
    subtitulo: 'Tus materias agrupadas por facultad y programa, con su nivel de logro',
    etiquetaRol: 'Vista de tus materias',
  },
  ESTUDIANTE: {
    titulo: 'Reportes por facultad',
    subtitulo: 'Tu desempeño en los RA de tus materias en curso, agrupado por facultad',
    etiquetaRol: 'Vista personal',
  },
};

const ETIQUETA_NIVEL_AGRUPACION: Readonly<Record<NivelAgrupacion, string>> = {
  FACULTAD: 'facultades',
  PROGRAMA: 'programas',
  ASIGNATURA: 'materias',
};

/**
 * «Reportes por facultad»: ranking de facultades por nivel de logro de sus RA, con semáforo y
 * distribución por nivel, que se puede abrir hasta programa y materia. El mismo tablero sirve a
 * los tres roles; lo que cambia es el alcance de los datos (lo aplica el backend) y qué
 * indicadores se muestran: el estudiante solo ve lo suyo.
 */
@Component({
  selector: 'app-reportes-facultad',
  imports: [Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes-facultad.html',
  styleUrl: './reportes-facultad.scss',
})
export class ReportesFacultad {
  private readonly servicio = inject(ReportesFacultadService);
  private readonly nivelLogro = inject(NivelLogroService);
  private readonly semestreService = inject(SemestreService);
  private readonly sesion = inject(SesionService);

  protected readonly vista: VistaReporteFacultad =
    this.sesion.rol() === 'estudiante'
      ? 'ESTUDIANTE'
      : this.sesion.rol() === 'profesor'
        ? 'PROFESOR'
        : 'ADMINISTRADOR';
  protected readonly textos = TEXTOS[this.vista];
  /** El estudiante entra por una ruta propia: la pantalla es una página completa, no una pestaña. */
  protected readonly esPagina = this.vista === 'ESTUDIANTE';
  /** Estudiantes en riesgo, acciones de mejora y materias con pocos RA no son del estudiante. */
  protected readonly institucional = this.vista !== 'ESTUDIANTE';

  protected readonly niveles = NIVELES;
  protected readonly etiquetaNivel = ETIQUETA_NIVEL;
  protected readonly etiquetaSemaforo = ETIQUETA_SEMAFORO;
  protected readonly minRa = MIN_RA;
  protected readonly formatearNota = formatearNota;
  protected readonly formatearPorcentaje = formatearPorcentaje;

  /** Catálogo de rangos del backend para clasificar los promedios. Sin él, el semáforo queda gris. */
  private readonly rangos = toSignal(
    this.nivelLogro.consultarCatalogo().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  /** El Profesor solo ve los semestres en los que tiene materias (Mantis 0000045). */
  protected readonly semestres = toSignal<Semestre[], Semestre[]>(
    !this.institucional
      ? of([])
      : (this.vista === 'PROFESOR'
          ? this.semestreService.listarMios()
          : this.semestreService.listar()
        ).pipe(catchError(() => of([] as Semestre[]))),
    { initialValue: [] },
  );

  protected readonly semestreId = signal('');
  private readonly intento = signal(0);

  protected readonly carga = toSignal<Carga, Carga>(
    toObservable(computed(() => ({ semestreId: this.semestreId(), intento: this.intento() }))).pipe(
      switchMap(({ semestreId }) =>
        (this.institucional
          ? this.servicio.cargarInstitucional(this.vista === 'PROFESOR', semestreId || undefined)
          : this.servicio.cargarEstudiante()
        ).pipe(
          map((datos): Carga => ({ estado: 'listo', datos })),
          catchError((error: unknown) => of<Carga>({ estado: 'error', error: mensajeDeError(error) })),
          startWith<Carga>({ estado: 'cargando' }),
        ),
      ),
    ),
    { initialValue: { estado: 'cargando' } },
  );

  private readonly datos = computed(() => {
    const carga = this.carga();
    return carga.estado === 'listo' ? carga.datos : null;
  });

  // ── Navegación facultad › programa › materia ─────────────────────────
  protected readonly facultad = signal<Paso | null>(null);
  protected readonly programa = signal<Paso | null>(null);

  protected readonly nivel = computed<NivelAgrupacion>(() =>
    this.programa() ? 'ASIGNATURA' : this.facultad() ? 'PROGRAMA' : 'FACULTAD',
  );
  protected readonly etiquetaNivelActual = computed(() => ETIQUETA_NIVEL_AGRUPACION[this.nivel()]);

  protected readonly filas = computed<FilaReporteFacultad[]>(() => {
    const datos = this.datos();
    if (!datos) {
      return [];
    }
    return agrupar(
      datos,
      this.nivel(),
      { facultadId: this.facultad()?.id, programaId: this.programa()?.id },
      this.rangos(),
    );
  });

  protected readonly resumen = computed(() => {
    const datos = this.datos();
    return datos ? resumenGeneral(datos, this.rangos()) : null;
  });

  protected readonly semestreCodigo = computed(() => this.datos()?.semestreCodigo ?? null);

  protected cambiarSemestre(valor: string): void {
    this.facultad.set(null);
    this.programa.set(null);
    this.semestreId.set(valor);
  }

  protected abrir(fila: FilaReporteFacultad): void {
    if (this.nivel() === 'FACULTAD') {
      this.facultad.set({ id: fila.id, nombre: fila.nombre });
    } else if (this.nivel() === 'PROGRAMA') {
      this.programa.set({ id: fila.id, nombre: fila.nombre });
    }
  }

  protected irAFacultades(): void {
    this.facultad.set(null);
    this.programa.set(null);
  }

  protected irAProgramas(): void {
    this.programa.set(null);
  }

  protected reintentar(): void {
    this.intento.update((n) => n + 1);
  }

  /** Ancho de cada tramo de la barra de distribución, en %. */
  protected ancho(fila: FilaReporteFacultad, clave: keyof FilaReporteFacultad['distribucion']): number {
    return fila.totalRa ? (fila.distribucion[clave] / fila.totalRa) * 100 : 0;
  }

  /** Texto alternativo de la barra: el color nunca va solo (RNF-21). */
  protected descripcionDistribucion(fila: FilaReporteFacultad): string {
    const partes = NIVELES.map((n) => `${ETIQUETA_NIVEL[n]}: ${fila.distribucion[n]}`);
    if (fila.distribucion.SIN_NIVEL) {
      partes.push(`Sin nivel: ${fila.distribucion.SIN_NIVEL}`);
    }
    return `Distribución de ${fila.totalRa} RA. ${partes.join(', ')}.`;
  }

  protected etiquetaAbrir(): string {
    return this.nivel() === 'FACULTAD' ? 'Ver programas' : 'Ver materias';
  }
}
