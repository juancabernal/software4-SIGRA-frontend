import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Paginador } from './paginador';

describe('Paginador', () => {
  let fixture: ComponentFixture<Paginador>;
  let html: HTMLElement;
  let paginas: number[];
  let tamanos: number[];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Paginador] });
    fixture = TestBed.createComponent(Paginador);
    html = fixture.nativeElement as HTMLElement;
    paginas = [];
    tamanos = [];
    fixture.componentInstance.cambioPagina.subscribe((p) => paginas.push(p));
    fixture.componentInstance.cambioTamano.subscribe((t) => tamanos.push(t));
  });

  const boton = (texto: string) =>
    Array.from(html.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === texto,
    ) as HTMLButtonElement;

  async function fijar(total: number, pagina: number, tamanoPagina: number): Promise<void> {
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('pagina', pagina);
    fixture.componentRef.setInput('tamanoPagina', tamanoPagina);
    await fixture.whenStable();
  }

  it('muestra «Página X de Y» y ofrece 5/10/25/50 con 10 por defecto', async () => {
    await fijar(45, 2, 10);
    expect(html.querySelector('.paginador__texto')?.textContent).toBe('Página 2 de 5');
    const opciones = Array.from(html.querySelectorAll('#paginador-tamano option'));
    expect(opciones.map((o) => o.textContent?.trim())).toEqual([
      '5 por página',
      '10 por página',
      '25 por página',
      '50 por página',
    ]);
    expect((html.querySelector('#paginador-tamano') as HTMLSelectElement).value).toBe('10');
  });

  it('Anterior y Siguiente emiten la página, pero no en los extremos (aria-disabled)', async () => {
    await fijar(25, 1, 10);
    expect(boton('Anterior').getAttribute('aria-disabled')).toBe('true');
    expect(boton('Anterior').disabled).toBe(false);
    boton('Anterior').click();
    expect(paginas).toEqual([]);

    boton('Siguiente').click();
    expect(paginas).toEqual([2]);

    await fijar(25, 3, 10);
    expect(boton('Siguiente').getAttribute('aria-disabled')).toBe('true');
    boton('Siguiente').click();
    expect(paginas).toEqual([2]);

    boton('Anterior').click();
    expect(paginas).toEqual([2, 2]);
  });

  it('cambiar el tamaño de página emite el nuevo valor', async () => {
    await fijar(100, 1, 10);
    const select = html.querySelector('#paginador-tamano') as HTMLSelectElement;
    select.value = '25';
    select.dispatchEvent(new Event('change'));
    expect(tamanos).toEqual([25]);
  });

  it('con un solo registro muestra «Página 1 de 1» y ambos extremos deshabilitados', async () => {
    await fijar(1, 1, 10);
    expect(html.querySelector('.paginador__texto')?.textContent).toBe('Página 1 de 1');
    expect(boton('Anterior').getAttribute('aria-disabled')).toBe('true');
    expect(boton('Siguiente').getAttribute('aria-disabled')).toBe('true');
  });
});
