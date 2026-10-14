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
      [gestoRequerido]="gestoRequerido()"
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
  readonly gestoRequerido = signal('');
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

  describe('confirmación reforzada con gestoRequerido', () => {
    const TEXTO_GESTO = 'Entiendo que ya hay calificaciones y que se conservarán.';
    const casilla = () => dialogo().querySelector('input[type="checkbox"]') as HTMLInputElement;

    async function abrirConGesto(): Promise<void> {
      fixture.componentInstance.gestoRequerido.set(TEXTO_GESTO);
      await abrir();
    }

    async function marcar(): Promise<void> {
      casilla().checked = true;
      casilla().dispatchEvent(new Event('change'));
      await fixture.whenStable();
    }

    it('sin gestoRequerido no pinta ninguna casilla y confirma de un clic', async () => {
      await abrir();

      expect(dialogo().querySelector('input[type="checkbox"]')).toBeNull();
      const [, confirmar] = botones();
      expect(confirmar.disabled).toBe(false);

      confirmar.click();
      expect(fixture.componentInstance.confirmaciones).toBe(1);
    });

    it('con gestoRequerido nace deshabilitado y no emite confirmar al pulsarlo', async () => {
      await abrirConGesto();

      const [, confirmar] = botones();
      expect(confirmar.disabled).toBe(true);

      confirmar.click();
      expect(fixture.componentInstance.confirmaciones).toBe(0);
    });

    it('la casilla lleva el texto del gesto y su etiqueta asociada por id', async () => {
      await abrirConGesto();

      const etiqueta = dialogo().querySelector('label') as HTMLLabelElement;
      expect(etiqueta.textContent?.trim()).toBe(TEXTO_GESTO);
      expect(etiqueta.getAttribute('for')).toBe(casilla().id);
      expect(casilla().id).toBeTruthy();
    });

    it('al marcar la casilla se habilita el botón y sí emite confirmar', async () => {
      await abrirConGesto();
      await marcar();

      const [, confirmar] = botones();
      expect(confirmar.disabled).toBe(false);

      confirmar.click();
      expect(fixture.componentInstance.confirmaciones).toBe(1);
    });

    it('anuncia al lector de pantalla el cambio de estado del botón de confirmar', async () => {
      await abrirConGesto();

      const aviso = () => dialogo().querySelector('[role="status"]') as HTMLElement;
      expect(aviso().getAttribute('aria-live')).toBe('polite');
      expect(aviso().textContent?.trim()).toBe('Marca la casilla para habilitar la confirmación.');

      await marcar();
      expect(aviso().textContent?.trim()).toBe('Confirmación habilitada.');
    });

    it('al cerrar y reabrir, la casilla vuelve desmarcada y el botón bloqueado', async () => {
      await abrirConGesto();
      await marcar();
      expect(casilla().checked).toBe(true);

      fixture.componentInstance.abierto.set(false);
      await fixture.whenStable();
      await abrir();

      expect(casilla().checked).toBe(false);
      const [, confirmar] = botones();
      expect(confirmar.disabled).toBe(true);
      confirmar.click();
      expect(fixture.componentInstance.confirmaciones).toBe(0);
    });

    it('«Cancelar» y Esc siguen cancelando sin importar el gesto', async () => {
      await abrirConGesto();

      const [cancelar] = botones();
      expect(cancelar.disabled).toBe(false);
      cancelar.click();
      expect(fixture.componentInstance.cancelaciones).toBe(1);

      dialogo().dispatchEvent(new Event('cancel', { cancelable: true }));
      expect(fixture.componentInstance.cancelaciones).toBe(2);
      expect(fixture.componentInstance.confirmaciones).toBe(0);
    });

    it('mientras procesa, la casilla y los dos botones quedan bloqueados', async () => {
      await abrirConGesto();
      await marcar();
      fixture.componentInstance.procesando.set(true);
      await fixture.whenStable();

      const [cancelar, confirmar] = botones();
      expect(casilla().disabled).toBe(true);
      expect(cancelar.disabled).toBe(true);
      expect(confirmar.disabled).toBe(true);

      confirmar.click();
      expect(fixture.componentInstance.confirmaciones).toBe(0);
    });
  });
});
