import { Subject } from 'rxjs';

import { marcarRefrescoSilencioso } from './consulta-con-refresco';

describe('marcarRefrescoSilencioso', () => {
  it('solo es silenciosa la consulta disparada únicamente por el refresco', () => {
    const disparo = new Subject<{ id: string; recarga: number; refresco: number }>();
    const marcas: boolean[] = [];
    disparo.pipe(marcarRefrescoSilencioso()).subscribe((d) => marcas.push(d.silencioso));

    disparo.next({ id: 'a', recarga: 0, refresco: 0 }); // primera consulta
    disparo.next({ id: 'a', recarga: 0, refresco: 1 }); // refresco automático
    disparo.next({ id: 'b', recarga: 0, refresco: 1 }); // cambio de selección
    disparo.next({ id: 'b', recarga: 1, refresco: 1 }); // recarga pedida
    disparo.next({ id: 'c', recarga: 1, refresco: 2 }); // selección y refresco a la vez
    disparo.next({ id: 'c', recarga: 1, refresco: 2 }); // idéntico: se descarta

    expect(marcas).toEqual([false, true, false, false, false]);
  });
});
