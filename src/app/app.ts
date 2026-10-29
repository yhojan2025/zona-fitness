import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/auth.service';
import { CartService } from './core/cart.service';

@Component({
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected auth = inject(AuthService);
  protected cart = inject(CartService);

  mobileMenuOpen = signal(false);
  profileMenuOpen = signal(false);

  toggleMobileMenu() {
    this.mobileMenuOpen.update((v) => !v);
    if (this.mobileMenuOpen()) {
      this.profileMenuOpen.set(false);
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  toggleProfileMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.profileMenuOpen.update((v) => !v);
  }

  closeProfileMenu() {
    this.profileMenuOpen.set(false);
  }

  closeAllMenus() {
    this.mobileMenuOpen.set(false);
    this.profileMenuOpen.set(false);
  }

  logoutAndClose() {
    this.closeAllMenus();
    this.auth.logout();
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.profileMenuOpen()) {
      this.profileMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.closeAllMenus();
  }

  userInitials = computed(() => {
    const user = this.auth.user();
    if (!user || !user.name) return 'ZF';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  });

  roleLabel = computed(() => {
    const role = this.auth.user()?.role;
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'agent':
        return 'Agente';
      case 'trainer':
        return 'Entrenador';
      case 'member':
        return 'Socio';
      default:
        return 'Usuario';
    }
  });

  roleBadgeClass = computed(() => {
    const role = this.auth.user()?.role;
    return role ? `badge-${role}` : 'badge-user';
  });
}
