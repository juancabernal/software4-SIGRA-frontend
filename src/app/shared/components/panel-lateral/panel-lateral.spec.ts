import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelLateral } from './panel-lateral';

@Component({
  imports: [PanelLateral],
  template: `
    <button type="button" id="abridor" (click)="abierto.set(true)">Abrir</button>
    <app-panel-lateral titulo="Detalle" [abierto]="abierto()" (cerrar)="alCerrar()">
      <p id="cuerpo">Contenido proyectado</p>
    </app-panel-lateral>
  `,
})
class Anfitrion {
  readonly abierto = signal(false);
  cierres = 0;
  alCerrar(): void {
    this.cierres++;
    this.abierto.set(false);
  }
}

describe('PanelLateral', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let html: HTMLElement;

  const dialogo = () => html.querySelector('dialog') as HTMLDialogElement;
  const estaAbierto = () => dialogo().open || dialogo().hasAttribute('open');

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Anfitrion] });
    fixture = TestBed.createComponent(Anfitrion);
    html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    await fixture.whenStable();
  });

  afterEach(() => html.remove());

  async function abrir(): Promise<void> {
    const abridor = html.querySelector('#abridor') as HTMLButtonElement;
    abridor.focus();
    abridor.click();
    await fixture.whenStable();
  }

  it('empieza cerrado y proyecta el contenido', () => {
    expect(estaAbierto()).toBe(false);
    expect(html.querySelector('#cuerpo')?.textContent).toContain('Contenido proyectado');
  });

  it('se abre, nombra el diálogo con su título y lleva el foco al botón cerrar', async () => {
    await abrir();

    expect(estaAbierto()).toBe(true);
    const titulo = html.querySelector('h2') as HTMLElement;
    expect(titulo.textContent?.trim()).toBe('Detalle');
    expect(dialogo().getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar panel');
  });

  it('el botón X cierra y devuelve el foco a quien lo abrió', async () => {
    await abrir();

    (html.querySelector('[aria-label="Cerrar panel"]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(fixture.componentInstance.cierres).toBe(1);
    expect(estaAbierto()).toBe(false);
    expect(document.activeElement?.id).toBe('abridor');
  });

  it('Esc (evento cancel) pide cerrar', async () => {
    await abrir();

    dialogo().dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.cierres).toBe(1);
    expect(estaAbierto()).toBe(false);
  });

  it('un clic en el fondo cierra, pero no un clic en el contenido', async () => {
    await abrir();

    (html.querySelector('#cuerpo') as HTMLElement).click();
    expect(fixture.componentInstance.cierres).toBe(0);

    dialogo().click();
    await fixture.whenStable();
    expect(fixture.componentInstance.cierres).toBe(1);
  });
});
