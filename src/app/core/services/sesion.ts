import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { UsuarioSesion } from '../models/sesion.model';
import {
  PERFILES,
  Rol,
  RUTA_INICIAL,
  rolDesdeUrl,
  rolDesdeUsuario,
  type ItemMenu,
} from '../models/rol';
import { SessionService } from './session.service';

/** Identidad que pinta el shell: de la sesión real si existe, o de la demo si no. */
export interface IdentidadShell {
  readonly nombre: string;
  readonly subtitulo: string;
  readonly inicial: string;
  readonly menu: readonly ItemMenu[];
}

/**
 * Quién está usando la aplicación, para el shell.
 *
 * Hay dos orígenes posibles y uno manda sobre el otro:
 *
 * 1. **La sesión real** que guarda `SessionService` al iniciar sesión (RF-04). Si existe, el rol,
 *    el nombre y el correo salen de ahí.
 * 2. **El selector de demostración** del sidebar, que deriva el rol del primer segmento de la URL.
 *    Es el andamio para recorrer las pantallas sin backend, y queda oculto en cuanto hay sesión
 *    real: tener las dos cosas a la vez permitiría contradecirlas.
 *
 * La sesión vive en `sessionStorage`, que no es reactivo, así que se relee en cada navegación.
 * Alcanza porque entrar a cualquier pantalla es navegar, y el propio inicio de sesión navega.
 *
 * Esto **no** es autorización: no decide qué puede hacer nadie. Los guards son RF-05 y la
 * autorización real la impone el backend en cada endpoint (RNF-13).
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly router = inject(Router);
  private readonly sesionGuardada = inject(SessionService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  private readonly usuarioLeido = signal<UsuarioSesion | null>(this.leerUsuario());

  /** Usuario autenticado, o `null` mientras no haya sesión. */
  readonly usuario = this.usuarioLeido.asReadonly();

  readonly autenticado = computed(() => this.usuario() !== null);

  constructor() {
    // `sessionStorage` no avisa cuando cambia dentro de la misma pestaña, así que se relee al
    // terminar cada navegación. Entrar a una pantalla es navegar, y el login navega al autenticar.
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.refrescar());
  }

  /** Rol activo: el de la sesión real si existe, y si no el que indica la URL. */
  readonly rol = computed<Rol>(() => {
    const usuario = this.usuario();
    if (usuario !== null) {
      return rolDesdeUsuario(usuario.rol);
    }
    return rolDesdeUrl(this.url()) ?? 'admin';
  });

  /** Nombre, subtítulo e inicial para el sidebar y la topbar. */
  readonly identidad = computed<IdentidadShell>(() => {
    const perfil = PERFILES[this.rol()];
    const usuario = this.usuario();

    if (usuario === null) {
      return {
        nombre: perfil.nombre,
        subtitulo: perfil.subtitulo,
        inicial: perfil.inicial,
        menu: perfil.menu,
      };
    }

    return {
      nombre: usuario.nombreCompleto,
      subtitulo: usuario.correoInstitucional,
      inicial: inicialDe(usuario.nombreCompleto),
      menu: perfil.menu,
    };
  });

  /** Etiqueta legible del rol activo, para la topbar. */
  readonly etiquetaRol = computed(() => PERFILES[this.rol()].etiqueta);

  /** Pantalla a la que entra el rol activo (§7.2). */
  readonly rutaInicial = computed(() => RUTA_INICIAL[this.rol()]);

  /** Vuelve a leer la sesión del navegador. La llama el login tras guardarla. */
  refrescar(): void {
    this.usuarioLeido.set(this.leerUsuario());
  }

  /** Cambiar de rol en la demostración navega a la pantalla por defecto de ese rol (§7.2). */
  cambiarRol(rol: Rol): void {
    void this.router.navigateByUrl(RUTA_INICIAL[rol]);
  }

  /** Cierra la sesión y vuelve al inicio de sesión. */
  cerrarSesion(): void {
    if (this.esNavegador) {
      this.sesionGuardada.clearSession();
    }
    this.usuarioLeido.set(null);
    void this.router.navigateByUrl('/login');
  }

  /** En el servidor no hay `sessionStorage`: ahí nunca hay sesión que leer. */
  private leerUsuario(): UsuarioSesion | null {
    return this.esNavegador ? this.sesionGuardada.getUser() : null;
  }
}

/** Iniciales del nombre, hasta dos letras. */
function inicialDe(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return '?';
  }
  const primera = partes[0][0];
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primera + segunda).toUpperCase();
}
