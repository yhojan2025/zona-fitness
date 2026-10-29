import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Cart } from './cart';
import { CartService } from '../../core/cart.service';
import { AuthService } from '../../core/auth.service';
import { of } from 'rxjs';

describe('Cart Component', () => {
  let component: Cart;
  let fixture: ComponentFixture<Cart>;
  let cartServiceSpy: any;
  let authServiceSpy: any;

  beforeEach(async () => {
    cartServiceSpy = {
      cart: () => ({
        items: [
          {
            id: 1,
            item_type: 'plan',
            item_id: 1,
            name: 'Plan Bronce',
            unit_price: 80000,
            price_unconfirmed: false,
            quantity: 1,
            subtotal: 80000,
          },
        ],
        item_count: 1,
        subtotal: 80000,
        total_amount: 80000,
        has_unconfirmed_prices: false,
        unconfirmed_items_count: 0,
        can_checkout: true,
      }),
      items: () => [
        {
          id: 1,
          item_type: 'plan',
          item_id: 1,
          name: 'Plan Bronce',
          unit_price: 80000,
          price_unconfirmed: false,
          quantity: 1,
          subtotal: 80000,
        },
      ],
      count: () => 1,
      subtotal: () => 80000,
      total: () => 80000,
      hasUnconfirmedPrices: () => false,
      canCheckout: () => true,
      isLoading: () => false,
      loadCart: () => of({}),
      updateQuantity: () => of({}),
      removeItem: () => of({}),
      clearCart: () => of({}),
    };

    authServiceSpy = {
      isLoggedIn: () => true,
      user: () => ({ id: 1, name: 'Juan Pérez' }),
    };

    await TestBed.configureTestingModule({
      imports: [Cart],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: cartServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Cart);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create cart page', () => {
    expect(component).toBeTruthy();
  });

  it('displays cart items count and name', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Plan Bronce');
    expect(el.textContent).toContain('Carrito de Compras');
  });
});
