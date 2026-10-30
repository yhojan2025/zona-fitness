import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * customerGuard:
 * Impide que un usuario con rol 'admin' acceda a vistas y flujos comerciales
 * exclusivos de clientes (como /carrito y /checkout). Si un administrador intenta
 * ingresar, es redirigido inmediatamente a su consola en /admin/dashboard.
 */
export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.hasRole('admin')) {
    router.navigate(['/admin/dashboard']);
    return false;
  }

  return true;
};
