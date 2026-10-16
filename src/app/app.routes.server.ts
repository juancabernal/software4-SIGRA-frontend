import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * SIGRA conserva navegación por roles en el navegador. No prerenderizamos el
 * comodín: una redirección calculada en build podría servir HTML de otro rol
 * al actualizar la página. En producción Vercel entrega index.html (SPA).
 *
 * El servidor Node del build de desarrollo sigue disponible para el smoke SSR.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
