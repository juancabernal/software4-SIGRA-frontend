import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

import { Semestre } from '../../models/semestre.model';
import { formatearFecha, sumarDias } from '../../models/semestre-fechas';
import { MensajeError, mensajeDeError } from '../../services/semestre-error';
import { SemestreService } from '../../services/semestre.service';

/**
 * Única modificación permitida: extender la fecha de fin. Validación de experiencia de usuario
 * (la nueva fecha debe ser posterior a la actual); el backend valida además que el semestre
 * no haya terminado y que la extensión no se cruce con otro semestre.
 */
export function posteriorA(fechaActual: () => string): ValidatorFn {
  return (control) => {
    const valor = control.value as string;
    return valor && valor <= fechaActual() ? { noExtiende: true } : null;
  };
}

@Component({
  selector: 'app-semestre-extender-dialog',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './semestre-extender-dialog.html',
  styleUrl: './semestre-extender-dialog.scss',
})
export class SemestreExtenderDialog {
  private readonly service = inject(SemestreService);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  readonly semestre = input.required<Semestre>();
  readonly extendido = output<Semestre>();
  readonly cerrado = output<void>();

  protected readonly guardando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);
  protected readonly minimo = computed(() => sumarDias(this.semestre().fechaFin, 1));
  protected readonly inicioTexto = computed(() => formatearFecha(this.semestre().fechaInicio));
  protected readonly finTexto = computed(() => formatearFecha(this.semestre().fechaFin));

  protected readonly fechaFin = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, posteriorA(() => this.semestre().fechaFin)],
  });

  constructor() {
    afterNextRender(() => {
      const dialogo = this.dialogo().nativeElement;
      if (typeof dialogo.showModal === 'function' && !dialogo.open) {
        dialogo.showModal();
      }
    });
  }

  protected mostrarError(): boolean {
    return this.fechaFin.invalid && (this.fechaFin.touched || this.fechaFin.dirty);
  }

  protected guardar(): void {
    this.errorApi.set(null);
    if (this.fechaFin.invalid) {
      this.fechaFin.markAsTouched();
      return;
    }
    this.guardando.set(true);
    this.service
      .extenderFechaFin(this.semestre().codigo, { fechaFin: this.fechaFin.value })
      .subscribe({
        next: (semestre) => {
          this.guardando.set(false);
          this.cerrarDialogo();
          this.extendido.emit(semestre);
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          this.errorApi.set(mensajeDeError(error));
        },
      });
  }

  protected cancelar(): void {
    this.cerrarDialogo();
    this.cerrado.emit();
  }

  protected alCancelarNativo(evento: Event): void {
    evento.preventDefault();
    if (!this.guardando()) {
      this.cancelar();
    }
  }

  private cerrarDialogo(): void {
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open && typeof dialogo.close === 'function') {
      dialogo.close();
    }
  }
}
