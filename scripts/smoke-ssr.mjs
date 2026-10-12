import assert from 'node:assert/strict';
import http from 'node:http';

const baseUrl = process.env['SIGRA_SSR_URL'] ?? 'http://127.0.0.1:4000';
const allowedHosts = (
  process.env['SIGRA_SSR_ALLOWED_HOSTS'] ??
  process.env['SIGRA_SSR_ALLOWED_HOST'] ??
  new URL(baseUrl).hostname
)
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

async function request(pathname, host = allowedHost) {
  const url = new URL(pathname, baseUrl);
  return new Promise((resolve, reject) => {
    const solicitud = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: { Host: host },
      },
      (respuesta) => {
        respuesta.resume();
        resolve(respuesta);
      },
    );
    solicitud.on('error', reject);
    solicitud.end();
  });
}

for (const host of allowedHosts) {
  const login = await request('/login', host);
  assert.equal(
    login.statusCode,
    200,
    `GET /login con ${host} esperado 200, recibido ${login.statusCode}`,
  );
}

const privateRoute = await request('/admin/catalogo', allowedHosts[0]);
assert.equal(
  privateRoute.statusCode,
  200,
  `GET /admin/catalogo esperado 200, recibido ${privateRoute.statusCode}`,
);

const api = await request('/api/v1/auth/login', allowedHosts[0]);
assert.equal(api.statusCode, 502, `GET /api esperado 502, recibido ${api.statusCode}`);

const unknownHost = await request('/login', 'sigra.invalid');
assert.equal(
  unknownHost.statusCode,
  400,
  `Host no autorizado esperado 400, recibido ${unknownHost.statusCode}`,
);

console.log('SSR smoke PASS: host autorizado 200, host no autorizado 400 y /api 502.');
