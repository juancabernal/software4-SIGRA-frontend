import { signal } from '@angular/core';

import { TAMANO_PAGINA_DEFECTO, paginarEnCliente } from './paginacion-cliente';

describe('paginarEnCliente', () => {
  const numeros = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

  it('arranca en la página 1 con 10 registros por página', () => {
    const p = paginarEnCliente(signal(numeros(23)));

    expect(TAMANO_PAGINA_DEFECTO).toBe(10);
    expect(p.pagina()).toBe(1);
    expect(p.total()).toBe(23);
    expect(p.filas()).toEqual(numeros(10));
  });

  it('recorta la página pedida', () => {
    const p = paginarEnCliente(signal(numeros(23)));

    p.irA(3);
    expect(p.filas()).toEqual([21, 22, 23]);
  });

  it('al cambiar el tamaño vuelve a la página 1', () => {
    const p = paginarEnCliente(signal(numeros(23)));
    p.irA(2);

    p.cambiarTamano(5);
    expect(p.pagina()).toBe(1);
    expect(p.filas()).toEqual(numeros(5));
  });

  it('corrige la página si la lista se acorta', () => {
    const lista = signal(numeros(23));
    const p = paginarEnCliente(lista);
    p.irA(3);

    lista.set(numeros(4));
    expect(p.pagina()).toBe(1);
    expect(p.filas()).toEqual(numeros(4));
  });

  it('respeta un tamaño inicial distinto y reiniciar vuelve a la página 1', () => {
    const p = paginarEnCliente(signal(numeros(12)), 5);
    p.irA(3);
    expect(p.filas()).toEqual([11, 12]);

    p.reiniciar();
    expect(p.pagina()).toBe(1);
  });
});
