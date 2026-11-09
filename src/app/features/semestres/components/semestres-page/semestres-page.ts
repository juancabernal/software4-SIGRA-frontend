import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import { Semestre } from '../../models/semestre.model';
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

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly semestres = signal<Semestre[]>([]);
  protected readonly dialogo = signal<Dialogo>(null);
  protected readonly aviso = signal<string | null>(null);

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
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizadorAviso));
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.service.listar().subscribe({
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
