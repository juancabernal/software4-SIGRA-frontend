import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { SessionService } from '../../../../core/services/session.service';
import { UsuarioSesion } from '../../../../core/models/sesion.model';
import { AuthService } from '../../services/auth.service';
import { mensajeDeErrorLogin } from '../../services/login-error';

const DOMINIO_INSTITUCIONAL = /^[^\s@]+@uco\.net\.co$/;

/** Quita espacios de los extremos y pasa a minúsculas. Solo se aplica al correo, nunca a la contraseña. */
export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

/** El correo es obligatorio y debe terminar en @uco.net.co, sin distinguir mayúsculas. */
export function correoInstitucionalValidator(control: AbstractControl): ValidationErrors | null {
  const correo = normalizarCorreo(String(control.value ?? ''));
  if (correo === '') {
    return { required: true };
  }
  return DOMINIO_INSTITUCIONAL.test(correo) ? null : { dominioInstitucional: true };
}

/**
 * Pantalla de inicio de sesión (RF-04). Coordina el formulario, el AuthService y el SessionService.
 * No aplica autorización: la redirección por rol llegará con RF-05.
 * POST_LOGIN_DESTINATION_PENDING: tras el login solo se muestra la confirmación en esta página.
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly sesion = inject(SessionService);

  protected readonly cargando = signal(false);
  protected readonly errorApi = signal<string | null>(null);
  protected readonly usuarioAutenticado = signal<UsuarioSesion | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    correoInstitucional: ['', correoInstitucionalValidator],
    contrasena: ['', Validators.required],
  });

  protected mostrarError(campo: 'correoInstitucional' | 'contrasena'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected iniciarSesion(): void {
    if (this.cargando()) {
      return;
    }
    this.errorApi.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { correoInstitucional, contrasena } = this.form.getRawValue();
    this.cargando.set(true);
    this.auth
      .login({ correoInstitucional: normalizarCorreo(correoInstitucional), contrasena })
      .subscribe({
        next: (respuesta) => {
          this.sesion.saveSession(respuesta);
          this.form.controls.contrasena.reset('');
          this.cargando.set(false);
          this.usuarioAutenticado.set(respuesta.usuario);
        },
        error: (error: unknown) => {
          this.cargando.set(false);
          this.errorApi.set(mensajeDeErrorLogin(error));
        },
      });
  }
}
