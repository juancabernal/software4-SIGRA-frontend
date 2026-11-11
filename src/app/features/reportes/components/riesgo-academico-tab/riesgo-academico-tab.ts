import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { SesionService } from '../../../../core/services/sesion';
import { BadgeNivelLogro } from '../../../../shared/ui/badge-nivel-logro/badge-nivel-logro';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import { Asignatura } from '../../../asignaturas/models/asignatura.model';
import { AsignaturaService } from '../../../asignaturas/services/asignatura.service';
import { formatearNota } from '../../../estadisticas/models/nivel-logro-formato';
import { Facultad } from '../../../facultades/models/facultad.model';
import { FacultadService } from '../../../facultades/services/facultad.service';
import { Programa } from '../../../programas/models/programa.model';
import { ProgramaService } from '../../../programas/services/programa.service';
import { SemestreService } from '../../../semestres/services/semestre.service';
import {
  FiltrosRiesgoAcademico,
  RiesgoAcademicoReporte,
  badgeDeRaInsuficiente,
  chipSeveridad,
} from '../../models/riesgo-academico.model';
import { ReporteService } from '../../services/reporte.service';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; reporte: RiesgoAcademicoReporte }
  | { estado: 'error'; error: MensajeError };

const UMBRALES = [
  { valor: 1, etiqueta: '≥ 1 RA no alcanzado' },
  { valor: 2, etiqueta: '≥ 2 RA no alcanzados' },
  { valor: 3, etiqueta: '≥ 3 RA no alcanzados' },
] as const;

/** Pestaña R6: estudiantes con RA no alcanzados (riesgo académico). */
@Component({
  selector: 'app-riesgo-academico-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeNivelLogro, ChipEstado],
  templateUrl: './riesgo-academico-tab.html',
  styleUrl: './riesgo-academico-tab.scss',
})
export class RiesgoAcademicoTab {
  private readonly reportes = inject(ReporteService);
  private readonly asignaturaService = inject(AsignaturaService);
  private readonly facultadService = inject(FacultadService);
  private readonly programaService = inject(ProgramaService);
  private readonly semestreService = inject(SemestreService);
  private readonly sesion = inject(SesionService);

  protected readonly umbrales = UMBRALES;
  protected readonly formatearNota = formatearNota;
  protected readonly badgeDeRaInsuficiente = badgeDeRaInsuficiente;
  protected readonly chipSeveridad = chipSeveridad;

  protected readonly semestreId = signal('');
  protected readonly facultadId = signal('');
  protected readonly programaId = signal('');
  protected readonly asignaturaId = signal('');
  protected readonly minRaNoAlcanzados = signal(1);

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

  private readonly programasTodos = toSignal<Programa[], Programa[]>(
    this.programaService.listar({ estado: 'ACTIVO' }).pipe(catchError(() => of([] as Programa[]))),
    { initialValue: [] },
  );

  private readonly facultadesTodas = toSignal<Facultad[], Facultad[]>(
    this.facultadService.listar({ estado: 'ACTIVO' }).pipe(catchError(() => of([] as Facultad[]))),
    { initialValue: [] },
  );

  /** Programas del alcance del rol (profesor: solo los de sus asignaturas). */
  private readonly programasAlcance = computed(() => {
    const todos = this.programasTodos();
    if (this.sesion.rol() !== 'profesor') {
      return todos;
    }
    const ids = new Set(this.asignaturas().map((a) => a.programaId));
    return todos.filter((p) => ids.has(p.id));
  });

  protected readonly facultades = computed(() => {
    const facultades = this.facultadesTodas();
    if (this.sesion.rol() !== 'profesor') {
      return [...facultades].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    const ids = new Set(this.programasAlcance().map((p) => p.facultadId));
    return facultades
      .filter((f) => ids.has(f.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  protected readonly programas = computed(() => {
    const facultad = this.facultadId();
    return this.programasAlcance()
      .filter((p) => !facultad || p.facultadId === facultad)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  protected readonly asignaturasDelPrograma = computed(() => {
    const programa = this.programaId();
    const facultad = this.facultadId();
    const programasFacultad = new Set(
      this.programasAlcance()
        .filter((p) => !facultad || p.facultadId === facultad)
        .map((p) => p.id),
    );
    return this.asignaturas()
      .filter((a) => {
        if (programa) {
          return a.programaId === programa;
        }
        return !facultad || programasFacultad.has(a.programaId);
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  });

  private readonly filtros = computed<FiltrosRiesgoAcademico>(() => ({
    semestreId: this.semestreId() || undefined,
    facultadId: this.facultadId() || undefined,
    programaId: this.programaId() || undefined,
    asignaturaId: this.asignaturaId() || undefined,
    minRaNoAlcanzados: this.minRaNoAlcanzados(),
  }));
  private readonly intento = signal(0);

  protected readonly carga = toSignal<Carga, Carga>(
    toObservable(computed(() => ({ filtros: this.filtros(), intento: this.intento() }))).pipe(
      switchMap(({ filtros }) =>
        this.reportes.riesgoAcademico(filtros).pipe(
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

  protected cambiarFacultad(valor: string): void {
    this.facultadId.set(valor);
    const programa = this.programasAlcance().find((p) => p.id === this.programaId());
    if (valor && programa && programa.facultadId !== valor) {
      this.programaId.set('');
      this.asignaturaId.set('');
      return;
    }
    const asignatura = this.asignaturas().find((a) => a.id === this.asignaturaId());
    if (valor && asignatura) {
      const prog = this.programasAlcance().find((p) => p.id === asignatura.programaId);
      if (!prog || prog.facultadId !== valor) {
        this.asignaturaId.set('');
      }
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

  protected cambiarUmbral(valor: string): void {
    const n = Number(valor);
    this.minRaNoAlcanzados.set(Number.isFinite(n) && n >= 1 ? n : 1);
  }

  protected limpiarFiltros(): void {
    this.semestreId.set('');
    this.facultadId.set('');
    this.programaId.set('');
    this.asignaturaId.set('');
    this.minRaNoAlcanzados.set(1);
  }

  protected reintentar(): void {
    this.intento.update((n) => n + 1);
  }

  protected hayFiltros(): boolean {
    return !!(
      this.semestreId() ||
      this.facultadId() ||
      this.programaId() ||
      this.asignaturaId() ||
      this.minRaNoAlcanzados() !== 1
    );
  }
}
