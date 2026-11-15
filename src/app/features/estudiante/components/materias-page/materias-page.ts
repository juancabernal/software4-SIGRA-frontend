import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { mensajeDeError, MensajeError } from '../../../../core/http/mensaje-de-error';
import { ChipEstado, VarianteChip } from '../../../../shared/ui/chip-estado/chip-estado';
import {
  ETIQUETA_SITUACION,
  formatearFecha,
  MiMateria,
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
  selector: 'app-mis-materias-page',
  imports: [RouterLink, ChipEstado],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './materias-page.html',
  styleUrl: './materias-page.scss',
})
export class MisMateriasPage {
  private readonly servicio = inject(MiProcesoService);
  protected readonly cargando = signal(true);
  protected readonly error = signal<MensajeError | null>(null);
  protected readonly materias = signal<MiMateria[]>([]);
  protected readonly etiquetas = ETIQUETA_SITUACION;
  protected readonly variantes = VARIANTE;
  protected readonly formatearFecha = formatearFecha;

  constructor() {
    this.cargar();
  }

  protected reintentar(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .listarMaterias()
      .pipe(
        catchError((error: unknown) => {
          this.error.set(mensajeDeError(error));
          return of<MiMateria[]>([]);
        }),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe((materias) => this.materias.set(materias));
  }
}
