import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalCrud } from './modal-crud';

@Component({
  imports: [ModalCrud],
  template: `
    <button type="button" id="abridor" (click)="abierto.set(true)">Abrir</button>
    <app-modal-crud
      titulo="Registrar materia"
      etiquetaEnviar="Registrar"
      [abierto]="abierto()"
      [procesando]="procesando()"
      [error]="error()"
      [detalles]="detalles()"
      [enviarDeshabilitado]="deshabilitado()"
      (enviar)="envios = envios + 1"
      (cancelar)="cancelaciones = cancelaciones + 1; abierto.set(false)"
      (envioBloqueado)="bloqueos = bloqueos + 1"
    >
      <input id="solo-lectura" readonly value="MAT-401" />
      <input id="primero" />
      <input id="segundo" />
    </app-modal-crud>
  `,
})
class Anfitrion {
  readonly abierto = signal(false);
  readonly procesando = signal(false);
  readonly error = signal<string | null>(null);
  readonly detalles = signal<string[]>([]);
  readonly deshabilitado = signal(false);
  envios = 0;
  cancelaciones = 0;
  bloqueos = 0;
}

describe('ModalCrud', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let html: HTMLElement;
  let anfitrion: Anfitrion;

  const dialogo = () => html.querySelector('dialog') as HTMLDialogElement;
  const estaAbierto = () => dialogo().open || dialogo().hasAttribute('open');
  const enviarBoton = () => html.querySelector('button[type="submit"]') as HTMLButtonElement;
  const enviarFormulario = async () => {
    (html.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Anfitrion] });
    fixture = TestBed.createComponent(Anfitrion);
    anfitrion = fixture.componentInstance;
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

  it('se abre con su título y lleva el foco al primer campo editable', async () => {
    await abrir();

    expect(estaAbierto()).toBe(true);
    const titulo = dialogo().querySelector('h2') as HTMLElement;
    expect(titulo.textContent?.trim()).toBe('Registrar materia');
    expect(dialogo().getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(document.activeElement?.id).toBe('primero');
  });

  it('enviar el formulario emite enviar', async () => {
    await abrir();
    expect(enviarBoton().textContent?.trim()).toBe('Registrar');

    await enviarFormulario();
    expect(anfitrion.envios).toBe(1);
  });

  it('con enviarDeshabilitado usa aria-disabled, no emite enviar y avisa el intento', async () => {
    anfitrion.deshabilitado.set(true);
    await abrir();

    expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
    expect(enviarBoton().disabled).toBe(false);
    await enviarFormulario();
    expect(anfitrion.envios).toBe(0);
    expect(anfitrion.bloqueos).toBe(1);
  });

  it('mientras procesa muestra «Procesando…», no envía ni cancela', async () => {
    anfitrion.procesando.set(true);
    await abrir();

    expect(enviarBoton().textContent?.trim()).toBe('Procesando…');
    expect(enviarBoton().getAttribute('aria-disabled')).toBe('true');
    await enviarFormulario();
    dialogo().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(anfitrion.envios).toBe(0);
    expect(anfitrion.bloqueos).toBe(0);
    expect(anfitrion.cancelaciones).toBe(0);
  });

  it('Cancelar, la X y Esc emiten cancelar; al cerrar el foco vuelve a quien abrió', async () => {
    await abrir();
    const cancelar = Array.from(dialogo().querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancelar',
    ) as HTMLButtonElement;
    cancelar.click();
    await fixture.whenStable();
    expect(anfitrion.cancelaciones).toBe(1);
    expect(estaAbierto()).toBe(false);
    expect(document.activeElement?.id).toBe('abridor');

    await abrir();
    (dialogo().querySelector('[aria-label="Cerrar"]') as HTMLButtonElement).click();
    await abrir();
    dialogo().dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(anfitrion.cancelaciones).toBe(3);
  });

  it('muestra el error y sus detalles en una región de alerta', async () => {
    await abrir();
    anfitrion.error.set('Los datos de entrada no cumplen con las validaciones requeridas');
    anfitrion.detalles.set(['El nombre es obligatorio']);
    await fixture.whenStable();

    const alerta = dialogo().querySelector('[role="alert"]') as HTMLElement;
    expect(alerta.textContent).toContain('no cumplen con las validaciones');
    expect(alerta.querySelector('li')?.textContent).toBe('El nombre es obligatorio');
  });
});
