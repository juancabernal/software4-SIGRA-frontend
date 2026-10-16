# Auditoría de autenticación y autorización del frontend

## Alcance

Integración transversal de login, sesión JWT, guards, RBAC visual, interceptores HTTP, errores,
SSR y validación del formulario. Los módulos académicos y sus reglas de negocio permanecen fuera
del alcance.

## Estado

`PASS_WITH_BLOCKERS`: F-01, F-03, F-04, F-05, F-06, F-07 y F-08 están integrados en código y
pruebas unitarias. F-02/F-09 tienen topología y configuración de referencia, pero requieren
validación del ambiente real. F-10 queda `BLOCKED` hasta disponer del backend SHA identificado,
PostgreSQL desechable y credenciales E2E.

## Decisiones verificadas

- Roles backend: `ADMINISTRADOR`, `PROFESOR`, `ESTUDIANTE`; nunca se solicitan ni se infieren de la URL.
- `sessionStorage` solo se usa en navegador y se descartan datos dañados, incompletos o vencidos.
- `expiraEn` del login son segundos; la sesión guardada conserva un instante absoluto en milisegundos.
- `Authorization` solo se adjunta a una URL root-relative bajo `/api/v1/**` o al origen explícito de
  `environment.apiUrl`; no se usa hostname ficticio como allowlist.
- Login no recibe Bearer; un `401` privado limpia solo la sesión cuyo token falló y un `403` conserva
  la sesión sin navegación global.
- Las rutas privadas mantienen `RenderMode.Client`; no se leen credenciales durante SSR.
- `exp` del JWT es obligatorio como claim de caducidad de forma; la firma sigue siendo exclusiva del
  backend.
- `returnUrl` solo se restaura dentro del prefijo del rol autenticado.

## Cierre por hallazgo

| ID | Evidencia BEFORE | Código integrado | Tests AFTER | Residual |
| --- | --- | --- | --- | --- |
| F-01 | `http://sigra.local` clasificaba hosts ficticios | Allowlist root-relative o `environment.apiUrl` explícito; SSR fail-closed | Interceptor: host, puerto, protocolo relativo, prefijo y query | Confirmar URLs finales en smoke test |
| F-02 | `/api` no tenía proxy verificable | Topología Node SSR + Nginx y `502` si `/api` llega a Node | Typecheck/build; smoke pendiente | Backend/proxy real no está en este repo |
| F-03 | Cualquier `403` navegaba globalmente | Error se propaga al feature; sin navegación automática | Interceptor 403 conserva sesión y URL | Cada feature debe mantener su alerta contextual |
| F-04 | `401` antiguo podía borrar token nuevo | `clearSessionIfToken` compara el Bearer usado | Prueba A/B concurrente | E2E con requests reales pendiente |
| F-05 | Menú podía quedar visible hasta navegar | Timer browser + `visibilitychange`, sin timer SSR | Prueba de TTL sin navegación | Probar suspensión/extremos del navegador |
| F-06 | `returnUrl` se ignoraba | Restauración interna y acotada al rol | Guards: deep link y open redirect | E2E en producción pendiente |
| F-07 | JWT sin `exp` se aceptaba por TTL local | `exp` obligatorio; firma no se valida en Angular | SessionService y fixtures con `exp` | Cotejar con SHA backend |
| F-08 | Rutas iniciales duplicadas | `RUTA_INICIAL` centralizada | Guards/login existentes | Sin residual conocido |
| F-09 | SSR/hardening no certificado | Headers base en Node + ejemplo Nginx/CSP/HSTS | Builds PASS | Certificar plataforma, TLS y CSP finales |
| F-10 | No había suite navegador | Playwright Chromium/Firefox, reporter JUnit/HTML, sin trazas | Config/listado PASS; ejecución real BLOCKED | Requiere backend SHA, PostgreSQL y seeds |

No se modificaron reglas de matrícula, asignaturas, semestres ni resultados de aprendizaje.

