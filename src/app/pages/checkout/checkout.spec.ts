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
      getBankAccounts: () => of([
        {
          id: 1,
          bank_name: 'Bancolombia',
          account_type: 'Ahorros',
          account_number: '742-983421-15',
          account_holder: 'ZONA FITNESS S.A.S.',
          document_type: 'NIT',
          document_number: '901.876.543-2',
          is_active: true,
        },
      ]),
      submitTransferCheckout: () => of({
        success: true,
        order: {
          id: 10,
          order_number: 'ZF-ORD-TRANSFER-01',
          status: 'pending_verification',
          payment_method: 'transferencia',
          total_amount: 80000,
          created_at: new Date().toISOString(),
        },
      }),
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

  it('requires receipt file when submitting bank transfer order', () => {
    component.selectedPaymentMethod = 'transferencia';
    component.selectedFile = null;
    component.submitTransferOrder();
    expect(component.fileError).toContain('Debes adjuntar el comprobante');
  });

  it('submits transfer checkout and displays mandatory pending verification message', () => {
    component.selectedPaymentMethod = 'transferencia';
    const fakeFile = new File(['fake image content'], 'receipt.jpg', { type: 'image/jpeg' });
    component.selectedFile = fakeFile;
    component.submitTransferOrder();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(component.createdOrder?.status).toBe('pending_verification');
    expect(el.textContent).toContain('Tu comprobante fue recibido correctamente. Tu pago está pendiente de verificación por parte del administrador. Tu membresía se activará una vez confirmado el pago.');
  });
});
