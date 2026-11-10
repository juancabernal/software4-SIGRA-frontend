import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { EstadoSemestre, Semestre } from '../../models/semestre.model';
import { duracionEnDias, formatearFecha, hoyIso } from '../../models/semestre-fechas';
import { MensajeError, mensajeDeError } from '../../services/semestre-error';
import { SemestreService } from '../../services/semestre.service';
import { SemestreIcono } from '../semestre-icono/semestre-icono';
import { EstadoSemestreBadge } from '../estado-semestre-badge/estado-semestre-badge';
import { SemestreExtenderDialog } from '../semestre-extender-dialog/semestre-extender-dialog';
import { SemestreFormDialog } from '../semestre-form-dialog/semestre-form-dialog';

/** Fila de la tabla con los textos ya preparados para la vista. */
interface FilaSemestre {
  semestre: Semestre;
  inicio: string;
  fin: string;
  duracion: number;
  terminado: boolean;
  situacion: string;
}

type Dialogo = { tipo: 'crear' } | { tipo: 'extender'; semestre: Semestre } | null;

const DURACION_AVISO_MS = 6000;
const ESPERA_BUSQUEDA_MS = 300;

/**
 * RF-Semestre: listado, registro y extensión de la fecha de fin.
 * Hasta que exista la sesión (RF-04/RF-05) la vista muestra las acciones de administrador;
 * la autorización real la hace el backend en cada endpoint.
 */
@Component({
  selector: 'app-semestres-page',
  imports: [EstadoSemestreBadge, SemestreFormDialog, SemestreExtenderDialog, SemestreIcono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './semestres-page.html',
  styleUrl: './semestres-page.scss',
})
export class SemestresPage {
  private readonly service = inject(SemestreService);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;
  private temporizadorBusqueda: ReturnType<typeof setTimeout> | undefined;
  private consulta: Subscription | undefined;

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly semestres = signal<Semestre[]>([]);
  protected readonly dialogo = signal<Dialogo>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly codigo = signal('');
  protected readonly estado = signal<EstadoSemestre | ''>('');
  protected readonly hayFiltros = computed(() => this.codigo().trim() !== '' || this.estado() !== '');

  protected readonly filas = computed<FilaSemestre[]>(() => {
    const hoy = hoyIso();
    return this.semestres().map((semestre) => {
      const inicio = formatearFecha(semestre.fechaInicio);
      const fin = formatearFecha(semestre.fechaFin);
      const terminado = semestre.fechaFin < hoy;
      let situacion = `Inicia el ${inicio}`;
      if (semestre.estado === 'ACTIVO') {
        situacion = `En curso hasta el ${fin}`;
      } else if (terminado) {
        situacion = `Terminó el ${fin}`;
      }
      return {
        semestre,
        inicio,
        fin,
        duracion: duracionEnDias(semestre.fechaInicio, semestre.fechaFin),
        terminado,
        situacion,
      };
    });
  });

  protected readonly filaActiva = computed(
    () => this.filas().find((fila) => fila.semestre.estado === 'ACTIVO') ?? null,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.temporizadorAviso);
      clearTimeout(this.temporizadorBusqueda);
      this.consulta?.unsubscribe();
    });
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.consulta?.unsubscribe();
    this.consulta = this.service
      .listar({ codigo: this.codigo(), estado: this.estado() || undefined })
      .subscribe({
        next: (semestres) => {
          this.semestres.set(semestres);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.errorCarga.set(mensajeDeError(error));
          this.cargando.set(false);
        },
      });
  }

  /** Espera a que la persona deje de teclear y vuelve a consultar con el filtro vigente. */
  protected alEscribirCodigo(evento: Event): void {
    this.codigo.set((evento.target as HTMLInputElement).value);
    clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => this.cargar(), ESPERA_BUSQUEDA_MS);
  }

  protected alCambiarEstado(evento: Event): void {
    this.estado.set((evento.target as HTMLSelectElement).value as EstadoSemestre | '');
    clearTimeout(this.temporizadorBusqueda);
    this.cargar();
  }

  protected limpiarFiltros(): void {
    this.codigo.set('');
    this.estado.set('');
    clearTimeout(this.temporizadorBusqueda);
    this.cargar();
  }

  protected abrirRegistro(): void {
    this.dialogo.set({ tipo: 'crear' });
  }

  protected abrirExtension(semestre: Semestre): void {
    this.dialogo.set({ tipo: 'extender', semestre });
  }

  protected cerrarDialogo(): void {
    this.dialogo.set(null);
  }

  protected alRegistrar(semestre: Semestre): void {
    this.dialogo.set(null);
    this.mostrarAviso(
      `Semestre ${semestre.codigo} registrado: va del ${formatearFecha(semestre.fechaInicio)} ` +
        `al ${formatearFecha(semestre.fechaFin)}.`,
    );
    this.cargar();
  }

  protected alExtender(semestre: Semestre): void {
    this.dialogo.set(null);
    this.mostrarAviso(
      `Fecha de fin extendida: ${semestre.codigo} ahora termina el ${formatearFecha(semestre.fechaFin)}.`,
    );
    this.cargar();
  }

  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  private mostrarAviso(texto: string): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(texto);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }
}
