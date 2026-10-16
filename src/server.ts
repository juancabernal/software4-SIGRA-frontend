import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const allowedHosts = valoresDeEntorno('NG_ALLOWED_HOSTS');
const trustedProxyHeaders = valoresDeEntorno('NG_TRUST_PROXY_HEADERS');
const angularApp = new AngularNodeAppEngine({
  allowedHosts,
  trustProxyHeaders: trustedProxyHeaders,
});
app.disable('x-powered-by');

/** Encabezados mínimos del SSR; el proxy TLS debe completar HSTS y CSP según su política. */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Request-Id', requestId(req));
  if (
    req.secure ||
    (trustedProxyHeaders?.includes('x-forwarded-proto') === true &&
      req.header('x-forwarded-proto') === 'https')
  ) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

/** Si /api llega al SSR, el reverse proxy está mal configurado: nunca se renderiza como SPA. */
app.use('/api', (req, res) => {
  res.status(502).json({
    status: 502,
    error: 'BAD_GATEWAY',
    mensaje: 'La API no está disponible a través del frontend.',
    requestId: res.getHeader('X-Request-Id'),
  });
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

function requestId(req: express.Request): string {
  const recibido = req.header('x-request-id');
  return recibido && /^[A-Za-z0-9._:-]{1,100}$/.test(recibido) ? recibido : randomUUID();
}

function valoresDeEntorno(nombre: string): readonly string[] | undefined {
  const valor = process.env[nombre];
  if (!valor) {
    return undefined;
  }

  const valores = valor
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return valores.length > 0 ? valores : undefined;
}
