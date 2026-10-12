# E2E de autenticación SIGRA

La suite usa un navegador real y un ambiente externo: no levanta Spring Boot ni PostgreSQL por
cuenta propia porque este repositorio no contiene ese backend ni sus semillas. El ambiente debe
usar una base PostgreSQL desechable, datos deterministas y un SHA de backend documentado.

## Ejecución

```text
set SIGRA_E2E_ENABLED=1
set SIGRA_E2E_BASE_URL=https://frontend-e2e.example.invalid
set SIGRA_E2E_API_BASE_URL=https://frontend-e2e.example.invalid
set SIGRA_E2E_BACKEND_SHA=<sha-del-backend-desplegado>
set SIGRA_E2E_POSTGRES_VERSION=16
set SIGRA_E2E_SEED_ID=<identificador-del-seed>
set SIGRA_E2E_ADMIN_EMAIL=...
set SIGRA_E2E_ADMIN_PASSWORD=...
set SIGRA_E2E_PROFESOR_EMAIL=...
set SIGRA_E2E_PROFESOR_PASSWORD=...
set SIGRA_E2E_ESTUDIANTE_EMAIL=...
set SIGRA_E2E_ESTUDIANTE_PASSWORD=...
npm run e2e
```

Antes de ejecutar la compuerta integrada, `npm run e2e:preflight` exige el SHA del backend, la
versión/seed de PostgreSQL y las tres identidades. Si falta el ambiente, informa `BLOCKED`; no se
debe interpretar una suite omitida como PASS.

Las variables deben inyectarse desde el gestor de secretos/CI. No se deben guardar en `.env`,
fixtures, capturas ni reportes. La suite no genera trazas ni videos; los reportes JUnit/HTML no
incluyen cuerpos de respuesta. Playwright debe instalar sus navegadores en el agente de CI con
`npm run e2e:install`.

Sin `SIGRA_E2E_ENABLED=1`, los casos se marcan como `SKIPPED`; eso no es un PASS de integración.
Con la variable habilitada, la suite falla al inicio si falta alguna credencial y no permite que una
ejecución incompleta pase con tests omitidos. La evidencia debe registrar backend SHA, versión de
PostgreSQL, frontend SHA, fecha, conteos y cualquier caso `BLOCKED`.
