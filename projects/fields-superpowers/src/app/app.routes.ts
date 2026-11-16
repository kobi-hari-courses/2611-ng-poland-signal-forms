import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'form' },
  {
    path: 'ai',
    title: 'AI prompt demo',
    loadComponent: () => import('./pages/ai-demo/ai-demo').then((m) => m.AiDemo),
  },
  {
    path: 'notifications',
    title: 'Notification demo',
    loadComponent: () =>
      import('./pages/notification-demo/notification-demo').then((m) => m.NotificationDemo),
  },
  {
    path: 'form',
    title: 'Speaker proposal',
    loadComponent: () => import('./pages/form-demo/form-demo').then((m) => m.FormDemo),
  },
];
