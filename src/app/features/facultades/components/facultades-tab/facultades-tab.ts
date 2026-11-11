import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { DialogoConfirmacion } from '../../../../shared/components/dialogo-confirmacion/dialogo-confirmacion';
import { ChipEstado, VarianteChip } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import {
  EstadoFacultad,
  Facultad,
  FiltrosFacultades,
} from '../../models/facultad.model';
import { FacultadService } from '../../services/facultad.service';
import { FacultadFormDialog } from '../facultad-form-dialog/facultad-form-dialog';

interface PresentacionEstado {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
}

export const PRESENTACION_ESTADO_FACULTAD: Readonly<
  Record<EstadoFacultad, PresentacionEstado>
> = {
  ACTIVO: { etiqueta: 'Activo', variante: 'ok', icono: 'check' },
  INACTIVO: { etiqueta: 'Inactivo', variante: 'neutro', icono: 'prohibido' },
};

const RETARDO_BUSQUEDA_MS = 300;
const DURACION_AVISO_MS = 6000;

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

/** Pestaña «Facultades»: listado filtrable, registro, edición e inactivación lógica. */
@Component({
  selector: 'app-facultades-tab',
  imports: [ChipEstado, DialogoConfirmacion, Icono, FacultadFormDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './facultades-tab.html',
  styleUrl: './facultades-tab.scss',
})
export class FacultadesTab {
  private readonly service = inject(FacultadService);
  private readonly destroyRef = inject(DestroyRef);
  private consulta: Subscription | undefined;
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | undefined;
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  protected readonly presentacion = PRESENTACION_ESTADO_FACULTAD;

  /** Texto tal como está en el buscador; `nombre` recibe el mismo valor tras el retardo. */
  protected readonly textoBusqueda = signal('');
  protected readonly nombre = signal('');
  protected readonly estado = signal<EstadoFacultad | ''>('');
  private readonly recargas = signal(0);

  private readonly filtros = computed<FiltrosFacultades>(() => ({
    nombre: this.nombre().trim() || undefined,
    estado: this.estado() || undefined,
  }));

  protected readonly facultades = signal<Facultad[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly hayFiltros = computed(
    () => this.nombre().trim() !== '' || this.estado() !== '',
  );
  protected readonly aviso = signal<Aviso | null>(null);

  protected readonly formularioAbierto = signal(false);
  protected readonly enEdicion = signal<Facultad | null>(null);
  protected readonly aInactivar = signal<Facultad | null>(null);
  protected readonly inactivando = signal(false);
  protected readonly tituloInactivar = computed(() => {
    const facultad = this.aInactivar();
    return facultad ? `¿Inactivar «${facultad.nombre}»?` : '';
  });

  constructor() {
    effect(() => {
      const filtros = this.filtros();
      this.recargas();
      untracked(() => this.cargar(filtros));
    });
    this.destroyRef.onDestroy(() => {
      this.consulta?.unsubscribe();
      clearTimeout(this.temporizadorBusqueda);
      clearTimeout(this.temporizadorAviso);
    });
  }

  private cargar(filtros: FiltrosFacultades): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.consulta = this.service.listar(filtros).subscribe({
      next: (lista) => {
        this.facultades.set(lista);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.errorCarga.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }

  protected recargar(): void {
    this.recargas.update((n) => n + 1);
  }

  protected alEscribirNombre(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.textoBusqueda.set(valor);
    clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => this.nombre.set(valor), RETARDO_BUSQUEDA_MS);
  }

  protected alCambiarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as EstadoFacultad | '');
  }

  protected limpiarFiltros(): void {
    clearTimeout(this.temporizadorBusqueda);
    this.textoBusqueda.set('');
    this.nombre.set('');
    this.estado.set('');
  }

  protected abrirRegistro(): void {
    this.enEdicion.set(null);
    this.formularioAbierto.set(true);
  }

  protected abrirEdicion(facultad: Facultad): void {
    this.enEdicion.set(facultad);
    this.formularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  protected alGuardar(facultad: Facultad): void {
    const editaba = this.enEdicion() !== null;
    this.formularioAbierto.set(false);
    this.mostrarAviso(
      editaba
        ? `Facultad «${facultad.nombre}» modificada.`
        : `Facultad «${facultad.nombre}» registrada.`,
    );
    this.recargar();
  }

  protected pedirInactivar(facultad: Facultad): void {
    this.aInactivar.set(facultad);
  }

  protected cancelarInactivar(): void {
    this.aInactivar.set(null);
  }

  protected confirmarInactivar(): void {
    const facultad = this.aInactivar();
    if (!facultad) {
      return;
    }
    this.inactivando.set(true);
    this.service
      .inactivar(facultad.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.inactivando.set(false);
          this.aInactivar.set(null);
          this.mostrarAviso(`Facultad «${facultad.nombre}» inactivada.`);
          this.recargar();
        },
        error: (error: unknown) => {
          this.inactivando.set(false);
          this.aInactivar.set(null);
          this.mostrarAviso(mensajeDeError(error).mensaje, 'error');
        },
      });
  }

  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  private mostrarAviso(texto: string, tono: Aviso['tono'] = 'ok'): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set({ texto, tono });
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }
}
