import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap, catchError, of, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CartItem, CartResponse, Order } from './models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = environment.apiUrl;

  readonly cart = signal<CartResponse>({
    items: [],
    item_count: 0,
    subtotal: 0,
    total_amount: 0,
    has_unconfirmed_prices: false,
    unconfirmed_items_count: 0,
    can_checkout: false,
  });

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly items = computed(() => this.cart().items);
  readonly count = computed(() => this.cart().item_count);
  readonly subtotal = computed(() => this.cart().subtotal);
  readonly total = computed(() => this.cart().total_amount);
  readonly hasUnconfirmedPrices = computed(() => this.cart().has_unconfirmed_prices);
  readonly canCheckout = computed(() => this.cart().can_checkout);

  constructor() {
    // Si el usuario ya está autenticado, cargar el carrito
    if (this.auth.isLoggedIn()) {
      this.loadCart();
    }
  }

  loadCart(): Observable<CartResponse> {
    if (!this.auth.isLoggedIn()) {
      this.resetCart();
      return of(this.cart());
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    return this.http.get<CartResponse>(`${this.apiUrl}/cart`).pipe(
      tap((res) => {
        this.cart.set(res);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.error || 'Error al cargar el carrito de compras');
        return of(this.cart());
      }),
    );
  }

  addItem(itemType: 'plan' | 'product', itemId: number, quantity: number = 1): Observable<any> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    return this.http.post<any>(`${this.apiUrl}/cart`, { item_type: itemType, item_id: itemId, quantity }).pipe(
      tap(() => {
        this.loadCart().subscribe();
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err?.error?.error || 'Error al agregar el ítem al carrito';
        this.errorMessage.set(msg);
        throw err;
      }),
    );
  }

  updateQuantity(cartItemId: number, quantity: number): Observable<any> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    return this.http.patch<any>(`${this.apiUrl}/cart/${cartItemId}`, { quantity }).pipe(
      tap(() => {
        this.loadCart().subscribe();
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err?.error?.error || 'Error al actualizar la cantidad';
        this.errorMessage.set(msg);
        throw err;
      }),
    );
  }

  removeItem(cartItemId: number): Observable<any> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    return this.http.delete<any>(`${this.apiUrl}/cart/${cartItemId}`).pipe(
      tap(() => {
        this.loadCart().subscribe();
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err?.error?.error || 'Error al eliminar el ítem del carrito';
        this.errorMessage.set(msg);
        throw err;
      }),
    );
  }

  clearCart(): Observable<any> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    return this.http.delete<any>(`${this.apiUrl}/cart`).pipe(
      tap(() => {
        this.resetCart();
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err?.error?.error || 'Error al vaciar el carrito';
        this.errorMessage.set(msg);
        throw err;
      }),
    );
  }

  createPendingOrder(paymentMethod: string = 'nequi', notes?: string): Observable<Order> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    return this.http.post<Order>(`${this.apiUrl}/orders`, { payment_method: paymentMethod, notes }).pipe(
      tap(() => {
        this.resetCart();
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        const msg = err?.error?.error || 'Error al generar el pedido';
        this.errorMessage.set(msg);
        throw err;
      }),
    );
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders`);
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${id}`);
  }

  resetCart() {
    this.cart.set({
      items: [],
      item_count: 0,
      subtotal: 0,
      total_amount: 0,
      has_unconfirmed_prices: false,
      unconfirmed_items_count: 0,
      can_checkout: false,
    });
  }
}
