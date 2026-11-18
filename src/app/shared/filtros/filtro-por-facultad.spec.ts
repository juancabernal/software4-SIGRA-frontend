import { facultadesDe } from './filtro-por-facultad';

describe('facultadesDe', () => {
  it('arma las opciones sin duplicados y ordenadas por nombre', () => {
    expect(
      facultadesDe([
        { facultadId: 'f1', facultadNombre: 'Facultad de Ingeniería' },
        { facultadId: 'f2', facultadNombre: 'Facultad de Derecho' },
        { facultadId: 'f1', facultadNombre: 'Facultad de Ingeniería' },
      ]),
    ).toEqual([
      { id: 'f2', nombre: 'Facultad de Derecho' },
      { id: 'f1', nombre: 'Facultad de Ingeniería' },
    ]);
  });

  it('sin elementos no hay opciones', () => {
    expect(facultadesDe([])).toEqual([]);
  });
});
