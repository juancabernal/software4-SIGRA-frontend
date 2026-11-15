import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { mensajeDeError, MensajeError } from '../../../../core/http/mensaje-de-error';
import { BadgeNivelLogro } from '../../../../shared/ui/badge-nivel-logro/badge-nivel-logro';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import {
  ETIQUETA_NIVEL,
  ETIQUETA_SITUACION,
  formatearNumero,
  MiMateriaDetalle,
} from '../../models/mi-proceso.model';
import { MiProcesoService } from '../../services/mi-proceso.service';

@Component({
  selector: 'app-mi-progreso-page',
  imports: [RouterLink, BadgeNivelLogro, ChipEstado],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progreso-page.html',
  styleUrl: './progreso-page.scss',
})
export class MiProgresoPage {
  private readonly servicio = inject(MiProcesoService);
  protected readonly cargando = signal(true);
  protected readonly error = signal<MensajeError | null>(null);
  protected readonly materias = signal<MiMateriaDetalle[]>([]);
  protected readonly etiquetas = ETIQUETA_SITUACION;
  protected readonly etiquetasNivel = ETIQUETA_NIVEL;
  protected readonly formatearNumero = formatearNumero;

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
      .obtenerProgreso()
      .pipe(
        catchError((error: unknown) => {
          this.error.set(mensajeDeError(error));
          return of<MiMateriaDetalle[]>([]);
        }),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe((materias) => this.materias.set(materias));
  }
}
