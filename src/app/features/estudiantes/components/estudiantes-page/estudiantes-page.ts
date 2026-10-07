import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { DialogoConfirmacion } from '../../../../shared/components/dialogo-confirmacion/dialogo-confirmacion';
import { ChipEstado } from '../../../../shared/ui/chip-estado/chip-estado';
import { Icono } from '../../../../shared/ui/icono/icono';
import { Estudiante, PRESENTACION_ESTADO_ESTUDIANTE } from '../../models/estudiante.model';
import { MensajeError, mensajeDeError } from '../../services/estudiante-error';
import { EstudianteService } from '../../services/estudiante.service';
import { EstudianteFormDialog } from '../estudiante-form-dialog/estudiante-form-dialog';

interface Aviso {
  texto: string;
  tono: 'ok' | 'error';
}

type ResultadoCarga = { lista: Estudiante[] } | { error: MensajeError };
type Dialogo = { tipo: 'registrar' } | { tipo: 'modificar'; estudiante: Estudiante } | null;

const RETARDO_BUSQUEDA_MS = 300;
const DURACION_AVISO_MS = 6000;

/**
 * Listado de estudiantes (RF-09a): búsqueda por nombre o documento, registrar, modificar e
 * inactivar. El detalle con el historial de matrículas vive en su propia ruta (D1): esta vista
 * solo enlaza a él.
 */
@Component({
  selector: 'app-estudiantes-page',
  imports: [ChipEstado, DialogoConfirmacion, EstudianteFormDialog, Icono, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estudiantes-page.html',
  styleUrl: './estudiantes-page.scss',
})
export class EstudiantesPage {
  private readonly service = inject(EstudianteService);
  private readonly destroyRef = inject(DestroyRef);
  private temporizadorAviso: ReturnType<typeof setTimeout> | undefined;

  protected readonly presentacion = PRESENTACION_ESTADO_ESTUDIANTE;

  // ── Filtro ────────────────────────────────────────────────────────
  protected readonly texto = signal('');
  private readonly recargas = signal(0);

  /** El buscador espera 300 ms sin teclear antes de consultar (D8: lo resuelve el servidor). */
  private readonly textoAplicado = toSignal(
    toObservable(this.texto).pipe(
      debounceTime(RETARDO_BUSQUEDA_MS),
      map((texto) => texto.trim()),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );

  protected readonly hayFiltros = computed(() => !!this.textoAplicado());

  // ── Datos y estado de la vista ────────────────────────────────────
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<MensajeError | null>(null);
  protected readonly estudiantes = signal<Estudiante[]>([]);
  protected readonly aviso = signal<Aviso | null>(null);

  protected readonly dialogo = signal<Dialogo>(null);

  protected readonly aInactivar = signal<Estudiante | null>(null);
  protected readonly inactivando = signal(false);
  protected readonly errorInactivar = signal<string | null>(null);

  protected readonly tituloInactivar = computed(() => {
    const estudiante = this.aInactivar();
    return estudiante ? `¿Inactivar a «${estudiante.nombreCompleto}»?` : '';
  });

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizadorAviso));

    const consulta = computed(() => ({ filtro: this.textoAplicado(), recarga: this.recargas() }));
    toObservable(consulta)
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.errorCarga.set(null);
        }),
        switchMap(({ filtro }) =>
          this.service.listar(filtro).pipe(
            map((lista): ResultadoCarga => ({ lista })),
            catchError((error: unknown) => of<ResultadoCarga>({ error: mensajeDeError(error) })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        if ('lista' in resultado) {
          this.estudiantes.set(resultado.lista);
        } else {
          this.errorCarga.set(resultado.error);
        }
        this.cargando.set(false);
      });
  }

  // ── Filtro ────────────────────────────────────────────────────────
  protected alEscribir(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
  }

  protected limpiarFiltros(): void {
    this.texto.set('');
  }

  protected recargar(): void {
    this.recargas.update((n) => n + 1);
  }

  // ── Registrar / Modificar ────────────────────────────────────────
  protected abrirRegistro(): void {
    this.dialogo.set({ tipo: 'registrar' });
  }

  protected abrirModificacion(estudiante: Estudiante): void {
    this.dialogo.set({ tipo: 'modificar', estudiante });
  }

  protected cerrarDialogoFormulario(): void {
    this.dialogo.set(null);
  }

  /** D9: tras guardar se relee del servidor en lugar de parchear la lista en memoria. */
  protected alGuardar(estudiante: Estudiante): void {
    const eraModificar = this.dialogo()?.tipo === 'modificar';
    this.dialogo.set(null);
    this.mostrarAviso({
      texto: eraModificar
        ? `Estudiante modificado: ${estudiante.nombreCompleto}.`
        : `Estudiante registrado: ${estudiante.nombreCompleto}.`,
      tono: 'ok',
    });
    this.recargar();
  }

  // ── Inactivar ─────────────────────────────────────────────────────
  protected pedirInactivar(estudiante: Estudiante): void {
    this.errorInactivar.set(null);
    this.aInactivar.set(estudiante);
  }

  protected cancelarInactivar(): void {
    this.aInactivar.set(null);
    this.errorInactivar.set(null);
  }

  protected confirmarInactivar(): void {
    const estudiante = this.aInactivar();
    if (!estudiante || this.inactivando()) {
      return;
    }
    this.inactivando.set(true);
    this.errorInactivar.set(null);
    this.service
      .inactivar(estudiante.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.inactivando.set(false);
          this.aInactivar.set(null);
          this.mostrarAviso({
            texto: `Estudiante inactivado: ${estudiante.nombreCompleto}.`,
            tono: 'ok',
          });
          this.recargar();
        },
        error: (error: unknown) => {
          this.inactivando.set(false);
          this.errorInactivar.set(mensajeDeError(error).mensaje);
          this.recargar();
        },
      });
  }

  // ── Avisos ────────────────────────────────────────────────────────
  protected cerrarAviso(): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(null);
  }

  private mostrarAviso(aviso: Aviso): void {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(aviso);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), DURACION_AVISO_MS);
  }
}
