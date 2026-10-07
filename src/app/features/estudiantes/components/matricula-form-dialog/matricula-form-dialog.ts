import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';

import { OpcionAsignatura, OpcionSemestre } from '../../models/matricula.model';
import { MensajeError, mensajeDeError } from '../../services/estudiante-error';
import { CatalogosMatriculaService } from '../../services/catalogos-matricula.service';
import { MatriculaService } from '../../services/matricula.service';

type Campo = 'asignaturaId' | 'semestreId';

/**
 * Diálogo de matrícula, abierto desde el detalle del estudiante (RF-08). El código HTTP del
 * `POST /matriculas` —201 crea, 200 reactiva (D4)— decide el texto que se emite al padre: el
 * cuerpo de la respuesta es idéntico en ambos casos.
 */
@Component({
  selector: 'app-matricula-form-dialog',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './matricula-form-dialog.html',
  styleUrl: './matricula-form-dialog.scss',
})
export class MatriculaFormDialog {
  private readonly catalogos = inject(CatalogosMatriculaService);
  private readonly service = inject(MatriculaService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  readonly estudianteId = input.required<string>();
  readonly estudianteNombre = input('');

  /** Texto ya resuelto del aviso («matriculado» o «matrícula reactivada»): ver D4. */
  readonly matriculado = output<string>();
  readonly cerrado = output<void>();

  protected readonly guardando = signal(false);
  protected readonly errorApi = signal<MensajeError | null>(null);

  protected readonly asignaturas = signal<OpcionAsignatura[]>([]);
  protected readonly semestres = signal<OpcionSemestre[]>([]);
  protected readonly cargandoCatalogos = signal(true);
  protected readonly errorCatalogos = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    asignaturaId: ['', Validators.required],
    semestreId: ['', Validators.required],
  });

  constructor() {
    this.cargarCatalogos();
    afterNextRender(() => {
      const dialogo = this.dialogo().nativeElement;
      if (typeof dialogo.showModal === 'function' && !dialogo.open) {
        dialogo.showModal();
      }
    });
  }

  protected mostrarError(campo: Campo): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected reintentarCatalogos(): void {
    this.cargarCatalogos();
  }

  protected guardar(): void {
    this.errorApi.set(null);
    if (this.cargandoCatalogos() || this.errorCatalogos()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const { asignaturaId, semestreId } = this.form.getRawValue();
    this.service
      .matricular({ estudianteId: this.estudianteId(), asignaturaId, semestreId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.guardando.set(false);
          this.cerrarDialogo();
          this.matriculado.emit(
            respuesta.status === 201 ? 'Estudiante matriculado.' : 'Matrícula reactivada.',
          );
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

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    this.errorCatalogos.set(false);
    forkJoin({
      asignaturas: this.catalogos.listarAsignaturas().pipe(catchError(() => of(null))),
      semestres: this.catalogos.listarSemestres().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ asignaturas, semestres }) => {
        this.cargandoCatalogos.set(false);
        if (asignaturas === null || semestres === null) {
          this.errorCatalogos.set(true);
          this.asignaturas.set([]);
          this.semestres.set([]);
          return;
        }
        this.asignaturas.set(asignaturas);
        this.semestres.set(semestres);
      });
  }

  private cerrarDialogo(): void {
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open && typeof dialogo.close === 'function') {
      dialogo.close();
    }
  }
}
