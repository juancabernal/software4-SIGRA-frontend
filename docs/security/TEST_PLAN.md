# Plan de pruebas de seguridad frontend

## Cubierto localmente

- Formulario: correo institucional, máximo 254 caracteres y contraseña de máximo 72 bytes UTF-8.
- Sesión: payload inválido, Storage API bloqueado, TTL, expiración, claim `exp`, logout y SSR.
- Guards: visitante, sesión vigente, matriz por rol, root redirect y acceso denegado.
- Interceptores: API propia, login, assets, host externo, protocolo relativo, puertos, path parecido,
  `401` concurrente con doble login y `403` contextual sin navegación.
- Expiración visual reactiva sin navegación, `exp` obligatorio y `returnUrl` acotado al rol.
- Inventario de rutas y compatibilidad de `profesor/matricula` y `admin/matricula`.

## Pendiente de integración

- Tres usuarios reales contra backend y PostgreSQL aislado.
- CORS con los orígenes reales de despliegue y headers `X-Request-Id`.
- Smoke/E2E de recarga, logout, expiración y `403` cruzado contra API real.
- Proxy/CORS y `X-Request-Id` en el ambiente final.

## E2E real

La carpeta `e2e/` contiene el arnés de Playwright y exige variables de entorno sin credenciales
hardcodeadas. La ejecución se marca `BLOCKED` si no se habilita explícitamente con el backend y la
base PostgreSQL desechable. Las trazas están desactivadas para no persistir JWT, contraseñas o PII.

