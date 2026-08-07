import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  {
    path: 'orders',
    loadComponent: () =>
      import('./features/orders/order-list/order-list').then((m) => m.OrderList),
  },
  {
    path: 'orders/new',
    loadComponent: () =>
      import('./features/orders/order-create/order-create').then((m) => m.OrderCreate),
  },
  {
    path: 'orders/:id',
    loadComponent: () =>
      import('./features/orders/order-detail/order-detail').then((m) => m.OrderDetail),
  },
  { path: '**', redirectTo: 'orders' },
];
