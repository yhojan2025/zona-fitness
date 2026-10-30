import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';
import { roleGuard } from './core/role-guard';
import { customerGuard } from './core/customer.guard';

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
    canActivate: [customerGuard],
    loadComponent: () => import('./pages/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'checkout',
    canActivate: [authGuard, customerGuard],
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
  // Rutas Administrativas Autónomas
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./pages/admin/admin-login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin/dashboard',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin/users',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin/memberships',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin/plans',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin/orders',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin/audit',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin/config',
    canActivate: [roleGuard('admin')],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin',
    redirectTo: 'admin/dashboard',
    pathMatch: 'full',
  },
  { path: '**', redirectTo: '' },
];
