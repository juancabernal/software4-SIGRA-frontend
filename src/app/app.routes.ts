import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin/semestres',
    loadComponent: () =>
      import('./features/semestres/components/semestres-page/semestres-page').then(
        (m) => m.SemestresPage,
      ),
    title: 'Semestres académicos · SIGRA',
  },
];
