import { Observable, OperatorFunction, filter, map } from 'rxjs';

/**
 * Marca como «silenciosa» la consulta que se dispara solo porque avanzó el contador `refresco`
 * (refresco automático en segundo plano) y no por un cambio de selección o una recarga pedida.
 * Descarta además los disparos idénticos al anterior, que no deben repetir la consulta.
 *
 * Con la marca, la vista puede volver a consultar sin mostrar «Cargando…» ni borrar lo que ya hay
 * en pantalla, y conservar los datos si esa consulta de fondo falla.
 */
export function marcarRefrescoSilencioso<T extends { refresco: number }>(): OperatorFunction<
  T,
  T & { silencioso: boolean }
> {
  return (fuente: Observable<T>) => {
    let anterior: T | null = null;
    const iguales = (a: T, b: T, ignorar?: keyof T) =>
      (Object.keys(b) as (keyof T)[]).every((clave) => clave === ignorar || a[clave] === b[clave]);

    return fuente.pipe(
      filter((actual) => anterior === null || !iguales(anterior, actual)),
      map((actual) => {
        const previo = anterior;
        anterior = actual;
        const silencioso = previo !== null && iguales(previo, actual, 'refresco');
        return { ...actual, silencioso };
      }),
    );
  };
}
