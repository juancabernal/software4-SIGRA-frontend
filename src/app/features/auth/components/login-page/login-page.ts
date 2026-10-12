import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SessionService } from '../../../../core/services/session.service';
import { SesionService } from '../../../../core/services/sesion';
import { UsuarioSesion } from '../../../../core/models/sesion.model';
import { destinoDespuesDeLogin } from '../../../../core/guards/auth.guard';
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

/** El backend acepta como máximo 72 bytes UTF-8, no 72 caracteres. */
export function contrasenaMaxBytesValidator(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '');
  const bytes = new TextEncoder().encode(valor).byteLength;
  return bytes <= 72 ? null : { maxBytes: { requiredBytes: 72, actualBytes: bytes } };
}

/**
 * Pantalla de inicio de sesión (RF-04). Coordina el formulario, el AuthService y el SessionService.
 *
 * Tras guardar la sesión entra a la pantalla por defecto del rol (§7.2), que `SesionService`
 * resuelve. Sigue sin aplicar autorización: los guards son RF-05 y la autorización real la impone
 * el backend en cada endpoint (RNF-13). El bloque de confirmación de la plantilla queda como
 * estado visible mientras se resuelve la navegación, y como salida si esta no se concreta.
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
  private readonly shell = inject(SesionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cargando = signal(false);
  protected readonly errorApi = signal<string | null>(null);
  protected readonly usuarioAutenticado = signal<UsuarioSesion | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    correoInstitucional: ['', [correoInstitucionalValidator, Validators.maxLength(254)]],
    contrasena: ['', [Validators.required, contrasenaMaxBytesValidator]],
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          if (!this.sesion.saveSession(respuesta)) {
            this.cargando.set(false);
            this.errorApi.set('La respuesta de autenticación no es válida. Intenta nuevamente.');
            return;
          }
          this.form.controls.contrasena.reset('');
          this.cargando.set(false);
          this.usuarioAutenticado.set(respuesta.usuario);
          // La sesión vive en sessionStorage, que no avisa cuando cambia: hay que releerla antes
          // de navegar para que el shell pinte el menú del rol correcto en el primer render.
          this.shell.refrescar();
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigateByUrl(destinoDespuesDeLogin(returnUrl, respuesta.usuario.rol));
        },
        error: (error: unknown) => {
          this.cargando.set(false);
          this.errorApi.set(mensajeDeErrorLogin(error));
        },
      });
  }
}
