import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrls: ['./admin-login.css'],
})
export class AdminLogin {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  submit() {
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        if (res.user.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.auth.logout();
          this.error.set('Acceso denegado: esta consola está reservada exclusivamente para administradores autorizados.');
          this.loading.set(false);
        }
      },
      error: (e) => {
        this.error.set(
          e.status === 401
            ? 'Credenciales administrativas no válidas'
            : e.status === 0
              ? 'No se pudo conectar con el servidor de ZONA FITNESS'
              : 'Error al procesar el ingreso administrativo',
        );
        this.loading.set(false);
      },
    });
  }
}
