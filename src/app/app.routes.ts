import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/components/login-page/login-page').then((m) => m.LoginPage),
    title: 'Iniciar sesión · SIGRA',
  },
  {
    path: 'admin/semestres',
    loadComponent: () =>
      import('./features/semestres/components/semestres-page/semestres-page').then(
        (m) => m.SemestresPage,
      ),
    title: 'Semestres académicos · SIGRA',
  },
];
