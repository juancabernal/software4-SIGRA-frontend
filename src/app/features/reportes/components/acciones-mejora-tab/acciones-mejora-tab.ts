import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { AccionesMejoraReporte, FiltrosAccionesMejora } from '../../models/acciones-mejora.model';
import { AccionesMejoraReporteService } from '../../services/acciones-mejora-reporte.service';

type Carga = { estado: 'cargando' } | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; reporte: AccionesMejoraReporte };

@Component({
  selector: 'app-acciones-mejora-tab',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './acciones-mejora-tab.html',
  styleUrl: './acciones-mejora-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccionesMejoraTab {
  private readonly service = inject(AccionesMejoraReporteService);
  protected readonly filtros = signal<FiltrosAccionesMejora>({});
  private readonly intento = signal(0);

  // Las opciones salen de acciones existentes, incluidas las de asignaturas y RA inactivos.
  private readonly fuente = toSignal(toObservable(this.intento).pipe(
    switchMap(() => this.consultar({})),
  ), { initialValue: { estado: 'cargando' } as Carga });

  protected readonly carga = toSignal(combineLatest([
    toObservable(this.fuente), toObservable(this.filtros),
  ]).pipe(switchMap(([fuente, filtros]) => {
    if (fuente.estado !== 'listo' || Object.keys(filtros).length === 0) return of(fuente);
    return this.consultar(filtros);
  })), { initialValue: { estado: 'cargando' } as Carga });

  private readonly filasCatalogo = computed(() => {
    const fuente = this.fuente();
    return fuente.estado === 'listo' ? fuente.reporte.filas : [];
  });
  protected readonly semestres = computed(() => this.opciones(this.filasCatalogo()
    .map(f => ({ id: f.semestreId, nombre: f.semestreCodigo }))));
  protected readonly asignaturas = computed(() => this.opciones(this.filasCatalogo()
    .filter(f => !this.filtros().semestreId || f.semestreId === this.filtros().semestreId)
    .map(f => ({ id: f.asignaturaId, nombre: `${f.asignaturaCodigo} · ${f.asignaturaNombre}` }))));
  protected readonly resultados = computed(() => this.opciones(this.filasCatalogo()
    .filter(f => f.asignaturaId === this.filtros().asignaturaId
      && (!this.filtros().semestreId || f.semestreId === this.filtros().semestreId))
    .map(f => ({ id: f.resultadoAprendizajeId, nombre: f.resultadoAprendizajeCodigo }))));

  private consultar(filtros: FiltrosAccionesMejora) {
    return this.service.listar(filtros).pipe(
      map((reporte): Carga => ({ estado: 'listo', reporte })),
      catchError(error => of<Carga>({ estado: 'error', mensaje: mensajeDeError(error).mensaje })),
      startWith<Carga>({ estado: 'cargando' }),
    );
  }

  private opciones(filas: { id: string; nombre: string }[]) {
    return [...new Map(filas.map(f => [f.id, f])).values()]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  }

  protected cambiarSemestre(valor: string): void {
    this.filtros.update(({ convertida }) => ({ ...(valor ? { semestreId: valor } : {}),
      ...(convertida === undefined ? {} : { convertida }) }));
  }
  protected cambiarAsignatura(valor: string): void {
    this.filtros.update(({ resultadoAprendizajeId, asignaturaId, ...resto }) =>
      ({ ...resto, ...(valor ? { asignaturaId: valor } : {}) }));
  }
  protected cambiarRa(valor: string): void {
    this.filtros.update(({ resultadoAprendizajeId, ...resto }) =>
      ({ ...resto, ...(valor ? { resultadoAprendizajeId: valor } : {}) }));
  }
  protected cambiarEstado(valor: string): void {
    this.filtros.update(({ convertida, ...resto }) =>
      ({ ...resto, ...(valor === '' ? {} : { convertida: valor === 'true' }) }));
  }
  protected actualizar(): void { this.intento.update(v => v + 1); }
}
