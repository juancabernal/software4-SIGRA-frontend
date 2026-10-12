import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { ApiErrorService } from '../http/api-error.service';
import { SessionService } from '../services/session.service';
import { esApiPropia, esLogin } from './auth.interceptor';

/** Política transversal de respuestas HTTP sin alterar los errores que consumen los features. */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!esApiPropia(request.urlWithParams) || esLogin(request.urlWithParams)) {
    return next(request);
  }

  const router = inject(Router);
  const session = inject(SessionService);
  const errores = inject(ApiErrorService);

  return next(request).pipe(
    catchError((error: unknown) => {
      errores.reportar(error);
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const tokenUsado = tokenDeAutorizacion(request.headers.get('Authorization'));
        if (session.clearSessionIfToken(tokenUsado) && !router.url.startsWith('/login')) {
          const destino = router.createUrlTree(['/login'], {
            queryParams: { returnUrl: router.url },
          });
          void router.navigateByUrl(destino);
        }
      }
      return throwError(() => error);
    }),
  );
};

function tokenDeAutorizacion(authorization: string | null): string | null {
  if (authorization === null) {
    return null;
  }
  const coincidencia = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return coincidencia?.[1] ?? null;
}
