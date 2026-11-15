import { DatePipe, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, PLATFORM_ID, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { ETIQUETA_ACCION } from '../../../auditoria/models/auditoria.model';
import { Semestre } from '../../../semestres/models/semestre.model';
import { SemestreService } from '../../../semestres/services/semestre.service';
import {
  ACCIONES_TRAZABILIDAD,
  conteoDe,
  ETIQUETA_GRUPO,
  FiltrosTrazabilidadUso,
  generarCsvActividadEstudiantes,
  generarCsvTrazabilidadUso,
  RolTrazabilidad,
  ROLES_TRAZABILIDAD,
  TrazabilidadUsoProfesor,
  TrazabilidadUsoReporte,
} from '../../models/trazabilidad-uso.model';
import { TrazabilidadUsoService } from '../../services/trazabilidad-uso.service';

export type VistaTrazabilidad = 'admin' | 'profesor';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'general'; reporte: TrazabilidadUsoReporte }
  | { estado: 'profesor'; reporte: TrazabilidadUsoProfesor }
  | { estado: 'error'; error: MensajeError };

/**
 * R7 – Trazabilidad de uso por rol. El administrador ve conteos por tipo de usuario (sin identificar
 * personas); el profesor ve su propia actividad y la de cada estudiante de sus asignaturas.
 */
@Component({
  selector: 'app-trazabilidad-uso-tab',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './trazabilidad-uso-tab.html',
  styleUrl: './trazabilidad-uso-tab.scss',
})
export class TrazabilidadUsoTab {
  private readonly servicio = inject(TrazabilidadUsoService);
  private readonly semestreService = inject(SemestreService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly vista = input.required<VistaTrazabilidad>();

  protected readonly acciones = ACCIONES_TRAZABILIDAD;
  protected readonly etiquetaAccion = ETIQUETA_ACCION;
  protected readonly etiquetaGrupo = ETIQUETA_GRUPO;
  protected readonly roles = ROLES_TRAZABILIDAD;
  protected readonly conteoDe = conteoDe;

  /** null = aún no se eligió: se usa el semestre activo. */
  protected readonly semestreId = signal<string | null>(null);
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly rol = signal<RolTrazabilidad | ''>('');

  protected readonly semestres = toSignal(
    this.semestreService.listar().pipe(catchError(() => of([] as Semestre[]))),
    { initialValue: null },
  );

  protected readonly semestreSeleccionadoId = computed(() => {
    const elegido = this.semestreId();
    if (elegido !== null) {
      return elegido;
    }
    return this.semestres()?.find((semestre) => semestre.estado === 'ACTIVO')?.id ?? '';
  });

  protected readonly semestreSeleccionado = computed(
    () => this.semestres()?.find((semestre) => semestre.id === this.semestreSeleccionadoId()) ?? null,
  );

  protected readonly filtros = computed<FiltrosTrazabilidadUso | null>(() => {
    if (this.semestres() === null) {
      return null;
    }
    return {
      semestreId: this.semestreSeleccionadoId() || undefined,
      desde: this.desde() || undefined,
      hasta: this.hasta() || undefined,
      rol: this.vista() === 'admin' ? this.rol() || undefined : undefined,
    };
  });

  private readonly intento = signal(0);

  protected readonly carga = toSignal<Carga, Carga>(
    toObservable(
      computed(() => ({ filtros: this.filtros(), vista: this.vista(), intento: this.intento() })),
    ).pipe(
      switchMap(({ filtros, vista }) => {
        if (filtros === null) {
          return of<Carga>({ estado: 'cargando' });
        }
        const peticion: Observable<Carga> =
          vista === 'admin'
            ? this.servicio
                .consultarGeneral(filtros)
                .pipe(map((reporte): Carga => ({ estado: 'general', reporte })))
            : this.servicio
                .consultarProfesor(filtros)
                .pipe(map((reporte): Carga => ({ estado: 'profesor', reporte })));
        return peticion.pipe(
          catchError((error) => of<Carga>({ estado: 'error', error: mensajeDeError(error) })),
          startWith<Carga>({ estado: 'cargando' }),
        );
      }),
    ),
    { initialValue: { estado: 'cargando' } },
  );

  protected readonly reporteGeneral = computed(() => {
    const actual = this.carga();
    return actual.estado === 'general' ? actual.reporte : null;
  });

  protected readonly reporteProfesor = computed(() => {
    const actual = this.carga();
    return actual.estado === 'profesor' ? actual.reporte : null;
  });

  protected readonly mayorTotalRol = computed(() =>
    Math.max(0, ...(this.reporteGeneral()?.porRol.map((fila) => fila.totalEventos) ?? [])),
  );

  protected readonly mayorIngresos = computed(() =>
    Math.max(0, ...(this.reporteProfesor()?.estudiantes.map((fila) => fila.ingresos) ?? [])),
  );

  protected cambiarSemestre(valor: string): void {
    this.semestreId.set(valor);
  }

  protected cambiarDesde(valor: string): void {
    this.desde.set(valor);
  }

  protected cambiarHasta(valor: string): void {
    this.hasta.set(valor);
  }

  protected cambiarRol(valor: string): void {
    this.rol.set(valor as RolTrazabilidad | '');
  }

  protected limpiarFechas(): void {
    this.desde.set('');
    this.hasta.set('');
  }

  protected reintentar(): void {
    this.intento.update((valor) => valor + 1);
  }

  protected totalAccion(accion: (typeof ACCIONES_TRAZABILIDAD)[number]): number {
    return (this.reporteGeneral()?.porRol ?? []).reduce(
      (suma, fila) => suma + conteoDe(fila.acciones, accion),
      0,
    );
  }

  protected exportarCsv(): void {
    const general = this.reporteGeneral();
    const profesor = this.reporteProfesor();
    if (general) {
      this.descargar(generarCsvTrazabilidadUso(general), 'reporte-trazabilidad-uso-por-rol.csv');
    } else if (profesor) {
      this.descargar(generarCsvActividadEstudiantes(profesor), 'reporte-actividad-estudiantes.csv');
    }
  }

  private descargar(contenido: string, nombre: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
