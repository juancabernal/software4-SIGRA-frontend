import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { PERFILES, Rol, RUTA_INICIAL, rolDesdeUrl, type PerfilRol } from '../models/rol';

/**
 * Sesión provisional del prototipo.
 *
 * El rol **se deriva de la URL**, no de un estado aparte: así un enlace directo a
 * `/estudiante/materias` pinta el menú de estudiante sin quedar desfasado con la ruta.
 *
 * Cuando aterricen RF-04 (autenticación) y RF-05 (autorización), este servicio pasa a leer el
 * rol del token y el selector del sidebar desaparece. Nada más del shell cambia.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Rol activo. Si la URL no corresponde a ningún rol, se asume administrador. */
  readonly rol = computed<Rol>(() => rolDesdeUrl(this.url()) ?? 'admin');

  readonly perfil = computed<PerfilRol>(() => PERFILES[this.rol()]);

  /** Cambiar de rol navega a la pantalla por defecto del rol elegido (§7.2). */
  cambiarRol(rol: Rol): void {
    void this.router.navigateByUrl(RUTA_INICIAL[rol]);
  }
}
