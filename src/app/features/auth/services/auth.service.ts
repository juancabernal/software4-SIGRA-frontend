import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.model';

/**
 * Acceso HTTP a la API de autenticación. No navega, no muestra mensajes y no guarda la sesión:
 * eso lo hacen la página de login y SessionService.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly loginUrl = `${environment.apiUrl}/v1/auth/login`;

  /** Los errores llegan como HttpErrorResponse para que quien llama decida según el status. */
  login(solicitud: LoginRequest): Observable<LoginResponse> {
    const cuerpo: LoginRequest = {
      correoInstitucional: solicitud.correoInstitucional,
      contrasena: solicitud.contrasena,
    };
    return this.http.post<LoginResponse>(this.loginUrl, cuerpo);
  }
}
