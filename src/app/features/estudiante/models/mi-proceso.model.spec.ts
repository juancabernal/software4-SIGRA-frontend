import { describe, expect, it } from 'vitest';

import { formatearFecha } from './mi-proceso.model';

describe('formatearFecha', () => {
  it('conserva el día de una fecha de calendario', () => {
    expect(formatearFecha('2026-03-01')).toContain('1 de marzo de 2026');
    expect(formatearFecha('2026-03-01')).not.toContain('28 de febrero');
  });

  it('formatea timestamps en la zona horaria de Bogotá', () => {
    expect(formatearFecha('2026-03-01T04:30:00Z')).toContain('28 de febrero de 2026');
  });
});
