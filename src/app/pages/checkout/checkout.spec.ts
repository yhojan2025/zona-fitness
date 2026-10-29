import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Checkout } from './checkout';
import { CartService } from '../../core/cart.service';
import { AuthService } from '../../core/auth.service';
import { of } from 'rxjs';

describe('Checkout Component', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;
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
      total: () => 80000,
      hasUnconfirmedPrices: () => false,
      canCheckout: () => true,
      loadCart: () => of({ item_count: 1 }),
      createPendingOrder: () => of({
        id: 1,
        order_number: 'ZF-ORD-20261028-1234',
        status: 'pending',
        total_amount: 80000,
        payment_method: 'nequi',
        created_at: new Date().toISOString(),
      }),
    };

    authServiceSpy = {
      isLoggedIn: () => true,
      user: () => ({ id: 1, name: 'Juan Pérez' }),
    };

    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: cartServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create checkout page', () => {
    expect(component).toBeTruthy();
  });

  it('displays informational alert on online payment click', () => {
    component.handleOnlinePaymentClick('Nequi');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(component.informationalAlert).toContain('próximamente');
    expect(el.textContent).toContain('próximamente');
  });
});
