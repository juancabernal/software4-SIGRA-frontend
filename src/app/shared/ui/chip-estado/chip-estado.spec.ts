import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChipEstado } from './chip-estado';

describe('ChipEstado', () => {
  let fixture: ComponentFixture<ChipEstado>;
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChipEstado] });
    fixture = TestBed.createComponent(ChipEstado);
    html = fixture.nativeElement as HTMLElement;
  });

  it('muestra el texto del estado con la variante indicada', async () => {
    fixture.componentRef.setInput('etiqueta', 'Activa');
    fixture.componentRef.setInput('variante', 'ok');
    await fixture.whenStable();

    const chip = html.querySelector('.chip') as HTMLElement;
    expect(chip.textContent?.trim()).toBe('Activa');
    expect(chip.classList).toContain('chip--ok');
  });

  it('usa la variante neutra por defecto', async () => {
    fixture.componentRef.setInput('etiqueta', 'Borrador');
    await fixture.whenStable();

    expect(html.querySelector('.chip')?.classList).toContain('chip--neutro');
  });

  it('acompaña el texto con un ícono decorativo oculto para lectores de pantalla', async () => {
    fixture.componentRef.setInput('etiqueta', 'Inactiva');
    fixture.componentRef.setInput('icono', 'prohibido');
    await fixture.whenStable();

    const svg = html.querySelector('svg') as SVGElement;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('sin ícono solo muestra el texto', async () => {
    fixture.componentRef.setInput('etiqueta', 'Borrador');
    await fixture.whenStable();

    expect(html.querySelector('svg')).toBeNull();
  });
});
