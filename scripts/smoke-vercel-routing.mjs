import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const angular = JSON.parse(readFileSync('angular.json', 'utf8'));
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const build = angular.projects['software4-SIGRA-frontend'].architect.build;
const output = join('dist', 'software4-SIGRA-frontend', 'index.html');

assert.equal(
  build.configurations.production.outputMode,
  'static',
  'El build de producción debe emitir SPA estática, no un servidor SSR no enrutable.',
);
assert.ok(existsSync(output), `Falta ${output}: el fallback de Vercel sería 404.`);
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
