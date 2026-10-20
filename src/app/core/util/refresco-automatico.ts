import { DestroyRef, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';

/** Señal que se incrementa cada `intervaloMs` mientras la pestaña está visible; en SSR no hace nada. */
export function refrescoAutomatico(intervaloMs = 15000): Signal<number> {
  const contador = signal(0);

  if (isPlatformServer(inject(PLATFORM_ID))) {
    return contador;
  }

  const intervalo = setInterval(() => {
    if (document.visibilityState === 'visible') {
      contador.update((valor) => valor + 1);
    }
  }, intervaloMs);

  const alCambiarVisibilidad = () => {
    if (document.visibilityState === 'visible') {
      contador.update((valor) => valor + 1);
    }
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  inject(DestroyRef).onDestroy(() => {
    clearInterval(intervalo);
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  });

  return contador;
}
