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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subscription, catchError, of } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { DialogoConfirmacion } from '../../../../shared/components/dialogo-confirmacion/dialogo-confirmacion';
import { ChipEstado, VarianteChip } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Facultad } from '../../../facultades/models/facultad.model';
import { FacultadService } from '../../../facultades/services/facultad.service';
import {
  EstadoPrograma,
  FACULTAD_SIN_ASIGNAR_ID,
  FiltrosProgramas,
  Programa,
} from '../../models/programa.model';
import { ProgramaService } from '../../services/programa.service';
import { ProgramaFormDialog } from '../programa-form-dialog/programa-form-dialog';

interface PresentacionEstado {
  etiqueta: string;
  variante: VarianteChip;
  icono: string;
}

/** Ícono + texto + color para cada estado: el color nunca va solo (RNF-21). */
export const PRESENTACION_ESTADO: Readonly<Record<EstadoPrograma, PresentacionEstado>> = {
  ACTIVO: { etiqueta: 'Activo', variante: 'ok', icono: 'check' },
  INACTIVO: { etiqueta: 'Inactivo', variante: 'neutro', icono: 'prohibido' },
};

const RETARDO_BUSQUEDA_MS = 300;
const DURACION_AVISO_MS = 6000;

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

/**
 * Pestaña «Programas académicos» del Catálogo (RF-02): listado con filtros por nombre, código,
 * facultad y estado; registro y modificación (nombre y facultad) en un modal; e inactivación con
 * confirmación. Los programas que siguen en «Facultad sin asignar» se resaltan para reasignarlos.
 *
 * No hay acción de reactivar: el backend de RF-02 no la ofrece. Un programa inactivo se muestra
 * con su estado y sin acciones.
 *
 * Cada cambio de filtro vuelve a consultar. Las respuestas que llegan tarde se descartan para
 * que una consulta vieja no pise a una nueva. La autorización real la hace el backend.
 */
@Component({
  selector: 'app-programas-tab',
  imports: [ChipEstado, DialogoConfirmacion, Icono, ProgramaFormDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './programas-tab.html',
  styleUrl: './programas-tab.scss',
})
export class ProgramasTab {
  private readonly service = inject(ProgramaService);
  private readonly facultadService = inject(FacultadService);
  private readonly destroyRef = inject(DestroyRef);
  private consulta: Subscription | undefined;
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | undefined;
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  protected readonly presentacion = PRESENTACION_ESTADO;

  // ── Filtros ───────────────────────────────────────────────────────
  /** Texto tal como está en los buscadores; `nombre` y `codigo` lo reciben tras el retardo. */
  protected readonly textoNombre = signal('');
  protected readonly textoCodigo = signal('');
  protected readonly nombre = signal('');
  protected readonly codigo = signal('');
  protected readonly facultadId = signal('');
  protected readonly estado = signal<EstadoPrograma | ''>('');
  private readonly recargas = signal(0);

  private readonly filtros = computed<FiltrosProgramas>(() => ({
    nombre: this.nombre().trim() || undefined,
    codigo: this.codigo().trim() || undefined,
    facultadId: this.facultadId() || undefined,
    estado: this.estado() || undefined,
  }));

  /** Todas las facultades, activas e inactivas, para el filtro. Si fallan, el filtro no se ofrece. */
  protected readonly facultades = toSignal(
    this.facultadService.listar().pipe(catchError(() => of<Facultad[]>([]))),
    { initialValue: [] as Facultad[] },
  );

  // ── Datos y estado de la vista ────────────────────────────────────
  protected readonly programas = signal<Programa[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly hayFiltros = computed(
    () =>
      this.nombre().trim() !== '' ||
      this.codigo().trim() !== '' ||
      this.facultadId() !== '' ||
      this.estado() !== '',
  );
  protected readonly aviso = signal<Aviso | null>(null);

  /** Programas del listado que siguen en «Facultad sin asignar» y deben reasignarse. */
  protected readonly cantidadSinAsignar = computed(
    () => this.programas().filter((p) => this.sinFacultad(p)).length,
  );

  // ── Formulario y confirmación ─────────────────────────────────────
  protected readonly formularioAbierto = signal(false);
  protected readonly enEdicion = signal<Programa | null>(null);
  protected readonly aInactivar = signal<Programa | null>(null);
  protected readonly inactivando = signal(false);
  protected readonly tituloInactivar = computed(() => {
    const programa = this.aInactivar();
    return programa ? `¿Inactivar «${programa.nombre}»?` : '';
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

  private cargar(filtros: FiltrosProgramas): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.consulta = this.service.listar(filtros).subscribe({
      next: (lista) => {
        this.programas.set(lista);
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

  /** El buscador espera 300 ms sin teclear antes de consultar. */
  protected alEscribirNombre(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.textoNombre.set(valor);
    clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => this.nombre.set(valor), RETARDO_BUSQUEDA_MS);
  }

  protected alEscribirCodigo(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.textoCodigo.set(valor);
    clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => this.codigo.set(valor), RETARDO_BUSQUEDA_MS);
  }

  protected alCambiarFacultad(evento: Event): void {
    this.facultadId.set((evento.target as HTMLSelectElement).value);
  }

  protected alCambiarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as EstadoPrograma | '');
  }

  protected limpiarFiltros(): void {
    clearTimeout(this.temporizadorBusqueda);
    this.textoNombre.set('');
    this.textoCodigo.set('');
    this.nombre.set('');
    this.codigo.set('');
    this.facultadId.set('');
    this.estado.set('');
  }

  protected sinFacultad(programa: Programa): boolean {
    return programa.facultadId === FACULTAD_SIN_ASIGNAR_ID;
  }

  // ── Registro y modificación ───────────────────────────────────────
  protected abrirRegistro(): void {
    this.enEdicion.set(null);
    this.formularioAbierto.set(true);
  }

  protected abrirEdicion(programa: Programa): void {
    this.enEdicion.set(programa);
    this.formularioAbierto.set(true);
  }

  protected cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  protected alGuardar(programa: Programa): void {
    const editaba = this.enEdicion() !== null;
    this.formularioAbierto.set(false);
    this.mostrarAviso(editaba ? `Programa «${programa.nombre}» modificado.` : `Programa «${programa.nombre}» registrado.`);
    this.recargar();
  }

  // ── Inactivación ──────────────────────────────────────────────────
  protected pedirInactivar(programa: Programa): void {
    this.aInactivar.set(programa);
  }

  protected cancelarInactivar(): void {
    this.aInactivar.set(null);
  }

  protected confirmarInactivar(): void {
    const programa = this.aInactivar();
    if (!programa) {
      return;
    }
    this.inactivando.set(true);
    this.service
      .inactivar(programa.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.inactivando.set(false);
          this.aInactivar.set(null);
          this.mostrarAviso(`Programa «${programa.nombre}» inactivado.`);
          this.recargar();
        },
        error: (error: unknown) => {
          this.inactivando.set(false);
          this.aInactivar.set(null);
          this.mostrarAviso(mensajeDeError(error).mensaje, 'error');
        },
      });
  }

  // ── Avisos ────────────────────────────────────────────────────────
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
