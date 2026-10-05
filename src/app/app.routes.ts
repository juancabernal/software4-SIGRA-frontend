import { Routes } from '@angular/router';

import { Shell } from './core/layout/shell/shell';

/** Pantalla provisional: se reemplaza por el componente real cuando el módulo se construya. */
const pendiente = () =>
  import('./shared/ui/modulo-pendiente/modulo-pendiente').then((m) => m.ModuloPendiente);

/**
 * Rutas de la aplicación, agrupadas por rol según la especificación visual §7.3.
 *
 * `login` queda **fuera** del shell, como ruta raíz sin layout: es lo que pide §7.3 y es lo
 * correcto para una pantalla a la que se llega sin sesión.
 *
 * Todavía **no hay guards**: RF-05 es de otra entrega. Cuando exista, cada grupo de rol recibe su
 * `canActivate` sin reorganizar nada. Mientras tanto cualquier ruta es alcanzable por URL, y eso
 * está bien: el control de acceso lo hace el backend, no el menú.
 *
 * La raíz entra al shell y no al login porque el inicio de sesión todavía no redirige a ninguna
 * pantalla al autenticar (`POST_LOGIN_DESTINATION_PENDING` en `login-page.ts`): mandar la raíz al
 * login dejaría la aplicación encerrada ahí. Ese enlace es parte de RF-05.
 *
 * Los `data` de cada ruta alimentan las entradas de `ModuloPendiente` por enlace de entradas del
 * router (`withComponentInputBinding`).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/components/login-page/login-page').then((m) => m.LoginPage),
    title: 'Iniciar sesión · SIGRA',
  },

  {
    path: '',
    component: Shell,
    children: [
      // ── Profesor ────────────────────────────────────────────────────
      {
        path: 'profesor/asignaturas',
        loadComponent: pendiente,
        title: 'Mis asignaturas · SIGRA',
        data: {
          titulo: 'Mis asignaturas',
          subtitulo: 'Asignaturas asignadas en el semestre en curso',
          requisito: 'RF-20',
        },
      },
      {
        path: 'profesor/matricula',
        loadComponent: pendiente,
        title: 'Matrícula de estudiantes · SIGRA',
        data: {
          titulo: 'Matrícula de estudiantes',
          subtitulo: 'Asocia estudiantes a tu asignatura por número de cédula',
        },
      },
      {
        path: 'profesor/evaluaciones',
        loadComponent: pendiente,
        title: 'Evaluaciones por RA · SIGRA',
        data: {
          titulo: 'Evaluaciones por RA',
          subtitulo: 'Evaluaciones asociadas a cada resultado de aprendizaje',
        },
      },
      {
        path: 'profesor/notas',
        loadComponent: pendiente,
        title: 'Registro de notas y observaciones · SIGRA',
        data: {
          titulo: 'Registro de notas y observaciones',
          subtitulo: 'Notas y observaciones por evaluación',
        },
      },
      {
        path: 'profesor/estadisticas',
        loadComponent: pendiente,
        title: 'Estadísticas y ciclo de mejora · SIGRA',
        data: {
          titulo: 'Estadísticas y ciclo de mejora',
          subtitulo: 'Distribución de logro por RA y acciones de mejora',
        },
      },
      {
        path: 'profesor/historial',
        loadComponent: pendiente,
        title: 'Mi historial · SIGRA',
        data: {
          titulo: 'Mi historial',
          subtitulo: 'Registro de auditoría · solo lectura · acotado a tus asignaturas',
        },
      },

      // ── Administrador ───────────────────────────────────────────────
      {
        path: 'admin/catalogo',
        loadComponent: pendiente,
        title: 'Catálogo académico · SIGRA',
        data: {
          titulo: 'Catálogo académico',
          subtitulo: 'Gestión de profesores, programas y materias',
        },
      },
      {
        // Único módulo ya implementado.
        path: 'admin/semestres',
        loadComponent: () =>
          import('./features/semestres/components/semestres-page/semestres-page').then(
            (m) => m.SemestresPage,
          ),
        title: 'Semestres académicos · SIGRA',
      },
      {
        path: 'admin/ra',
        loadComponent: pendiente,
        title: 'Gestión de RA · SIGRA',
        data: {
          titulo: 'Gestión de Resultados de Aprendizaje',
          subtitulo: 'Selecciona una materia para gestionar sus RA',
        },
      },
      {
        path: 'admin/asignacion',
        loadComponent: pendiente,
        title: 'Asignación docente · SIGRA',
        data: {
          titulo: 'Asignación docente',
          subtitulo: 'Asocia materias activas a un profesor',
        },
      },
      {
        path: 'admin/estudiantes',
        loadComponent: pendiente,
        title: 'Estudiantes · SIGRA',
        data: {
          titulo: 'Estudiantes',
          subtitulo: 'Registro, consulta e inactivación de la ficha del estudiante',
          requisito: 'RF-09a',
        },
      },
      {
        path: 'admin/matricula',
        loadComponent: pendiente,
        title: 'Matrícula y desvinculación · SIGRA',
        data: {
          titulo: 'Matrícula y desvinculación',
          subtitulo: 'Gestión de estudiantes por materia',
          requisito: 'RF-08 · RF-09',
        },
      },
      {
        path: 'admin/reportes',
        loadComponent: pendiente,
        title: 'Reportes · SIGRA',
        data: {
          titulo: 'Reportes',
          subtitulo: 'Panel de administrador · vista global del sistema',
        },
      },

      // ── Estudiante ──────────────────────────────────────────────────
      {
        path: 'estudiante/materias',
        loadComponent: pendiente,
        title: 'Mis asignaturas · SIGRA',
        data: {
          titulo: 'Mis asignaturas',
          subtitulo: 'Semestre en curso · vista de estudiante · solo lectura',
          requisito: 'RF-22',
        },
      },
      {
        path: 'estudiante/progreso',
        loadComponent: pendiente,
        title: 'Mi progreso · SIGRA',
        data: {
          titulo: 'Mi progreso',
          subtitulo: 'Detalle de asignatura y avance por RA · solo lectura',
        },
      },
      {
        // No está en el menú: se alcanza desde el detalle de la asignatura (§7.2). Al ser una
        // ruta hija de `progreso`, el ítem «Mi progreso» sigue marcado activo aquí (§6.1).
        path: 'estudiante/progreso/calificaciones',
        loadComponent: pendiente,
        title: 'Calificaciones y observaciones · SIGRA',
        data: {
          titulo: 'Calificaciones y observaciones',
          subtitulo: 'Notas y observaciones recibidas · solo lectura',
        },
      },

      { path: '', redirectTo: 'admin/catalogo', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '' },
];
