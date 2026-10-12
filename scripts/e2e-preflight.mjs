const required = [
  'SIGRA_E2E_BASE_URL',
  'SIGRA_E2E_BACKEND_SHA',
  'SIGRA_E2E_POSTGRES_VERSION',
  'SIGRA_E2E_SEED_ID',
  'SIGRA_E2E_ADMIN_EMAIL',
  'SIGRA_E2E_ADMIN_PASSWORD',
  'SIGRA_E2E_PROFESOR_EMAIL',
  'SIGRA_E2E_PROFESOR_PASSWORD',
  'SIGRA_E2E_ESTUDIANTE_EMAIL',
  'SIGRA_E2E_ESTUDIANTE_PASSWORD',
];

if (process.env['SIGRA_E2E_ENABLED'] !== '1') {
  console.error('BLOCKED: SIGRA_E2E_ENABLED no está en 1; falta ambiente integrado.');
  process.exit(2);
}

const faltantes = required.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  console.error(`BLOCKED: faltan variables de ambiente E2E: ${faltantes.join(', ')}`);
  process.exit(2);
}

console.log(
  `E2E habilitada: backend SHA ${process.env['SIGRA_E2E_BACKEND_SHA']}, ` +
    `PostgreSQL ${process.env['SIGRA_E2E_POSTGRES_VERSION']}, seed ${process.env['SIGRA_E2E_SEED_ID']}.`,
);
