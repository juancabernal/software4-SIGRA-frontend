import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { MensajeError, mensajeDeError } from '../../../../core/http/mensaje-de-error';
import { Profesor, TipoDocumentoOpcion } from '../../models/profesor.model';
import { ProfesorService } from '../../services/profesor.service';
import { TipoDocumentoOpcionesService } from '../../services/tipo-documento-opciones.service';

/** Mismo patrón que valida el backend (@Pattern en ProfesorRequestDTO). */
export const PATRON_NUMERO_DOCUMENTO = /^\d{6,10}$/;
export const PATRON_CORREO_INSTITUCIONAL = /^[\w.-]+@uco\.net\.co$/;

/**
 * Diálogo de Registrar / Modificar profesor (RF-01). El mismo componente sirve para las dos
 * acciones: si `profesor` llega con valor, el formulario se precarga y «Guardar» llama a
 * `modificar`; si es null, llama a `registrar`. El `id` del profesor en edición no es parte
 * del formulario: se guarda aparte para construir la URL del PUT.
 */
@Component({
  selector: 'app-profesor-form-dialog',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profesor-form-dialog.html',
  styleUrl: './profesor-form-dialog.scss',
})
export class ProfesorFormDialog implements OnInit {
  private readonly service = inject(ProfesorService);
  private readonly tiposDocumentoService = inject(TipoDocumentoOpcionesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  /** Profesor a modificar; null (u omitido) para registrar uno nuevo. */
  readonly profesor = input<Profesor | null>(null);

  readonly guardado = output<Profesor>();
  readonly cerrado = output<void>();

  protected readonly esModificar = computed(() => this.profesor() !== null);
  protected readonly titulo = computed(() =>
    this.esModificar() ? 'Modificar profesor' : 'Registrar profesor',
  );
  protected readonly etiquetaGuardar = computed(() => {
    if (this.guardando()) {
      return this.esModificar() ? 'Guardando…' : 'Registrando…';
    }
    return this.esModificar() ? 'Guardar cambios' : 'Registrar profesor';
  });

  protected readonly guardando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);
  protected readonly tiposDocumento = signal<TipoDocumentoOpcion[]>([]);
  protected readonly cargandoTiposDocumento = signal(true);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    tipoDocumentoId: ['', Validators.required],
    numeroDocumento: [
      '',
      [Validators.required, Validators.pattern(PATRON_NUMERO_DOCUMENTO)],
    ],
    nombreCompleto: ['', Validators.required],
    correoInstitucional: [
      '',
      [Validators.required, Validators.pattern(PATRON_CORREO_INSTITUCIONAL)],
    ],
  });

  constructor() {
    this.tiposDocumentoService
      .listar()
      .pipe(
        catchError(() => of([] as TipoDocumentoOpcion[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((tipos) => {
        this.tiposDocumento.set(tipos);
        this.cargandoTiposDocumento.set(false);
      });

    afterNextRender(() => {
      const dialogo = this.dialogo().nativeElement;
      if (typeof dialogo.showModal === 'function' && !dialogo.open) {
        dialogo.showModal();
      }
    });
  }

  ngOnInit(): void {
    const profesor = this.profesor();
    if (profesor) {
      // tipoDocumentoId no viaja en ProfesorResponseDTO (solo tipoDocumentoNombre), así que al
      // modificar el selector arranca vacío y el usuario debe volver a elegir el tipo de
      // documento. Si el backend llega a exponer el id en la respuesta, se precarga aquí.
      this.form.patchValue({
        numeroDocumento: profesor.numeroDocumento,
        nombreCompleto: profesor.nombreCompleto,
        correoInstitucional: profesor.correoInstitucional,
      });

      // BLOQUEAR EL NÚMERO DE DOCUMENTO PARA QUE NO SEA MODIFICABLE EN LA VISTA
      this.form.controls.numeroDocumento.disable();
    }
  }

  protected mostrarError(
    campo: 'tipoDocumentoId' | 'numeroDocumento' | 'nombreCompleto' | 'correoInstitucional',
  ): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected guardar(): void {
    this.errorApi.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    
    // getRawValue() captura todos los campos, incluyendo los que deshabilitamos con disable()
    const dto = this.form.getRawValue(); 
    
    const profesor = this.profesor();
    const peticion = profesor
      ? this.service.modificar(profesor.id, dto)
      : this.service.registrar(dto);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resultado) => {
        this.guardando.set(false);
        this.cerrarDialogo();
        this.guardado.emit(resultado);
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

  /** Tecla Escape: el navegador cierra el diálogo; avisamos al padre. */
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