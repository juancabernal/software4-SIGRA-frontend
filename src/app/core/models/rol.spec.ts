import { PERFILES, ROLES, RUTA_INICIAL, rolDesdeUrl } from './rol';

describe('rolDesdeUrl', () => {
  it('reconoce el rol en el primer segmento de la URL', () => {
    expect(rolDesdeUrl('/profesor/asignaturas')).toBe('profesor');
    expect(rolDesdeUrl('/admin/semestres')).toBe('admin');
    expect(rolDesdeUrl('/estudiante/progreso/calificaciones')).toBe('estudiante');
  });

  it('ignora los parámetros y el fragmento', () => {
    expect(rolDesdeUrl('/admin/estudiantes?filtro=ana#tabla')).toBe('admin');
  });

  it('devuelve null cuando la URL no pertenece a ningún rol', () => {
    expect(rolDesdeUrl('/')).toBeNull();
    expect(rolDesdeUrl('/otra-cosa')).toBeNull();
  });
});

describe('perfiles de rol', () => {
  it('cada rol tiene su menú y su pantalla por defecto', () => {
    for (const rol of ROLES) {
      expect(PERFILES[rol].menu.length).toBeGreaterThan(0);
      expect(RUTA_INICIAL[rol].startsWith(`/${rol}/`)).toBe(true);
    }
  });

  it('cada ítem del menú apunta a una ruta del propio rol', () => {
    for (const rol of ROLES) {
      for (const item of PERFILES[rol].menu) {
        expect(rolDesdeUrl(item.ruta)).toBe(rol);
      }
    }
  });

  it('la pantalla por defecto de cada rol es un ítem de su menú', () => {
    for (const rol of ROLES) {
      const rutas = PERFILES[rol].menu.map((item) => item.ruta);
      expect(rutas).toContain(RUTA_INICIAL[rol]);
    }
  });
});
