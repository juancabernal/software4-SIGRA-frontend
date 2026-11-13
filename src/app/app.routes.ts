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
        title: 'Mis materias · SIGRA',
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
        // RF-10 / RF-11: evaluaciones por RA con el porcentaje acumulado del semestre.
        ...profesor,
        path: 'profesor/evaluaciones',
        loadComponent: () =>
          import('./features/evaluaciones/components/evaluaciones-page/evaluaciones-page').then(
            (m) => m.EvaluacionesPage,
          ),
        title: 'Evaluaciones por RA · SIGRA',
      },
      {
        // RF-12 / RF-13: planilla de notas por evaluación, con la marca ⚠ de fuera de fecha.
        ...profesor,
        path: 'profesor/notas',
        loadComponent: () =>
          import('./features/calificaciones/components/planilla-notas-page/planilla-notas-page').then(
            (m) => m.PlanillaNotasPage,
          ),
        title: 'Registro de notas y observaciones · SIGRA',
      },
      {
        // RF-16: consulta de conclusiones (desempeño insuficiente) por materia, RA y semestre.
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
        // Reportes: shell con pestañas R1 (rendimiento) y R6 (riesgo); alcance profesor en backend.
        ...profesor,
        path: 'profesor/reportes',
        loadComponent: () =>
          import('./features/reportes/components/reportes-page/reportes-page').then((m) => m.ReportesPage),
        title: 'Reportes · SIGRA',
        data: {
          ...profesor.data,
          titulo: 'Reportes',
          subtitulo: 'Rendimiento y riesgo académico de tus asignaturas',
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
        path: 'admin/auditoria',
        loadComponent: () =>
          import('./features/auditoria/components/historial-auditoria-page/historial-auditoria-page').then(
            (m) => m.HistorialAuditoriaPage,
          ),
        title: 'Historial de auditoría · SIGRA',
      },
      {
        // Reportes: shell con pestañas R1 (rendimiento) y R6 (riesgo); vista global admin.
        ...administrador,
        path: 'admin/reportes',
        loadComponent: () =>
          import('./features/reportes/components/reportes-page/reportes-page').then((m) => m.ReportesPage),
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
          import('./features/estudiante/components/materias-page/materias-page').then(
            (m) => m.MisMateriasPage,
          ),
        title: 'Mis asignaturas · SIGRA',
        data: {
          ...estudiante.data,
          titulo: 'Mis materias',
          subtitulo: 'Materias asociadas a tu registro académico · solo lectura',
          requisito: 'RF-22',
        },
      },
      {
        ...estudiante,
        path: 'estudiante/materias/:matriculaId',
        loadComponent: () =>
          import('./features/estudiante/components/detalle-page/detalle-page').then(
            (m) => m.MateriaDetallePage,
          ),
        title: 'Detalle de materia · SIGRA',
        data: {
          ...estudiante.data,
          titulo: 'Detalle de materia',
          subtitulo: 'Evaluaciones y resultados de aprendizaje · solo lectura',
          requisito: 'RF-22',
        },
      },
      {
        ...estudiante,
        path: 'estudiante/progreso',
        loadComponent: () =>
          import('./features/estudiante/components/progreso-page/progreso-page').then(
            (m) => m.MiProgresoPage,
          ),
        title: 'Mi progreso · SIGRA',
        data: {
          ...estudiante.data,
          titulo: 'Mi progreso',
          subtitulo: 'Avance de tus materias en curso · solo lectura',
          requisito: 'RF-22',
        },
      },
      {
        ...estudiante,
        path: 'estudiante/historial',
        loadComponent: () =>
          import('./features/estudiante/components/historial-page/historial-page').then(
            (m) => m.MiHistorialPage,
          ),
        title: 'Mi historial · SIGRA',
        data: {
          ...estudiante.data,
          titulo: 'Mi historial',
          subtitulo: 'Materias cursadas y desvinculadas · solo lectura',
          requisito: 'RF-22',
        },
      },
      {
        // «Reportes por facultad»: el estudiante ve su propio desempeño agrupado por facultad.
        ...estudiante,
        path: 'estudiante/reportes-facultad',
        loadComponent: () =>
          import('./features/reportes/components/reportes-facultad/reportes-facultad').then(
            (m) => m.ReportesFacultad,
          ),
        title: 'Reportes por facultad · SIGRA',
        data: {
          ...estudiante.data,
          titulo: 'Reportes por facultad',
          subtitulo: 'Tu desempeño por facultad, programa y materia · solo lectura',
        },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];