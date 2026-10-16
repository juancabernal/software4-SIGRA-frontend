import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginacionTabla } from './paginacion-tabla';

describe('PaginacionTabla', () => {
  let fixture: ComponentFixture<PaginacionTabla>;
  let html: HTMLElement;
  let paginas: number[];
  let tamanos: number[];

  async function montar(total: number, pagina: number, tamano: number): Promise<void> {
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('pagina', pagina);
    fixture.componentRef.setInput('tamano', tamano);
    fixture.componentRef.setInput('elementos', 'evaluaciones');
    await fixture.whenStable();
  }

  const boton = (texto: string) =>
    Array.from(html.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(texto),
    ) as HTMLButtonElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(PaginacionTabla);
    html = fixture.nativeElement as HTMLElement;
    paginas = [];
    tamanos = [];
    fixture.componentInstance.cambioPagina.subscribe((p) => paginas.push(p));
    fixture.componentInstance.cambioTamano.subscribe((t) => tamanos.push(t));
  });

  it('muestra el rango, la página actual y las opciones 5, 10 y 15', async () => {
    await montar(12, 2, 5);

    expect(html.textContent).toContain('Mostrando 6–10 de 12 evaluaciones');
    expect(html.textContent).toContain('Página 2 de 3');
    const opciones = Array.from(html.querySelectorAll('option')).map((o) => o.textContent?.trim());
    expect(opciones).toEqual(['5', '10', '15']);
  });

  it('emite la página anterior y la siguiente', async () => {
    await montar(12, 2, 5);

    boton('Anterior').click();
    boton('Siguiente').click();
    expect(paginas).toEqual([1, 3]);
  });

  it('no sale de los extremos', async () => {
    await montar(3, 1, 5);

    expect(boton('Anterior').getAttribute('aria-disabled')).toBe('true');
    expect(boton('Siguiente').getAttribute('aria-disabled')).toBe('true');
    boton('Anterior').click();
    boton('Siguiente').click();
    expect(paginas).toEqual([]);
  });

  it('emite el nuevo tamaño de página', async () => {
    await montar(12, 1, 5);

    const selector = html.querySelector('select') as HTMLSelectElement;
    selector.value = '10';
    selector.dispatchEvent(new Event('change'));
    expect(tamanos).toEqual([10]);
  });
});
