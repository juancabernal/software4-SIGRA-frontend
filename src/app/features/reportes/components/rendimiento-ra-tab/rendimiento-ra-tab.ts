import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { SesionService } from '../../../../core/services/sesion';
import { BadgeNivelLogro } from '../../../../shared/ui/badge-nivel-logro/badge-nivel-logro';
import { OpcionFacultad, facultadesDe } from '../../../../shared/filtros/filtro-por-facultad';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { AsignaturaService } from '../../../asignaturas/services/asignatura.service';
import { Facultad } from '../../../facultades/models/facultad.model';
import { FacultadService } from '../../../facultades/services/facultad.service';
import { formatearNota, formatearPorcentaje } from '../../../estadisticas/models/nivel-logro-formato';
import { SemestreService } from '../../../semestres/services/semestre.service';
import {
  DistribucionNivel,
  FiltrosRendimientoRa,
  RendimientoRaReporte,
  badgeDeRa,
} from '../../models/rendimiento-ra.model';
import { ReporteService } from '../../services/reporte.service';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; reporte: RendimientoRaReporte }
  | { estado: 'error'; error: MensajeError };

const NIVELES: readonly DistribucionNivel['nivel'][] = ['BAJO', 'MEDIO', 'ALTO', 'SOBRESALIENTE'];

/** Pestaña R1: rendimiento académico por RA y asignatura. */
@Component({
  selector: 'app-rendimiento-ra-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeNivelLogro],
  templateUrl: './rendimiento-ra-tab.html',
  styleUrl: './rendimiento-ra-tab.scss',
})
export class RendimientoRaTab {
  private readonly reportes = inject(ReporteService);
  private readonly asignaturaService = inject(AsignaturaService);
  private readonly semestreService = inject(SemestreService);
  private readonly sesion = inject(SesionService);
  private readonly facultadService = inject(FacultadService);

  protected readonly niveles = NIVELES;
  protected readonly badgeDeRa = badgeDeRa;
  protected readonly formatearNota = formatearNota;
  protected readonly formatearPorcentaje = formatearPorcentaje;

  protected readonly semestreId = signal('');
  protected readonly facultadId = signal('');
  protected readonly programaId = signal('');
  protected readonly asignaturaId = signal('');

  protected readonly semestres = toSignal(
    this.semestreService.listar().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  private readonly asignaturas = toSignal<Asignatura[], Asignatura[]>(
    (this.sesion.rol() === 'profesor'
      ? this.asignaturaService.misAsignaturas()
      : this.asignaturaService.listar()
    ).pipe(catchError(() => of([] as Asignatura[]))),
    { initialValue: [] },
  );

  protected readonly esProfesor = this.sesion.rol() === 'profesor';

  /** El Administrador toma las facultades de GET /facultades; el Profesor no puede consultarlo. */
  private readonly facultadesCatalogo = toSignal(
    this.esProfesor
      ? of([] as Facultad[])
      : this.facultadService.listar().pipe(catchError(() => of([] as Facultad[]))),
    { initialValue: [] as Facultad[] },
  );

  /** Opciones de «Facultad»: el catálogo para el Administrador, las de sus asignaturas para el Profesor. */
  protected readonly facultades = computed<OpcionFacultad[]>(() =>
    this.esProfesor
      ? facultadesDe(this.asignaturas())
      : this.facultadesCatalogo().map((f) => ({ id: f.id, nombre: f.nombre })),
  );

  /** Programas de las asignaturas visibles, acotados a la facultad elegida. */
  protected readonly programas = computed(() => {
    const facultad = this.facultadId();
    const porId = new Map<string, string>();
    for (const asignatura of this.asignaturas()) {
      if (!facultad || asignatura.facultadId === facultad) {
        porId.set(asignatura.programaId, asignatura.programaNombre);
      }
    }
    return [...porId].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  protected readonly asignaturasDelPrograma = computed(() => {
    const facultad = this.facultadId();
    const programa = this.programaId();
    return this.asignaturas()
      .filter((a) => (!facultad || a.facultadId === facultad) && (!programa || a.programaId === programa))
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  });

  private readonly filtros = computed<FiltrosRendimientoRa>(() => ({
    semestreId: this.semestreId() || undefined,
    facultadId: this.facultadId() || undefined,
    programaId: this.programaId() || undefined,
    asignaturaId: this.asignaturaId() || undefined,
  }));
  private readonly intento = signal(0);

  protected readonly carga = toSignal<Carga, Carga>(
    toObservable(computed(() => ({ filtros: this.filtros(), intento: this.intento() }))).pipe(
      switchMap(({ filtros }) =>
        this.reportes.rendimientoRa(filtros).pipe(
          map((reporte): Carga => ({ estado: 'listo', reporte })),
          catchError((error) => of<Carga>({ estado: 'error', error: mensajeDeError(error) })),
          startWith<Carga>({ estado: 'cargando' }),
        ),
      ),
    ),
    { initialValue: { estado: 'cargando' } },
  );

  protected cambiarSemestre(valor: string): void {
    this.semestreId.set(valor);
  }

  /** Al cambiar de facultad se descartan el programa y la asignatura que no pertenecen a ella. */
  protected cambiarFacultad(valor: string): void {
    this.facultadId.set(valor);
    if (!valor) {
      return;
    }
    const delPrograma = this.asignaturas().find((a) => a.programaId === this.programaId());
    if (delPrograma && delPrograma.facultadId !== valor) {
      this.programaId.set('');
    }
    const asignatura = this.asignaturas().find((a) => a.id === this.asignaturaId());
    if (asignatura && asignatura.facultadId !== valor) {
      this.asignaturaId.set('');
    }
  }

  protected cambiarPrograma(valor: string): void {
    this.programaId.set(valor);
    const asignatura = this.asignaturas().find((a) => a.id === this.asignaturaId());
    if (valor && asignatura && asignatura.programaId !== valor) {
      this.asignaturaId.set('');
    }
  }

  protected cambiarAsignatura(valor: string): void {
    this.asignaturaId.set(valor);
  }

  protected limpiarFiltros(): void {
    this.facultadId.set('');
    this.semestreId.set('');
    this.programaId.set('');
    this.asignaturaId.set('');
  }

  protected reintentar(): void {
    this.intento.update((n) => n + 1);
  }

  protected hayFiltros(): boolean {
    return !!(
      this.semestreId() ||
      this.facultadId() ||
      this.programaId() ||
      this.asignaturaId()
    );
  }

  protected distribucionDe(
    distribucion: DistribucionNivel[],
    nivel: DistribucionNivel['nivel'],
  ): DistribucionNivel | undefined {
    return distribucion.find((d) => d.nivel === nivel);
  }
}
