import { Routes } from '@angular/router';

import { Shell } from './core/layout/shell/shell';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard, rootRedirectGuard } from './core/guards/role.guard';

const pendiente = () =>
  import('./shared/ui/modulo-pendiente/modulo-pendiente').then((m) => m.ModuloPendiente);

const profesor = { canActivate: [roleGuard], data: { roles: ['PROFESOR'] as const } };
const administrador = {
  canActivate: [roleGuard],
  data: { roles: ['ADMINISTRADOR'] as const },
};
const estudiante = { canActivate: [roleGuard], data: { roles: ['ESTUDIANTE'] as const } };

/** Rutas de autenticación y pantallas privadas. Todas las pantallas privadas declaran su rol. */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [rootRedirectGuard],
    loadComponent: () =>
      import('./features/auth/components/root-redirect/root-redirect-page').then(
        (m) => m.RootRedirectPage,
      ),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/components/login-page/login-page').then((m) => m.LoginPage),
    title: 'Iniciar sesión · SIGRA',
  },
  {
    path: 'acceso-denegado',
    loadComponent: () =>
      import('./features/auth/components/acceso-denegado/acceso-denegado-page').then(
        (m) => m.AccesoDenegadoPage,
      ),
    title: 'Acceso denegado · SIGRA',
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      // ── Profesor ────────────────────────────────────────────────────
      {
        ...profesor,
        path: 'profesor/asignaturas',
        loadComponent: () =>
          import('./features/asignaturas/components/mis-asignaturas-page/mis-asignaturas-page').then(
            (m) => m.MisAsignaturasPage,
          ),
        title: 'Mis asignaturas · SIGRA',
        data: {
          ...profesor.data,
          vista: 'PROFESOR',
          titulo: 'Mis asignaturas',
          subtitulo: 'Asignaturas asignadas en el semestre en curso',
          requisito: 'RF-20',
        },
      },
      {
        ...profesor,
        path: 'profesor/matricula',
        loadComponent: () =>
          import('./features/estudiantes/components/matriculados-page/matriculados-page').then(
            (m) => m.MatriculadosPage,
          ),
        title: 'Matrícula de estudiantes · SIGRA',
      },
      {
        ...profesor,
        path: 'profesor/evaluaciones',
        loadComponent: () =>
          import('./features/evaluaciones/components/evaluaciones-page/evaluaciones-page').then(
            (m) => m.EvaluacionesPage,
          ),
        title: 'Evaluaciones por RA · SIGRA',
        data: {
          ...profesor.data,
          titulo: 'Evaluaciones por RA',
          subtitulo: 'Evaluaciones asociadas a cada resultado de aprendizaje',
        },
      },
      {
        ...profesor,
        path: 'profesor/notas',
        loadComponent: pendiente,
        title: 'Registro de notas y observaciones · SIGRA',
        data: {
          ...profesor.data,
          titulo: 'Registro de notas y observaciones',
          subtitulo: 'Notas y observaciones por evaluación',
        },
      },
      {
        ...profesor,
        path: 'profesor/estadisticas',
        loadComponent: () =>
          import('./features/estadisticas/components/estadisticas-page/estadisticas-page').then(
            (m) => m.EstadisticasPage,
          ),
        title: 'Estadísticas y ciclo de mejora · SIGRA',
        data: {
          ...profesor.data,
          titulo: 'Estadísticas y ciclo de mejora',
          subtitulo: 'Distribución de logro por RA y acciones de mejora',
        },
      },
      {
        ...profesor,
        path: 'profesor/historial',
        loadComponent: pendiente,
        title: 'Mi historial · SIGRA',
        data: {
          ...profesor.data,
          titulo: 'Mi historial',
          subtitulo: 'Registro de auditoría · solo lectura · acotado a tus asignaturas',
        },
      },

      // ── Administrador ───────────────────────────────────────────────
      {
        ...administrador,
        path: 'admin/catalogo',
        loadComponent: () =>
          import('./features/catalogo/components/catalogo-page/catalogo-page').then(
            (m) => m.CatalogoPage,
          ),
        title: 'Catálogo académico · SIGRA',
      },
      {
        ...administrador,
        path: 'admin/semestres',
        loadComponent: () =>
          import('./features/semestres/components/semestres-page/semestres-page').then(
            (m) => m.SemestresPage,
          ),
        title: 'Semestres académicos · SIGRA',
      },
      {
        ...administrador,
        path: 'admin/ra',
        loadComponent: () =>
          import(
            './features/resultadosaprendizaje/components/resultados-aprendizaje-page/resultados-aprendizaje-page'
          ).then((m) => m.ResultadosAprendizajePage),
        title: 'Gestión de RA · SIGRA',
      },
      {
        ...administrador,
        path: 'admin/asignacion',
        loadComponent: () =>
          import('./features/asignacion-docente/components/asignacion-docente-page/asignacion-docente-page').then(
            (m) => m.AsignacionDocentePage,
          ),
        title: 'Asignación docente · SIGRA',
        data: {
          ...administrador.data,
          titulo: 'Asignación docente',
          subtitulo: 'Asocia materias activas a un profesor',
        },
      },
      {
        ...administrador,
        path: 'admin/estudiantes',
        loadComponent: () =>
          import('./features/estudiantes/components/estudiantes-page/estudiantes-page').then(
            (m) => m.EstudiantesPage,
          ),
        title: 'Estudiantes · SIGRA',
      },
      {
        ...administrador,
        path: 'admin/estudiantes/:id',
        loadComponent: () =>
          import(
            './features/estudiantes/components/estudiante-detalle-page/estudiante-detalle-page'
          ).then((m) => m.EstudianteDetallePage),
        title: 'Ficha del estudiante · SIGRA',
      },
      {
        ...administrador,
        path: 'admin/matricula',
        loadComponent: () =>
          import('./features/estudiantes/components/matriculados-page/matriculados-page').then(
            (m) => m.MatriculadosPage,
          ),
        title: 'Matrícula y desvinculación · SIGRA',
      },
      {
        ...administrador,
        path: 'admin/reportes',
        loadComponent: pendiente,
        title: 'Reportes · SIGRA',
        data: {
          ...administrador.data,
          titulo: 'Reportes',
          subtitulo: 'Panel de administrador · vista global del sistema',
        },
      },

      // ── Estudiante ──────────────────────────────────────────────────
      {
        ...estudiante,
        path: 'estudiante/materias',
        loadComponent: () =>
          import('./features/asignaturas/components/mis-asignaturas-page/mis-asignaturas-page').then(
            (m) => m.MisAsignaturasPage,
          ),
        title: 'Mis asignaturas · SIGRA',
        data: {
          ...estudiante.data,
          vista: 'ESTUDIANTE',
          titulo: 'Mis asignaturas',
          subtitulo: 'Semestre en curso · vista de estudiante · solo lectura',
          requisito: 'RF-22',
        },
      },
      {
        ...estudiante,
        path: 'estudiante/progreso',
        loadComponent: pendiente,
        title: 'Mi progreso · SIGRA',
        data: {
          ...estudiante.data,
          titulo: 'Mi progreso',
          subtitulo: 'Detalle de asignatura y avance por RA · solo lectura',
        },
      },
      {
        ...estudiante,
        path: 'estudiante/progreso/calificaciones',
        loadComponent: pendiente,
        title: 'Calificaciones y observaciones · SIGRA',
        data: {
          ...estudiante.data,
          titulo: 'Calificaciones y observaciones',
          subtitulo: 'Notas y observaciones recibidas · solo lectura',
        },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
