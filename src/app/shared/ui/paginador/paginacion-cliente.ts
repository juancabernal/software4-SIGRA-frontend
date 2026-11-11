import { Signal, computed, signal } from '@angular/core';

/** Tamaño de página por defecto, igual que en el catálogo académico (Materias). */
export const TAMANO_PAGINA_DEFECTO = 10;

/**
 * Paginación en cliente sobre una lista ya cargada, para usar junto con `<app-paginador>`.
 * Replica el patrón de «Materias»: recorta la lista por página y corrige la página pedida si
 * quedó fuera de rango (p. ej. tras filtrar o cambiar el tamaño).
 *
 * Debe crearse en un contexto de inyección o como inicializador de campo del componente.
 */
export function paginarEnCliente<T>(
  lista: Signal<readonly T[]>,
  tamanoInicial: number = TAMANO_PAGINA_DEFECTO,
) {
  const pagina = signal(1);
  const tamanoPagina = signal<number>(tamanoInicial);

  const total = computed(() => lista().length);
  const totalPaginas = computed(() => Math.max(1, Math.ceil(total() / tamanoPagina())));
  const paginaSegura = computed(() => Math.min(Math.max(1, pagina()), totalPaginas()));
  const filas = computed(() => {
    const inicio = (paginaSegura() - 1) * tamanoPagina();
    return lista().slice(inicio, inicio + tamanoPagina());
  });

  return {
    total,
    pagina: paginaSegura,
    tamanoPagina: tamanoPagina.asReadonly(),
    filas,
    irA: (nueva: number) => pagina.set(nueva),
    cambiarTamano: (tamano: number) => {
      tamanoPagina.set(tamano);
      pagina.set(1);
    },
    reiniciar: () => pagina.set(1),
  };
}
