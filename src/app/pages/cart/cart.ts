import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { AuthService } from '../../core/auth.service';
import { CartItem } from '../../core/models';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css'],
})
export class Cart implements OnInit {
  readonly cartService = inject(CartService);
  readonly auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.cartService.loadCart().subscribe();
    }
  }

  incrementQuantity(item: CartItem) {
    this.cartService.updateQuantity(item.id, item.quantity + 1).subscribe();
  }

  decrementQuantity(item: CartItem) {
    if (item.quantity > 1) {
      this.cartService.updateQuantity(item.id, item.quantity - 1).subscribe();
    } else {
      this.removeItem(item);
    }
  }

  removeItem(item: CartItem) {
    this.cartService.removeItem(item.id).subscribe();
  }

  clearCart() {
    if (confirm('¿Estás seguro de que deseas vaciar tu carrito de compras?')) {
      this.cartService.clearCart().subscribe();
    }
  }

  proceedToCheckout() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    if (this.cartService.canCheckout()) {
      this.router.navigate(['/checkout']);
    }
  }
}
