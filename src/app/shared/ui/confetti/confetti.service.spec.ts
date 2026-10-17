import { TestBed } from '@angular/core/testing';

import { CONFETTI_FN, ConfettiService } from './confetti.service';

describe('ConfettiService', () => {
  let service: ConfettiService;
  let confettiMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    confettiMock = vi.fn();
    // Se reemplaza la función real por un doble vía DI: `vi.mock` de un ESM no es fiable con el
    // bundler de pruebas de este proyecto cuando corren muchos specs a la vez.
    TestBed.configureTestingModule({
      providers: [{ provide: CONFETTI_FN, useValue: confettiMock }],
    });
    service = TestBed.inject(ConfettiService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispara 5 ráfagas al celebrar, cada una con su propia física', () => {
    service.celebrar();

    expect(confettiMock).toHaveBeenCalledTimes(5);
    expect(confettiMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ particleCount: 125, spread: 26, startVelocity: 55, angle: 50 }),
    );
    expect(confettiMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ particleCount: 100, spread: 60, angle: 50 }),
    );
    expect(confettiMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ particleCount: 175, spread: 100, decay: 0.91, scalar: 0.8 }),
    );
    expect(confettiMock).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        particleCount: 50,
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      }),
    );
    expect(confettiMock).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ particleCount: 50, spread: 120, startVelocity: 45 }),
    );
  });

  it('no dispara nada si el usuario pidió menos movimiento (prefers-reduced-motion)', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList));

    service.celebrar();

    expect(confettiMock).not.toHaveBeenCalled();
  });
});
