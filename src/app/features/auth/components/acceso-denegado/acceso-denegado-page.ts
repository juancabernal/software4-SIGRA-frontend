import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { SesionService } from '../../../../core/services/sesion';

@Component({
  selector: 'app-acceso-denegado-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './acceso-denegado-page.html',
  styleUrl: './acceso-denegado-page.scss',
})
export class AccesoDenegadoPage {
  private readonly router = inject(Router);
  protected readonly sesion = inject(SesionService);

  protected volver(): void {
    void this.router.navigateByUrl(this.sesion.rutaInicial());
  }

  protected cerrarSesion(): void {
    this.sesion.cerrarSesion();
  }
}
