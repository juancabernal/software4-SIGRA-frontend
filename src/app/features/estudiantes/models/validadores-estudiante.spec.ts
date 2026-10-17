import {
  PATRON_CORREO_INSTITUCIONAL,
  PATRON_NOMBRE_COMPLETO,
  PATRON_NUMERO_DOCUMENTO,
} from './validadores-estudiante';

describe('PATRON_NOMBRE_COMPLETO', () => {
  it.each(['Ana', 'Ana María Gómez', 'José Ñústes', 'JUAN PEREZ'])(
    '"%s" es un nombre completo válido',
    (nombre) => {
      expect(PATRON_NOMBRE_COMPLETO.test(nombre)).toBe(true);
    },
  );

  it.each([
    'Ana2',
    'Ana María2',
    'Ana@Pérez',
    'Ana_Pérez',
    'Ana-Pérez',
    'Ana  Pérez',
    ' Ana',
    'Ana ',
    '',
  ])('"%s" no es un nombre completo válido', (nombre) => {
    expect(PATRON_NOMBRE_COMPLETO.test(nombre)).toBe(false);
  });
});

// Mismo patrón que el backend (EstudianteRequestDTO): basta con un par de casos de humo aquí,
// la cobertura exhaustiva vive en los specs de los diálogos que los consumen.
describe('PATRON_NUMERO_DOCUMENTO y PATRON_CORREO_INSTITUCIONAL', () => {
  it('siguen vigentes y exportados para los formularios', () => {
    expect(PATRON_NUMERO_DOCUMENTO.test('1234567890')).toBe(true);
    expect(PATRON_CORREO_INSTITUCIONAL.test('ana@uco.net.co')).toBe(true);
  });
});
