# Implementación RF-02/RF-03 — autenticación y RBAC

## Archivos transversales

- `src/app/core/services/session.service.ts`: validación estructural, TTL, claim `exp`, Storage API seguro.
- `src/app/core/services/sesion.ts`: identidad y menú derivados únicamente del usuario autenticado.
- `src/app/core/guards/`: `authGuard`, `guestGuard`, `roleGuard` y redirección segura de la raíz.
- `src/app/core/interceptors/`: Bearer para API propia y política central de `401`/`403`/errores.
- `src/app/features/auth/components/`: login, acceso denegado y respaldo de redirección raíz.
- `src/server.ts` y `deploy/nginx/sigra.conf.example`: separación explícita API/SSR y headers base.
- `e2e/` y `playwright.config.ts`: arnés de navegador real, condicionado a un ambiente aislado.

## Flujo

1. Login envía solo `correoInstitucional` normalizado y `contrasena` sin modificar.
2. `SessionService` valida `tipo`, token JWT, TTL, usuario y rol antes de guardar.
3. La ruta raíz decide login o pantalla inicial según la sesión validada.
4. Cada pantalla privada declara un rol backend explícito.
5. El backend continúa siendo la frontera de autorización por recurso.

El Bearer de una petición fallida se compara contra la sesión vigente antes de limpiar. Un `403`
de una consulta se entrega al feature y no destruye navegación, formularios ni modales. La interfaz
retira la identidad al vencer el TTL aunque no ocurra una navegación; este reloj solo se crea en
browser, nunca durante SSR.

