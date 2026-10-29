import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';
import { roleGuard } from './core/role-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'servicios',
    data: { section: 'services' },
    loadComponent: () => import('./pages/section-page/section-page').then((m) => m.SectionPage),
  },
  {
    path: 'planes',
    data: { section: 'plans' },
    loadComponent: () => import('./pages/section-page/section-page').then((m) => m.SectionPage),
  },
  {
    path: 'horarios',
    data: { section: 'hours' },
    loadComponent: () => import('./pages/section-page/section-page').then((m) => m.SectionPage),
  },
  {
    path: 'espacio',
    data: { section: 'space' },
    loadComponent: () => import('./pages/section-page/section-page').then((m) => m.SectionPage),
  },
  {
    path: 'productos',
    data: { section: 'products' },
    loadComponent: () => import('./pages/section-page/section-page').then((m) => m.SectionPage),
  },
  {
    path: 'politica-datos',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
  },
  {
    path: 'privacidad',
    redirectTo: 'politica-datos',
    pathMatch: 'full',
  },
  {
    path: 'carrito',
    loadComponent: () => import('./pages/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'checkout',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'mi-cuenta',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account/account').then((m) => m.Account),
  },
  {
    path: 'mis-pedidos',
    redirectTo: 'mi-cuenta',
    pathMatch: 'full',
  },
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: 'tickets',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tickets/tickets').then((m) => m.Tickets),
  },
  {
    path: 'users',
    canActivate: [roleGuard('admin')],
    loadComponent: () => import('./pages/users/users').then((m) => m.Users),
  },
  { path: '**', redirectTo: '' },
];
