import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { mensajeDeError } from './mensaje-de-error';

export interface ApiErrorState {
  readonly status: number;
  readonly mensaje: string;
  /** Identificador técnico para soporte; nunca contiene el cuerpo de la respuesta. */
  readonly requestId: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  private readonly ultimoError = signal<ApiErrorState | null>(null);
  readonly error = this.ultimoError.asReadonly();

  reportar(error: unknown): void {
    const http = error instanceof HttpErrorResponse ? error : null;
    this.ultimoError.set({
      status: http?.status ?? 0,
      mensaje: mensajeDeError(error).mensaje,
      requestId: http?.headers.get('X-Request-Id') ?? null,
    });
  }

  limpiar(): void {
    this.ultimoError.set(null);
  }
}
