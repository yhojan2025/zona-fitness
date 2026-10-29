import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  infoMessage = signal('');
  showPassword = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  handleGoogleClick() {
    this.infoMessage.set('Inicio de sesión con Google próximamente');
  }

  handleForgotPassword() {
    this.infoMessage.set('La recuperación de contraseña estará disponible próximamente. Por ahora, inicia sesión con tu contraseña actual o acércate a recepción.');
  }

  submit() {
    this.loading.set(true);
    this.error.set('');
    this.infoMessage.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        if (returnUrl) {
          this.router.navigate([returnUrl]);
        } else {
          this.router.navigate(['/tickets']);
        }
      },
      error: (e) => {
        this.error.set(
          e.status === 401
            ? 'Credenciales incorrectas'
            : e.status === 0
              ? 'No se pudo conectar con el servidor'
              : 'Revisa el email y la contraseña',
        );
        this.loading.set(false);
      },
    });
  }
}
