import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { BarsMotif } from '../bars-motif/bars-motif';

/**
 * Pantalla provisional de un módulo que todavía no está implementado.
 *
 * Recibe el título, el subtítulo y el requisito por los `data` de la ruta (el router los enlaza
 * a las entradas con `withComponentInputBinding`), así que agregar un módulo al andamiaje es
 * una entrada más en `app.routes.ts` y no un componente nuevo. Cuando el módulo se construya de
 * verdad, se reemplaza su `loadComponent` por el componente real.
 *
 * El texto dice explícitamente que la pantalla está pendiente: un lienzo vacío sin explicación
 * se lee como un error de carga (RNF-17).
 */
@Component({
  selector: 'app-modulo-pendiente',
  imports: [BarsMotif],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modulo-pendiente.html',
  styleUrl: './modulo-pendiente.scss',
})
export class ModuloPendiente {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  /** Requisito funcional que cubrirá esta pantalla, p. ej. «RF-09a». */
  readonly requisito = input('');
}
