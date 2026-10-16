# Despliegue y conectividad

## Topología elegida para integración

- El frontend se entrega como **Node SSR** (`outputMode: server`, `src/server.ts`) detrás de un
  reverse proxy TLS.
- El reverse proxy dirige `/api/**` directamente a Spring Boot y el resto a Node SSR en el puerto
  `4000`. El ejemplo operativo está en `deploy/nginx/sigra.conf.example`.
- Desarrollo: `http://localhost:8080/api`.
- Producción: `/api`, mismo origen para el navegador; no requiere CORS para el flujo normal.
- No se incluyen secretos ni hostname ficticio en el bundle.

El proxy de producción debe enrutar `/api/**` al backend HTTPS antes de la regla SPA/SSR. Si el
backend se expone en otro origen, esa topología requiere configurar `CORS_ALLOWED_ORIGINS` con el
origen real, permitir `Authorization`, exponer `X-Request-Id` y probar el preflight desde un
navegador real. No se deben poner URLs, credenciales ni hashes de firma en `environment.ts`.

`src/server.ts` devuelve `502` JSON para `/api/**` que alcance Node; esto hace visible un proxy mal
configurado y evita renderizar una respuesta Angular donde el cliente espera la API.

## SSR

Angular está configurado con `outputMode: server`, `src/server.ts` y `PORT` configurable (por defecto
4000). Las rutas privadas son `RenderMode.Client`; no deben prerenderizarse con credenciales.
El artefacto no debe documentarse como hosting estático universal mientras se conserve este modo.

### Allowlist de Host

Angular SSR rechaza con `400` cualquier `Host` que no esté autorizado. El build incluye únicamente
`localhost` y `127.0.0.1` para desarrollo; cada despliegue debe ampliar la lista con sus DNS reales
mediante `NG_ALLOWED_HOSTS`, separada por comas y sin puertos:

```text
# Local
NG_ALLOWED_HOSTS=localhost,127.0.0.1

# Staging/producción: reemplazar por los DNS reales del ambiente
NG_ALLOWED_HOSTS=localhost,127.0.0.1,<staging-dns-real>
NG_ALLOWED_HOSTS=localhost,127.0.0.1,<produccion-dns-real>
```

No usar `*`, `*.com`, valores tomados de la petición ni orígenes enviados por usuarios. El proxy
debe conservar el `Host` que corresponde al DNS público y probarlo con `GET /login` y una recarga de
`/admin/catalogo`. Los hosts no autorizados deben continuar devolviendo `400`.

Solo si el proxy está estrictamente controlado se puede definir `NG_TRUST_PROXY_HEADERS` con los
encabezados que realmente genera, por ejemplo `x-forwarded-proto`. No se confía en
`X-Forwarded-Host` por defecto y se debe revisar que el proxy no permita que el cliente lo suplante.

## Smoke test de despliegue

Con el backend y el proxy identificados, verificar desde Chromium/Firefox:

1. `GET /login` responde por Node SSR y una recarga de una ruta privada conserva el deep link.
2. `POST /api/v1/auth/login` llega a Spring Boot, nunca a Angular SSR.
3. `Authorization` solo aparece en `/api/v1/**`; login, assets y hosts externos no reciben Bearer.
4. `X-Request-Id` está presente y es legible por el cliente si la API lo devuelve.
5. HTTPS, HSTS, CSP, `nosniff`, `frame-ancestors` y CORS (si aplica) pasan una revisión del entorno.

La CSP de `deploy/nginx/sigra.conf.example` usa `script-src 'self'`: los scripts deben provenir del
bundle de Angular. Mantiene `style-src 'unsafe-inline'` porque el SSR puede insertar CSS crítico;
si la plataforma permite nonces/hashes dinámicos, reemplazarlo y verificarlo en Chromium y Firefox.

Este repositorio no contiene un proveedor, un backend SHA ni certificados reales: hasta ejecutar
este smoke test contra el ambiente final, el despliegue permanece `BLOCKED`. El smoke automatizado
local puede ejecutarse con `npm run smoke:ssr` después de levantar el artefacto SSR y valida
`/login = 200`, una ruta privada `= 200`, un Host desconocido `= 400` y `/api = 502` cuando no hay
proxy. En producción, `/api/v1/auth/login` debe ser la respuesta real de Spring Boot, nunca el 502.

