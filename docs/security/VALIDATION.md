# Validación

## Comandos

```text
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.spec.json
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.e2e.json
npm test -- --watch=false
npm run build
npm run build -- --configuration development
npm run e2e
```

Los resultados deben anotarse como `PASS`, `FAIL` o `BLOCKED` con fecha, commit y versión de Node.
La suite completa requiere ejecutar Vitest fuera del sandbox cuando el sistema bloquee sus archivos
temporales con `EPERM`.

## Evidencia local — 12 de octubre de 2026

- Base: rama `codex/rf-02-rf-03-auth-frontend`, HEAD `0d34137fc26e92a2f39e6edf33e83ed682d9f9ef`,
  cambios locales sin commit, Node `v22.22.3`, npm `11.6.2`.
- `tsc` de aplicación: `PASS`.
- `tsc` de specs: `PASS`.
- `tsc` de E2E: `PASS`.
- `npm test -- --watch=false`: `PASS`, 48 archivos y 420 pruebas.
- `npm run build`: `PASS` (producción).
- `npm run build -- --configuration development`: `PASS`.
- `npm run e2e -- --list`: `PASS`, 18 casos declarados para Chromium/Firefox, 9 por navegador.
- `npm run e2e:preflight`: `BLOCKED`, no se habilitó el ambiente integrado.
- Playwright contra backend/PostgreSQL/CORS real: `BLOCKED`, falta backend SHA, PostgreSQL
  desechable/seed y credenciales secretas; no se declara PASS con skips.
- `npm run smoke:ssr`: `PASS`, host autorizado `200`, host desconocido `400`, ruta privada `200`
  y `/api` sin proxy `502`.
- `npm audit --audit-level=high`: `PASS`, 0 vulnerabilidades reportadas por npm.
- `git diff --check`: `PASS`; Git solo advierte conversiones CRLF/LF de cambios preexistentes.

El build no descarga fuentes externas: `src/index.html` usa los fallbacks locales definidos en
`styles.scss`, lo que hace reproducible la compilación y mantiene la CSP `font-src 'self' data:`.

La primera ejecución de `npm test -- --watch=false` dentro del sandbox quedó `BLOCKED` por `EPERM`
al renombrar temporales de Vitest; la repetición fuera del sandbox fue la evidencia usada arriba.

