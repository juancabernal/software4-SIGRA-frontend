import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { returnUrlInterna } from '../guards/auth.guard';
import { UsuarioSesion } from '../models/sesion.model';
import { PERFILES, Rol, RUTA_INICIAL, rolDesdeUsuario, type ItemMenu } from '../models/rol';
import { SessionService } from './session.service';

export interface IdentidadShell {
  readonly nombre: string;
  readonly subtitulo: string;
  readonly inicial: string;
  readonly menu: readonly ItemMenu[];
}

const IDENTIDAD_VACIA: IdentidadShell = {
  nombre: 'Sesión no disponible',
  subtitulo: 'Inicia sesión para continuar',
  inicial: '?',
  menu: [],
};

/** Estado visual derivado exclusivamente de una sesión validada. */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly router = inject(Router);
  private readonly sesionGuardada = inject(SessionService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private readonly usuarioLeido = signal<UsuarioSesion | null>(this.leerUsuario());
  private temporizadorExpiracion: ReturnType<typeof setTimeout> | null = null;

  readonly usuario = this.usuarioLeido.asReadonly();
  readonly autenticado = computed(() => this.usuario() !== null);

  readonly rol = computed<Rol | null>(() => {
    const usuario = this.usuario();
    return usuario === null ? null : rolDesdeUsuario(usuario.rol);
  });

  readonly identidad = computed<IdentidadShell>(() => {
    const usuario = this.usuario();
    if (usuario === null) {
      return IDENTIDAD_VACIA;
    }

    const perfil = PERFILES[rolDesdeUsuario(usuario.rol)];
    return {
      nombre: usuario.nombreCompleto,
      subtitulo: usuario.correoInstitucional,
      inicial: inicialDe(usuario.nombreCompleto),
      menu: perfil.menu,
    };
  });

  readonly etiquetaRol = computed(() => {
    const rol = this.rol();
    return rol === null ? 'Sesión' : PERFILES[rol].etiqueta;
  });

  readonly rutaInicial = computed(() => {
    const rol = this.rol();
    return rol === null ? '/login' : RUTA_INICIAL[rol];
  });

  constructor() {
    // sessionStorage no emite cambios dentro de la misma pestaña. Releer al finalizar una
    // navegación mantiene el shell coherente después del login, logout o expiración.
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.refrescar());

    if (this.esNavegador) {
      const alCambiarVisibilidad = () => this.refrescar();
      document.addEventListener('visibilitychange', alCambiarVisibilidad);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('visibilitychange', alCambiarVisibilidad);
        this.cancelarTemporizador();
      });
      this.programarExpiracion();
    }
  }

  refrescar(): void {
    this.usuarioLeido.set(this.leerUsuario());
    this.programarExpiracion();
  }

  cerrarSesion(): void {
    this.cancelarTemporizador();
    this.sesionGuardada.clearSession();
    this.usuarioLeido.set(null);
    void this.router.navigateByUrl('/login');
  }

  private leerUsuario(): UsuarioSesion | null {
    return this.sesionGuardada.getUser();
  }

  private programarExpiracion(): void {
    if (!this.esNavegador) {
      return;
    }
    this.cancelarTemporizador();
    const expiraEn = this.sesionGuardada.getExpiration();
    const token = this.sesionGuardada.getToken();
    if (expiraEn === null || token === null) {
      return;
    }

    const espera = Math.max(0, expiraEn - Date.now());
    this.temporizadorExpiracion = setTimeout(() => this.manejarExpiracion(token), espera);
  }

  private manejarExpiracion(token: string): void {
    this.temporizadorExpiracion = null;

    // Una respuesta 401 o un login nuevo pudo cambiar la sesión mientras el timer esperaba.
    // Solo se elimina el token que originó este temporizador.
    if (!this.sesionGuardada.clearSessionIfToken(token)) {
      this.refrescar();
      return;
    }

    this.usuarioLeido.set(null);
    if (this.router.url.startsWith('/login')) {
      return;
    }

    const destino = this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl: returnUrlInterna(this.router.url) },
    });
    void this.router.navigateByUrl(destino);
  }

  private cancelarTemporizador(): void {
    if (this.temporizadorExpiracion !== null) {
      clearTimeout(this.temporizadorExpiracion);
      this.temporizadorExpiracion = null;
    }
  }
}

function inicialDe(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return '?';
  }
  const primera = partes[0][0];
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primera + segunda).toUpperCase();
}
