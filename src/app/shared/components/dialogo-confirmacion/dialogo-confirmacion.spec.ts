import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogoConfirmacion } from './dialogo-confirmacion';

@Component({
  imports: [DialogoConfirmacion],
  template: `
    <app-dialogo-confirmacion
      titulo="¿Inactivar «Cálculo»?"
      descripcion="No se elimina nada."
      etiquetaConfirmar="Inactivar"
      tono="peligro"
      [abierto]="abierto()"
      [procesando]="procesando()"
      [error]="error()"
      (confirmar)="confirmaciones = confirmaciones + 1"
      (cancelar)="cancelaciones = cancelaciones + 1"
    />
    <app-dialogo-confirmacion titulo="Otro" [abierto]="false" />
  `,
})
class Anfitrion {
  readonly abierto = signal(false);
  readonly procesando = signal(false);
  readonly error = signal<string | null>(null);
  confirmaciones = 0;
  cancelaciones = 0;
}

describe('DialogoConfirmacion', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let html: HTMLElement;

  const dialogo = () => html.querySelector('dialog') as HTMLDialogElement;
  const botones = () => Array.from(dialogo().querySelectorAll('button')) as HTMLButtonElement[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Anfitrion] });
    fixture = TestBed.createComponent(Anfitrion);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    await fixture.whenStable();
  });

  afterEach(() => html.remove());

  async function abrir(): Promise<void> {
    fixture.componentInstance.abierto.set(true);
    await fixture.whenStable();
  }

  it('se abre con título y descripción enlazados con ids únicos', async () => {
    await abrir();

    expect(dialogo().open || dialogo().hasAttribute('open')).toBe(true);
    const titulo = dialogo().querySelector('h2') as HTMLElement;
    const descripcion = dialogo().querySelector('p') as HTMLElement;
    expect(dialogo().getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(dialogo().getAttribute('aria-describedby')).toBe(descripcion.id);

    const otro = html.querySelectorAll('dialog')[1];
    expect(otro.getAttribute('aria-labelledby')).not.toBe(titulo.id);
  });

  it('pone el foco inicial en «Cancelar»', async () => {
    await abrir();
    expect(document.activeElement?.textContent?.trim()).toBe('Cancelar');
  });

  it('emite confirmar y cancelar desde sus botones', async () => {
    await abrir();
    const [cancelar, confirmar] = botones();

    confirmar.click();
    cancelar.click();

    expect(confirmar.textContent?.trim()).toBe('Inactivar');
    expect(confirmar.classList).toContain('btn--peligro');
    expect(fixture.componentInstance.confirmaciones).toBe(1);
    expect(fixture.componentInstance.cancelaciones).toBe(1);
  });

  it('Esc (evento cancel) equivale a cancelar', async () => {
    await abrir();
    dialogo().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(fixture.componentInstance.cancelaciones).toBe(1);
  });

  it('mientras procesa deshabilita ambos botones, muestra «Procesando…» e ignora Esc', async () => {
    await abrir();
    fixture.componentInstance.procesando.set(true);
    await fixture.whenStable();

    const [cancelar, confirmar] = botones();
    expect(cancelar.disabled).toBe(true);
    expect(confirmar.disabled).toBe(true);
    expect(confirmar.textContent?.trim()).toBe('Procesando…');

    dialogo().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(fixture.componentInstance.cancelaciones).toBe(0);
  });

  it('muestra el error en una región de alerta', async () => {
    await abrir();
    fixture.componentInstance.error.set('La asignatura ya está inactiva.');
    await fixture.whenStable();

    const alerta = dialogo().querySelector('[role="alert"]') as HTMLElement;
    expect(alerta.textContent?.trim()).toBe('La asignatura ya está inactiva.');
  });
});
