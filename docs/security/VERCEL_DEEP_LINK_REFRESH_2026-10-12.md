# Hotfix: recargas de rutas internas en Vercel (SIGRA, 2026-10-12)

## Síntoma

Al entrar por el login la navegación Angular funciona, pero refrescar con F5
una ruta como `/profesor/asignaturas` o `/admin/ra` muestra la pantalla
negra `404: NOT_FOUND` **de Vercel**, antes de que Angular gestione la URL.

## Causa y decisión

En `main` el build era híbrido `outputMode: server`, mientras que las
rutas privadas son `RenderMode.Client`. En el deployment observado, Vercel
no respondió los deep links con un documento de entrada. El CI solo probaba
el servidor Node local y la navegación SPA durante E2E; no probaba las
peticiones HTTP directas al origen de Vercel.

Para este frontend, que consume una API independiente de Render y mantiene
la sesión en `sessionStorage`, el build de **producción** pasa a
`outputMode: static`. El build de **desarrollo** mantiene `outputMode: server`
y el smoke SSR existente, pero el routing SSR ya no prerenderiza el
comodín; todas las vistas permanecen client-side para no hornear
redirecciones o datos privados por rol.

El `vercel.json` solo reescribe `/login`, `/acceso-denegado`,
`/admin/:path*`, `/profesor/:path*` y `/estudiante/:path*`
a `/index.html`; no intercepta assets ni `/api`. La API sigue en
`https://software4-sigra-backend.onrender.com/api` sin cambios.

**No se cambia JWT, permisos, Neon, backend ni variables de entorno.**

## Pruebas agregadas

- `npm run smoke:vercel` después del build de producción: comprueba
  `dist/software4-SIGRA-frontend/index.html`, modo estático,
  rewrites para todos los grupos de roles y ausencia de wildcard global.
- Playwright: login de ADMINISTRADOR, PROFESOR y ESTUDIANTE, refresh real
  en su ruta inicial; verifica URL y menú, más rechazo persistente del
  acceso de PROFESOR a `/admin/ra`.
- El CI mantiene la compilación de desarrollo, tests unitarios, auditoría,
  SSR smoke y E2E integrada con PostgreSQL temporal.

## Validación obligatoria en Preview de Vercel (antes del merge)

1. Confirmar que Vercel detecte framework **Angular** y despliegue
   `dist/software4-SIGRA-frontend` (sitio estático).
2. Probar apertura directa / refresh (F5, Ctrl+R) de
   `/login`, `/admin/ra`, `/admin/catalogo`,
   `/profesor/asignaturas`, `/estudiante/materias`:
   documento 200, sin `404 NOT_FOUND`.
3. Login de prueba por los tres roles y refrescar después de navegar;
   la sesión válida debe mantenerse en la pestaña.
4. Profesor accediendo a `/admin/ra`: pantalla Angular de
   **acceso denegado** (NO 404 de Vercel).
5. Confirmar bundles JS/CSS, fotos del login y assets 200;
   verificar API externa Render y que `/api` no entregue index.html.
6. Si Vercel no publica el browser dir o aplica `vercel.json` en otra
   raíz, corregir **Project → Settings → Build & Deployment → Root
   Directory / Framework Preset / Output Directory** según el repo.
   No cambiar sin revisar primero el deployment Preview.

**Limitación:** el smoke local valida el artefacto y la configuración; el
resultado HTTP de la instancia desplegada en Vercel debe verificarse en
Preview. No atribuir el 404 a JWT/Neon sin esa prueba.

Fuentes: https://angular.dev/tools/cli/deployment y
https://vercel.com/kb/guide/why-is-my-deployed-project-giving-404 .
