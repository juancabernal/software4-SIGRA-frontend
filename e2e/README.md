# E2E de autenticación SIGRA

La suite usa un navegador real y un ambiente aislado. En la CI de release se descarga el backend
compatible por SHA, se levanta PostgreSQL 16 efímero, se crea el esquema `sigra` y se ejecutan los
seeds versionados de autenticación, roles, asignaturas y semestres. Nunca apunta a Neon, Render ni
otra base compartida.

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

Antes de ejecutar la compuerta integrada, `npm run e2e:preflight` exige las URL locales, el SHA del
backend, la versión/seed de PostgreSQL y las tres identidades. Si falta el ambiente, informa
`BLOCKED`; no se debe interpretar una suite omitida como PASS.

En la CI de release, las identidades `*.bruno@uco.net.co` y su contraseña solo viven dentro del
PostgreSQL efímero y del job de pruebas; son credenciales de QA ya documentadas en los seeds y no
son credenciales de producción. En otros ambientes, las variables deben inyectarse desde el gestor
de secretos/CI. No se deben guardar credenciales reales en `.env`, fixtures, capturas ni reportes.
La suite no genera trazas ni videos; los reportes JUnit/HTML no incluyen cuerpos de respuesta.
Playwright instala sus navegadores en el agente de CI con `npm run e2e:install`.

Sin `SIGRA_E2E_ENABLED=1`, los casos se marcan como `SKIPPED`; eso no es un PASS de integración.
Con la variable habilitada, la suite falla al inicio si falta alguna credencial y no permite que una
ejecución incompleta pase con tests omitidos. La evidencia debe registrar backend SHA, versión de
PostgreSQL, frontend SHA, fecha, conteos y cualquier caso `BLOCKED`.
