import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, of, skip, startWith, switchMap } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { formatearFechaHora } from '../../../../core/util/formato-fecha';
import { refrescoAutomatico } from '../../../../core/util/refresco-automatico';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { AccionMejoraFormDialog } from '../../../mejoras/components/accion-mejora-form-dialog/accion-mejora-form-dialog';
import { ConversionAccionMejoraDialog } from '../../../mejoras/components/conversion-accion-mejora-dialog/conversion-accion-mejora-dialog';
import { AccionMejora } from '../../../mejoras/models/accion-mejora.model';
import { AccionMejoraService } from '../../../mejoras/services/accion-mejora.service';
import {
  EstadisticasFiltros,
  FILTROS_ESTADISTICAS_VACIOS,
  FiltrosEstadisticas,
} from '../estadisticas-filtros/estadisticas-filtros';

type CargaAccionesMejora =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'listo'; lista: AccionMejora[] }
  | { estado: 'error'; error: MensajeError };

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

const DURACION_AVISO_MS = 6000;

/**
 * «Acciones de mejora» (Mantis 0000048): las acciones registradas (RF-17) para el RA y el semestre
 * elegidos, con «Editar» y «Convertir en evaluación» (RF-18). Registrar una acción nueva se hace
 * desde «Conclusiones», porque nace de una conclusión vigente.
 */
@Component({
  selector: 'app-acciones-mejora-page',
  imports: [
    AccionMejoraFormDialog,
    ChipEstado,
    ConversionAccionMejoraDialog,
    EstadisticasFiltros,
    Icono,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './acciones-mejora-page.html',
  styleUrls: ['../estadisticas-comun.scss', './acciones-mejora-page.scss'],
})
export class AccionesMejoraPage {
  private readonly accionMejoraService = inject(AccionMejoraService);

  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;
  protected readonly aviso = signal<Aviso | null>(null);

  private readonly refresco = refrescoAutomatico();

  protected readonly filtros = signal<FiltrosEstadisticas>(FILTROS_ESTADISTICAS_VACIOS);
  protected readonly puedeConsultar = computed(
    () =>
      this.filtros().asignaturaId !== '' &&
      this.filtros().resultadoAprendizajeId !== '' &&
      this.filtros().semestreId !== '',
  );

  private readonly recargaAcciones = signal(0);
  protected readonly cargaAcciones = signal<CargaAccionesMejora>({ estado: 'inactivo' });

  protected readonly accionesEstado = computed(() => this.cargaAcciones().estado);
  protected readonly accionesError = computed(() => {
    const carga = this.cargaAcciones();
    return carga.estado === 'error' ? carga.error : null;
  });
  protected readonly accionesMejora = computed(() => {
    const carga = this.cargaAcciones();
    return carga.estado === 'listo' ? carga.lista : [];
  });

  protected readonly dialogoAbierto = signal(false);
  protected readonly accionEnEdicion = signal<AccionMejora | null>(null);
  protected readonly dialogoConversionAbierto = signal(false);
  protected readonly accionEnConversion = signal<AccionMejora | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizadorAviso));

    toObservable(
      computed(() => ({
        resultadoAprendizajeId: this.filtros().resultadoAprendizajeId,
        semestreId: this.filtros().semestreId,
        recarga: this.recargaAcciones(),
      })),
    )
      .pipe(
        switchMap(({ resultadoAprendizajeId, semestreId }) => {
          if (!resultadoAprendizajeId || !semestreId) {
            return of<CargaAccionesMejora>({ estado: 'inactivo' });
          }
          return this.accionMejoraService.listar({ resultadoAprendizajeId, semestreId }).pipe(
            map((lista): CargaAccionesMejora => ({ estado: 'listo', lista })),
            catchError((error: unknown) =>
              of<CargaAccionesMejora>({ estado: 'error', error: mensajeDeError(error) }),
            ),
            startWith<CargaAccionesMejora>({ estado: 'cargando' }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((carga) => this.cargaAcciones.set(carga));

    toObservable(this.refresco)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => {
        if (this.dialogoAbierto() || this.dialogoConversionAbierto()) {
          return;
        }
        this.refrescarAccionesEnSegundoPlano();
      });
  }

  /** Vuelve a cargar las acciones de mejora sin mostrar "cargando" ni borrar lo que ya hay en pantalla. */
  private refrescarAccionesEnSegundoPlano(): void {
    const { resultadoAprendizajeId, semestreId } = this.filtros();
    if (!resultadoAprendizajeId || !semestreId || this.cargaAcciones().estado === 'inactivo') {
      return;
    }
    this.accionMejoraService.listar({ resultadoAprendizajeId, semestreId }).subscribe({
      next: (lista) => {
        const actual = this.cargaAcciones();
        if (actual.estado === 'listo' && JSON.stringify(actual.lista) === JSON.stringify(lista)) {
          return;
        }
        this.cargaAcciones.set({ estado: 'listo', lista });
      },
      error: () => {
        // refresco en segundo plano: ante un fallo se conservan los datos previos sin avisar
      },
    });
  }

  protected alCambiarFiltros(filtros: FiltrosEstadisticas): void {
    this.filtros.set(filtros);
  }

  protected editarAccionMejora(accion: AccionMejora): void {
    this.accionEnEdicion.set(accion);
    this.dialogoAbierto.set(true);
  }

  protected alGuardarAccionMejora(): void {
    this.dialogoAbierto.set(false);
    this.accionEnEdicion.set(null);
    this.mostrarAviso('Acción de mejora actualizada correctamente.');
    this.recargaAcciones.update((valor) => valor + 1);
  }

  protected alCancelarAccionMejora(): void {
    this.dialogoAbierto.set(false);
    this.accionEnEdicion.set(null);
  }

  protected abrirConversion(accion: AccionMejora): void {
    this.accionEnConversion.set(accion);
    this.dialogoConversionAbierto.set(true);
  }

  protected alConvertirAccionMejora(): void {
    this.dialogoConversionAbierto.set(false);
    this.mostrarAviso('Acción de mejora convertida en evaluación.');
    this.recargaAcciones.update((valor) => valor + 1);
  }

  protected alCancelarConversion(): void {
    this.dialogoConversionAbierto.set(false);
  }

  private mostrarAviso(texto: string, tono: Aviso['tono'] = 'ok'): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set({ texto, tono });
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }

  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  protected formatearFecha(fecha: string | null | undefined): string {
    return formatearFechaHora(fecha);
  }
}
