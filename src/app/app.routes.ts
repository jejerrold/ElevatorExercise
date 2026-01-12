import { Routes } from '@angular/router';

const routeConfig: Routes = [
  {
    path: '/home',
    loadComponent: () =>
      import('./components/home/home.component').then((mod) => mod.HomeComponent),
  },
];

export default routeConfig;
