import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const angular = JSON.parse(readFileSync('angular.json', 'utf8'));
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const build = angular.projects['software4-SIGRA-frontend'].architect.build;
const outputDir = vercel.outputDirectory;
const output = join(outputDir, 'index.html');
function diagnosticoDist() {
  const raiz = join('dist','software4-SIGRA-frontend');
  if (!existsSync(raiz)) return 'No existe carpeta de salida dist del proyecto';
  return JSON.stringify(readdirSync(raiz, { withFileTypes: true }).map(
    (item) => ({ nombre: item.name, tipo: item.isDirectory() ? 'dir' : 'file',
      hijos: item.isDirectory() ? readdirSync(join(raiz, item.name)).slice(0, 25) : undefined })
  ));
}

assert.equal(
  build.configurations.production.outputMode,
  'static',
  'El build de producción debe emitir SPA estática, no un servidor SSR no enrutable.',
);
assert.equal(
  vercel.outputDirectory, 'dist/software4-SIGRA-frontend/browser',
  'El directorio de despliegue debe apuntar al browser real de Angular.',
);
assert.equal(vercel.buildCommand, 'npm run build', 'Vercel debe usar el mismo build que CI.');
assert.equal(build.configurations.production.ssr, false, 'No debe quedar SSR habilitado en producción SPA.');
assert.equal(build.configurations.production.server, false, 'No debe generarse bundle de servidor para Vercel SPA.');
assert.equal(build.configurations.production.prerender, false, 'No generar rutas de usuario durante build.');
assert.ok(
  existsSync(output),
  `Falta ${output}; no se puede servir SPA en Vercel. Artefactos: ${diagnosticoDist()}`,
);
const contenido = readFileSync(output, 'utf8');
assert.match(contenido, /<html\b/i, 'index.html no contiene el documento Angular.');

const reglas = new Map(vercel.rewrites.map(({ source, destination }) => [source, destination]));
for (const origen of [
  '/login',
  '/acceso-denegado',
  '/admin/:path*',
  '/profesor/:path*',
  '/estudiante/:path*',
]) {
  assert.equal(reglas.get(origen), '/index.html', `Falta el fallback del path ${origen}`);
}
assert.equal(
  vercel.rewrites.some(({ source }) => source === '/api/:path*' || source === '/:path*' || source === '/(.*)'),
  false,
  'El fallback no debe capturar /api ni rutas arbitrarias/recursos estáticos.',
);

for (const ruta of [
  '/admin/ra',
  '/admin/catalogo',
  '/admin/estudiantes/123',
  '/profesor/asignaturas',
  '/profesor/matricula',
  '/estudiante/materias',
  '/estudiante/progreso/calificaciones',
]) {
  const prefijo = ruta.split('/')[1];
  assert.equal(reglas.get(`/${prefijo}/:path*`), '/index.html');
}
console.log('Smoke Vercel SPA PASS: index.html de producción y rewrites de rutas privadas verificadas.');
