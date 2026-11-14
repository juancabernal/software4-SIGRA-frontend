import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { Facultad } from '../../../facultades/models/facultad.model';
import { FacultadService } from '../../../facultades/services/facultad.service';
import { Programa } from '../../../programas/models/programa.model';
import { ProgramaService } from '../../../programas/services/programa.service';
import { Semestre } from '../../../semestres/models/semestre.model';
import { SemestreService } from '../../../semestres/services/semestre.service';
import {
  FiltrosMatriculasProgramaSemestre,
  generarCsvMatriculasProgramaSemestre,
  MatriculasProgramaSemestreReporte,
} from '../../models/matriculas-programa-semestre.model';
import { MatriculasProgramaSemestreService } from '../../services/matriculas-programa-semestre.service';

type Carga =
  | { estado: 'cargando' }
  | { estado: 'listo'; reporte: MatriculasProgramaSemestreReporte }
  | { estado: 'error'; error: MensajeError };

@Component({
  selector: 'app-matriculas-programa-semestre-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './matriculas-programa-semestre-tab.html',
  styleUrl: './matriculas-programa-semestre-tab.scss',
})
export class MatriculasProgramaSemestreTab {
  private readonly reporteService = inject(MatriculasProgramaSemestreService);
  private readonly semestreService = inject(SemestreService);
  private readonly programaService = inject(ProgramaService);
  private readonly facultadService = inject(FacultadService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly semestreId = signal<string | null>(null);
  protected readonly programaId = signal('');
  protected readonly facultadId = signal('');

  protected readonly semestres = toSignal(
    this.semestreService.listar().pipe(catchError(() => of([] as Semestre[]))),
    { initialValue: null },
  );
  protected readonly programas = toSignal(
    this.programaService.listar().pipe(catchError(() => of([] as Programa[]))),
    { initialValue: [] as Programa[] },
  );
  protected readonly facultades = toSignal(
    this.facultadService.listar().pipe(catchError(() => of([] as Facultad[]))),
    { initialValue: [] as Facultad[] },
  );

  protected readonly semestreSeleccionadoId = computed(() => {
    const seleccionado = this.semestreId();
    if (seleccionado !== null) {
      return seleccionado;
    }
    return this.semestres()?.find((semestre) => semestre.estado === 'ACTIVO')?.id ?? '';
  });

  protected readonly filtros = computed<FiltrosMatriculasProgramaSemestre | null>(() => {
    if (this.semestres() === null) {
      return null;
    }
    return {
      semestreId: this.semestreSeleccionadoId() || undefined,
      programaId: this.programaId() || undefined,
      facultadId: this.facultadId() || undefined,
    };
  });

  private readonly intento = signal(0);

  protected readonly carga = toSignal<Carga, Carga>(
    toObservable(computed(() => ({ filtros: this.filtros(), intento: this.intento() }))).pipe(
      switchMap(({ filtros }) => {
        if (filtros === null) {
          return of<Carga>({ estado: 'cargando' });
        }
        return this.reporteService.listar(filtros).pipe(
          map((reporte): Carga => ({ estado: 'listo', reporte })),
          catchError((error) => of<Carga>({ estado: 'error', error: mensajeDeError(error) })),
          startWith<Carga>({ estado: 'cargando' }),
        );
      }),
    ),
    { initialValue: { estado: 'cargando' } },
  );

  protected readonly mayorTotal = computed(() => {
    const actual = this.carga();
    return actual.estado === 'listo'
      ? Math.max(0, ...actual.reporte.filas.map((fila) => fila.totalMatriculas))
      : 0;
  });

  protected cambiarSemestre(valor: string): void {
    this.semestreId.set(valor);
  }

  protected cambiarPrograma(valor: string): void {
    this.programaId.set(valor);
  }

  protected cambiarFacultad(valor: string): void {
    this.facultadId.set(valor);
  }

  protected reintentar(): void {
    this.intento.update((valor) => valor + 1);
  }

  protected exportarCsv(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const actual = this.carga();
    if (actual.estado !== 'listo') {
      return;
    }
    const blob = new Blob([generarCsvMatriculasProgramaSemestre(actual.reporte)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'reporte-matriculas-programa-semestre.csv';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
