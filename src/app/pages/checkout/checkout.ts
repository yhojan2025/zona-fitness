import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/cart.service';
import { AuthService } from '../../core/auth.service';
import { Order } from '../../core/models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css'],
})
export class Checkout implements OnInit {
  readonly cartService = inject(CartService);
  readonly auth = inject(AuthService);
  private router = inject(Router);

  selectedPaymentMethod: string = 'nequi';
  notes: string = '';
  isSubmitting: boolean = false;
  createdOrder: Order | null = null;
  errorMessage: string | null = null;
  informationalAlert: string | null = null;

  ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.cartService.loadCart().subscribe((c) => {
      if (c.item_count === 0 && !this.createdOrder) {
        this.router.navigate(['/carrito']);
      }
    });
  }

  handleOnlinePaymentClick(gatewayName: string) {
    this.informationalAlert = `Los pagos en línea mediante ${gatewayName} estarán disponibles próximamente. Por ahora, esta opción no se encuentra habilitada para procesar transacciones automáticas. Puedes generar tu pedido en estado pendiente y realizar el pago directamente en recepción.`;
  }

  dismissAlert() {
    this.informationalAlert = null;
  }

  submitOrder() {
    if (this.cartService.hasUnconfirmedPrices()) {
      this.errorMessage = 'No es posible procesar pedidos con artículos que tienen precio por confirmar.';
      return;
    }

    if (this.cartService.count() === 0) {
      this.errorMessage = 'Tu carrito está vacío.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    this.cartService.createPendingOrder(this.selectedPaymentMethod, this.notes).subscribe({
      next: (order) => {
        this.isSubmitting = false;
        this.createdOrder = order;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.error || 'Error al registrar el pedido en el sistema';
      },
    });
  }
}
