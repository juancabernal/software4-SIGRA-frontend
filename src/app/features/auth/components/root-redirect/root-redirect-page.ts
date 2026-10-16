import { ChangeDetectionStrategy, Component } from '@angular/core';

/** La guardia de la raíz devuelve el destino; este componente es solo respaldo de renderizado. */
@Component({
  selector: 'app-root-redirect-page',
  template: '<p aria-live="polite">Redirigiendo…</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RootRedirectPage {}
