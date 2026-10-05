/**
 * Roles del sistema y su menú lateral.
 *
 * Los menús y las rutas salen de la especificación visual del equipo
 * (`scripts/SIGRA-FRONTEND-SPEC-ANGULAR.md`, §7.2 y §7.3): etiquetas literales y en ese orden.
 *
 * Mientras no exista la sesión real (RF-04) ni los guards (RF-05), el rol se elige desde el
 * sidebar y solo cambia lo que se ve. **No es control de acceso**: la autorización la decide el
 * backend en cada endpoint (RF-05, RNF-13).
 */
export type Rol = 'profesor' | 'admin' | 'estudiante';

export const ROLES: readonly Rol[] = ['profesor', 'admin', 'estudiante'] as const;

/** Un ítem del menú lateral. `icono` nombra un trazo del catálogo de `<app-icono>`. */
export interface ItemMenu {
  readonly ruta: string;
  readonly etiqueta: string;
  readonly icono: string;
}

export interface PerfilRol {
  readonly etiqueta: string;
  readonly inicial: string;
  readonly nombre: string;
  readonly subtitulo: string;
  readonly menu: readonly ItemMenu[];
}

export const PERFILES: Readonly<Record<Rol, PerfilRol>> = {
  profesor: {
    etiqueta: 'Profesor',
    inicial: 'P',
    nombre: 'Prof. Ramírez',
    subtitulo: '4 asignaturas',
    menu: [
      { ruta: '/profesor/asignaturas', etiqueta: 'Mis asignaturas', icono: 'libro' },
      { ruta: '/profesor/matricula', etiqueta: 'Matrícula', icono: 'personas' },
      { ruta: '/profesor/evaluaciones', etiqueta: 'Evaluaciones / RA', icono: 'lista' },
      { ruta: '/profesor/notas', etiqueta: 'Calificaciones', icono: 'documento' },
      { ruta: '/profesor/estadisticas', etiqueta: 'Estadísticas', icono: 'barras' },
      { ruta: '/profesor/historial', etiqueta: 'Mi historial', icono: 'reloj' },
    ],
  },
  admin: {
    etiqueta: 'Admin',
    inicial: 'A',
    nombre: 'Administrador',
    subtitulo: 'Vista global',
    menu: [
      { ruta: '/admin/catalogo', etiqueta: 'Catálogo académico', icono: 'libro' },
      { ruta: '/admin/semestres', etiqueta: 'Semestres', icono: 'calendario' },
      { ruta: '/admin/ra', etiqueta: 'Gestión de RA', icono: 'marcador' },
      { ruta: '/admin/asignacion', etiqueta: 'Asignación docente', icono: 'usuario-ok' },
      { ruta: '/admin/estudiantes', etiqueta: 'Estudiantes', icono: 'personas' },
      { ruta: '/admin/matricula', etiqueta: 'Matrícula', icono: 'birrete' },
      { ruta: '/admin/reportes', etiqueta: 'Reportes', icono: 'torta' },
    ],
  },
  estudiante: {
    etiqueta: 'Estudiante',
    inicial: 'E',
    nombre: 'Daniela Ortiz',
    subtitulo: 'Ing. de Sistemas',
    menu: [
      { ruta: '/estudiante/materias', etiqueta: 'Mis materias', icono: 'libro' },
      { ruta: '/estudiante/progreso', etiqueta: 'Mi progreso', icono: 'barras' },
    ],
  },
};

/** Pantalla por defecto de cada rol (§7.2). */
export const RUTA_INICIAL: Readonly<Record<Rol, string>> = {
  profesor: '/profesor/asignaturas',
  admin: '/admin/catalogo',
  estudiante: '/estudiante/materias',
};

/** Rol al que pertenece una URL, leyendo su primer segmento. */
export function rolDesdeUrl(url: string): Rol | null {
  const segmento = url.split(/[?#]/)[0].split('/').filter(Boolean)[0];
  return ROLES.find((rol) => rol === segmento) ?? null;
}
