import { Injectable, InjectionToken, inject } from '@angular/core';
import confettiLib from 'canvas-confetti';

/**
 * Indirección para pruebas: `vi.mock` de un módulo ESM no es fiable con el bundler de pruebas de
 * este proyecto cuando corren muchos specs a la vez (el mock no siempre se aplica a tiempo). Con
 * un token inyectable, el spec reemplaza la función real por un `vi.fn()` vía `TestBed`, sin
 * depender de cómo el bundler resuelva el import.
 */
export const CONFETTI_FN = new InjectionToken<typeof confettiLib>('CONFETTI_FN', {
  providedIn: 'root',
  factory: () => confettiLib,
});

const BASE: confetti.Options = {
  particleCount: 500,
  spread: 80,
  angle: 50,
};

/** Cada ráfaga dispara una fracción de las 500 partículas base, con su propia física. */
const RAFAGAS: readonly confetti.Options[] = [
  { spread: 26, startVelocity: 55 }, // 0.25
  { spread: 60 }, // 0.2
  { spread: 100, decay: 0.91, scalar: 0.8 }, // 0.35
  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 }, // 0.1
  { spread: 120, startVelocity: 45 }, // 0.1
];
const PROPORCIONES = [0.25, 0.2, 0.35, 0.1, 0.1] as const;

/**
 * Lluvia de confeti decorativa para festejar una acción exitosa (registrar o matricular un
 * estudiante). Vive en `shared/` porque la usa más de una feature; no tiene lógica de dominio.
 *
 * Misma receta de 5 ráfagas que la demo de referencia (canvas-confetti): un cañón con física
 * variada en cada ráfaga da una sensación más llena y lenta que una sola explosión uniforme.
 */
@Injectable({ providedIn: 'root' })
export class ConfettiService {
  private readonly disparar = inject(CONFETTI_FN);

  /** Sin efecto si no hay `window` (SSR) o si el usuario pidió menos movimiento. */
  celebrar(): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    RAFAGAS.forEach((opciones, indice) => {
      this.disparar({
        ...BASE,
        ...opciones,
        particleCount: Math.floor((BASE.particleCount ?? 0) * PROPORCIONES[indice]),
      });
    });
  }
}
