import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RegisterRequest } from '../../core/models';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-register',
  styleUrl: './register.css',
  templateUrl: './register.html',
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';
  birthDate = '';
  gender = '';
  acceptedPrivacyPolicy = false;

  // Campos para autorización de menores (14 a 17 años)
  guardianName = '';
  guardianPhone = '';

  loading = signal(false);
  error = signal('');
  infoMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }

  handleGoogleClick() {
    this.infoMessage.set('Registro con Google próximamente');
  }

  // Cálculo de edad en tiempo real en frontend
  calculatedAge(): number | null {
    if (!this.birthDate) return null;
    const parts = this.birthDate.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const birth = new Date(year, month, day);
    const today = new Date();
    if (birth > today) return -1; // fecha futura
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  isUnderageRestricted(): boolean {
    const age = this.calculatedAge();
    return age !== null && age >= 0 && age < 14;
  }

  isMinorAdolescent(): boolean {
    const age = this.calculatedAge();
    return age !== null && age >= 14 && age < 18;
  }

  submit() {
    this.error.set('');

    // 1. Validar edad mínima
    if (this.isUnderageRestricted()) {
      this.error.set('Zona Fitness requiere una edad mínima de 14 años para registrarse.');
      return;
    }

    if (this.calculatedAge() === -1) {
      this.error.set('La fecha de nacimiento no puede ser una fecha futura.');
      return;
    }

    // 2. Validar coincidencia de contraseña si se ingresó confirmación
    if (this.confirmPassword && this.password !== this.confirmPassword) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    // 3. Validar aceptación obligatoria de política de datos si el formulario la presenta
    if (this.acceptedPrivacyPolicy === false && this.birthDate) {
      this.error.set('Debe aceptar la política de tratamiento de datos personales para continuar.');
      return;
    }

    this.loading.set(true);

    const payload: RegisterRequest = {
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password,
      accepted_privacy_policy: this.acceptedPrivacyPolicy,
    };

    if (this.phone) payload.phone = this.phone.trim();
    if (this.birthDate) payload.birth_date = this.birthDate;
    if (this.gender) payload.gender = this.gender;
    if (this.guardianName) payload.guardian_name = this.guardianName.trim();
    if (this.guardianPhone) payload.guardian_phone = this.guardianPhone.trim();

    this.auth.register(payload).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (e) => {
        if (e.status === 409) {
          this.error.set('Ese email ya está registrado');
        } else if (e.status === 403) {
          this.error.set(
            e.error?.error || 'Zona Fitness requiere una edad mínima de 14 años para el registro.',
          );
        } else if (e.status === 0) {
          this.error.set('No se pudo conectar con el servidor');
        } else {
          this.error.set(
            e.error?.error ||
              'Datos inválidos: revisa el email, la fecha de nacimiento y la contraseña (mínimo 6 caracteres)',
          );
        }
        this.loading.set(false);
      },
    });
  }
}
