import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // La raíz solo redirige a admin/catalogo (ver app.routes.ts): si se prerenderiza, Angular
  // "hornea" esa redirección como archivo estático en build y Vercel lo usa como shell de
  // respaldo para TODAS las rutas client-side, rompiéndolas a todas con el mismo texto de
  // redirección. Debe resolverse en el navegador, como las demás rutas privadas.
  {
    path: '',
    renderMode: RenderMode.Client,
  },
  // Las pantallas privadas consumen la API con la sesión del usuario: no se prerenderizan.
  {
    path: 'admin/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'profesor/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'estudiante/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
