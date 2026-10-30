import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { User, Order, Membership } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './account.html',
  styleUrls: ['./account.css'],
})
export class Account implements OnInit {
  private http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly cartService = inject(CartService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  activeTab: 'profile' | 'orders' | 'memberships' = 'profile';

  profileForm = {
    name: '',
    email: '',
    phone: '',
    gender: '',
    birth_date: '',
  };

  orders: (Order & { payment_id?: number; payment_status?: string; receipt_path?: string; rejection_reason?: string })[] = [];
  isLoadingOrders: boolean = false;
  activeMembership: Membership | null = null;
  membershipHistory: any[] = [];
  isLoadingMembership: boolean = false;
  isSavingProfile: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Visualizador de comprobante en modal
  previewReceiptUrl: string | null = null;
  isLoadingReceipt: boolean = false;

  ngOnInit() {
    const user = this.auth.user();
    if (user) {
      this.profileForm = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: (user.gender as string) || '',
        birth_date: user.birth_date ? user.birth_date.substring(0, 10) : '',
      };
    }

    // Cargar perfil actualizado desde el servidor
    this.auth.getProfile().subscribe({
      next: (profile) => {
        this.profileForm = {
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          gender: (profile.gender as string) || '',
          birth_date: profile.birth_date ? profile.birth_date.substring(0, 10) : '',
        };
      },
      error: () => {},
    });

    this.loadOrders();
    this.loadMembership();

    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      if (tab === 'orders' || tab === 'memberships' || tab === 'profile') {
        this.setTab(tab);
      }
    });
  }

  get userInitials(): string {
    const name = this.auth.user()?.name || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'ZF';
  }

  setTab(tab: 'profile' | 'orders' | 'memberships') {
    this.activeTab = tab;
    this.successMessage = null;
    this.errorMessage = null;
    if (tab === 'orders') {
      this.loadOrders();
    }
  }

  loadOrders() {
    this.isLoadingOrders = true;
    this.cartService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.isLoadingOrders = false;
      },
      error: (err) => {
        this.isLoadingOrders = false;
      },
    });
  }

  loadMembership() {
    this.isLoadingMembership = true;
    this.cartService.getMyActiveMembership().subscribe({
      next: (res) => {
        this.activeMembership = res.membership;
        this.isLoadingMembership = false;
      },
      error: () => {
        this.activeMembership = null;
        this.isLoadingMembership = false;
      },
    });
    this.cartService.getMyMembershipHistory().subscribe({
      next: (history) => {
        this.membershipHistory = history;
      },
      error: () => {
        this.membershipHistory = [];
      },
    });
  }

  saveProfile() {
    this.isSavingProfile = true;
    this.successMessage = null;
    this.errorMessage = null;

    const payload: Partial<User> = {
      name: this.profileForm.name,
      phone: this.profileForm.phone,
      gender: this.profileForm.gender,
    };

    if (this.profileForm.birth_date) {
      payload.birth_date = this.profileForm.birth_date;
    }

    this.auth.updateProfile(payload).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.successMessage = 'Tu perfil ha sido actualizado exitosamente.';
      },
      error: (err) => {
        this.isSavingProfile = false;
        this.errorMessage = err?.error?.error || 'Error al actualizar el perfil.';
      },
    });
  }

  viewReceipt(paymentId: number) {
    if (!paymentId) return;
    this.isLoadingReceipt = true;
    this.http.get(`${environment.apiUrl}/payments/${paymentId}/receipt`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.isLoadingReceipt = false;
        this.previewReceiptUrl = URL.createObjectURL(blob);
      },
      error: () => {
        this.isLoadingReceipt = false;
        alert('No fue posible cargar el comprobante solicitado.');
      },
    });
  }

  closeReceiptModal() {
    if (this.previewReceiptUrl) {
      URL.revokeObjectURL(this.previewReceiptUrl);
      this.previewReceiptUrl = null;
    }
  }

  logout() {
    this.auth.logout();
  }
}
