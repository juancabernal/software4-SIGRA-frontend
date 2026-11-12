import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, filter, finalize, of, switchMap } from 'rxjs';

import { mensajeDeError, MensajeError } from '../../../../core/http/mensaje-de-error';
import { BadgeNivelLogro } from '../../../../shared/ui/badge-nivel-logro/badge-nivel-logro';
import { ChipEstado, VarianteChip } from '../../../../shared/ui/chip-estado/chip-estado';
import {
  ETIQUETA_NIVEL,
  ETIQUETA_SITUACION,
  formatearFecha,
  formatearNumero,
  MiMateriaDetalle,
  NivelLogro,
  SituacionMateria,
} from '../../models/mi-proceso.model';
import { MiProcesoService } from '../../services/mi-proceso.service';

const VARIANTE: Readonly<Record<SituacionMateria, VarianteChip>> = {
  EN_CURSO: 'ok',
  PROGRAMADA: 'neutro',
  CURSADA: 'neutro',
  DESVINCULADA: 'peligro',
};

@Component({
  selector: 'app-materia-detalle-page',
  imports: [RouterLink, BadgeNivelLogro, ChipEstado],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle-page.html',
  styleUrl: './detalle-page.scss',
})
export class MateriaDetallePage {
  readonly matriculaId = input.required<string>();
  private readonly servicio = inject(MiProcesoService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly cargando = signal(true);
  protected readonly error = signal<MensajeError | null>(null);
  protected readonly noEncontrada = signal(false);
  protected readonly materia = signal<MiMateriaDetalle | null>(null);
  protected readonly etiquetas = ETIQUETA_SITUACION;
  protected readonly etiquetasNivel = ETIQUETA_NIVEL;
  protected readonly variantes = VARIANTE;
  protected readonly formatearFecha = formatearFecha;
  protected readonly formatearNumero = formatearNumero;

  constructor() {
    toObservable(this.matriculaId)
      .pipe(
        filter(Boolean),
        distinctUntilChanged(),
        switchMap((id) => {
          this.cargando.set(true);
          this.error.set(null);
          this.noEncontrada.set(false);
          this.materia.set(null);
          return this.servicio.obtenerMateria(id).pipe(
            catchError((error: unknown) => {
              const status = (error as { status?: number }).status;
              if (status === 400 || status === 404) {
                this.noEncontrada.set(true);
              } else {
                this.error.set(mensajeDeError(error));
              }
              return of<MiMateriaDetalle | null>(null);
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((materia) => this.materia.set(materia));
  }

  protected nivelEsSinEvaluar(nivel: NivelLogro): boolean {
    return nivel === 'SIN_EVALUAR';
  }
}
