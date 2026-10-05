import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { PERFILES, ROLES, Rol, type PerfilRol } from '../../models/rol';
import { SesionService } from '../../services/sesion';
import { BarsMotif } from '../../../shared/ui/bars-motif/bars-motif';
import { Icono } from '../../../shared/ui/icono/icono';

/** A partir de este ancho el sidebar es una columna fija; por debajo, un cajón sobre el contenido. */
const CONSULTA_ESCRITORIO = '(min-width: 900px)';

/**
 * Shell de la aplicación: sidebar de navegación + topbar + área de contenido (§6).
 *
 * El menú se arma con el perfil del rol activo, que `SesionService` deriva de la URL. Ocultar
 * ítems del menú **no** es control de acceso: la autorización la hace el backend (RF-05, RNF-13).
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BarsMotif, Icono],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  host: {
    '(document:keydown.escape)': 'cerrarCajon()',
    '[class.shell--colapsado]': 'colapsado()',
    '[class.shell--cajon-abierto]': 'cajonAbierto()',
  },
})
export class Shell {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');
  private readonly barraLateral = viewChild<ElementRef<HTMLElement>>('barraLateral');

  protected readonly roles = ROLES;
  protected readonly rol = this.sesion.rol;
  protected readonly perfil = this.sesion.perfil;

  /** Sidebar reducido a solo íconos. Aplica únicamente en escritorio. */
  protected readonly colapsado = signal(false);
  /** Cajón lateral visible. Aplica únicamente en pantallas angostas. */
  protected readonly cajonAbierto = signal(false);
  private readonly esEscritorio = signal(true);

  /** Qué comunica el botón hamburguesa: en escritorio, si el sidebar está desplegado. */
  protected readonly menuExpandido = computed(() =>
    this.esEscritorio() ? !this.colapsado() : this.cajonAbierto(),
  );

  /** El cajón cerrado queda fuera del recorrido de teclado: está fuera de la pantalla. */
  protected readonly barraInerte = computed(() => !this.esEscritorio() && !this.cajonAbierto());

  constructor() {
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.cajonAbierto.set(false));

    // Se comprueba la función y no solo la plataforma: el entorno de pruebas y algunos
    // navegadores embebidos no traen `matchMedia`. Sin ella se asume escritorio, que es el
    // caso en que el botón del menú colapsa el sidebar en lugar de abrir el cajón.
    if (this.esNavegador && typeof window.matchMedia === 'function') {
      const consulta = window.matchMedia(CONSULTA_ESCRITORIO);
      this.esEscritorio.set(consulta.matches);

      const alCambiar = (evento: MediaQueryListEvent) => {
        this.esEscritorio.set(evento.matches);
        if (evento.matches) {
          this.cajonAbierto.set(false);
        }
      };
      consulta.addEventListener('change', alCambiar);
      this.destroyRef.onDestroy(() => consulta.removeEventListener('change', alCambiar));
    }
  }

  /** En escritorio colapsa el sidebar; en móvil abre o cierra el cajón. */
  protected alternarMenu(): void {
    if (this.esEscritorio()) {
      this.colapsado.update((valor) => !valor);
      return;
    }

    const abriendo = !this.cajonAbierto();
    this.cajonAbierto.set(abriendo);
    if (abriendo) {
      // El foco entra al cajón para que el teclado no quede recorriendo el contenido de atrás.
      queueMicrotask(() => this.barraLateral()?.nativeElement.focus());
    }
  }

  protected cerrarCajon(): void {
    if (!this.cajonAbierto()) {
      return;
    }
    this.cajonAbierto.set(false);
    this.botonMenu()?.nativeElement.focus();
  }

  protected cambiarRol(rol: Rol): void {
    this.sesion.cambiarRol(rol);
  }

  protected perfilDe(rol: Rol): PerfilRol {
    return PERFILES[rol];
  }
}
