import { idDeTipoDocumento, TIPOS_DOCUMENTO } from './tipos-documento';

describe('tipos-documento', () => {
  it('resuelve el id correcto para cada nombre del catálogo', () => {
    for (const tipo of TIPOS_DOCUMENTO) {
      expect(idDeTipoDocumento(tipo.nombre)).toBe(tipo.id);
    }
  });

  it('ignora mayúsculas y espacios alrededor del nombre', () => {
    expect(idDeTipoDocumento('  CEDULA DE CIUDADANIA  ')).toBe(TIPOS_DOCUMENTO[0].id);
    expect(idDeTipoDocumento('cedula de ciudadania')).toBe(TIPOS_DOCUMENTO[0].id);
  });

  it('devuelve undefined para un nombre que no está en el catálogo', () => {
    expect(idDeTipoDocumento('Pasaporte')).toBeUndefined();
  });
});
