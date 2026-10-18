import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BadgeNivelLogro, NivelBadge } from './badge-nivel-logro';

describe('BadgeNivelLogro', () => {
  let fixture: ComponentFixture<BadgeNivelLogro>;

  function render(nivel: NivelBadge, etiqueta = ''): HTMLElement {
    fixture.componentRef.setInput('nivel', nivel);
    fixture.componentRef.setInput('etiqueta', etiqueta);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BadgeNivelLogro] });
    fixture = TestBed.createComponent(BadgeNivelLogro);
  });

  it.each([
    ['BAJO', 'Bajo', 'badge--bajo'],
    ['MEDIO', 'Medio', 'badge--medio'],
    ['ALTO', 'Alto', 'badge--alto'],
    ['SOBRESALIENTE', 'Sobresaliente', 'badge--sobresaliente'],
    ['SIN_DATOS', 'Sin datos suficientes', 'badge--sin-datos'],
    ['SIN_EVALUAR', 'Sin evaluar', 'badge--sin-evaluar'],
  ] as const)('%s muestra el texto «%s» y su color', (nivel, texto, clase) => {
    const html = render(nivel);
    expect(html.textContent?.trim()).toBe(texto);
    expect(html.querySelector('.badge')?.classList).toContain(clase);
  });

  it('el color nunca va solo: siempre hay un ícono decorativo junto al texto', () => {
    const svg = render('BAJO').querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('acepta una etiqueta personalizada', () => {
    expect(render('ALTO', 'Nivel alto').textContent?.trim()).toBe('Nivel alto');
  });
});
