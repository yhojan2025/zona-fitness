import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';

describe('CartService', () => {
  let service: CartService;
  let http: HttpTestingController;
  let authServiceSpy: any;
  const url = environment.apiUrl;

  beforeEach(() => {
    authServiceSpy = {
      isLoggedIn: () => true,
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(CartService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created and initial cart is empty', () => {
    expect(service).toBeTruthy();
    expect(service.count()).toBe(0);
    expect(service.subtotal()).toBe(0);
  });

  it('loadCart() sends GET /cart and updates cart state', () => {
    const mockResponse = {
      items: [
        {
          id: 1,
          item_type: 'plan' as const,
          item_id: 1,
          name: 'Plan Bronce',
          unit_price: 80000,
          price_unconfirmed: false,
          quantity: 2,
          subtotal: 160000,
        },
      ],
      item_count: 2,
      subtotal: 160000,
      total_amount: 160000,
      has_unconfirmed_prices: false,
      unconfirmed_items_count: 0,
      can_checkout: true,
    };

    service.loadCart().subscribe((res) => {
      expect(res.item_count).toBe(2);
      expect(service.count()).toBe(2);
      expect(service.subtotal()).toBe(160000);
      expect(service.canCheckout()).toBe(true);
    });

    const req = http.expectOne(`${url}/cart`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('clearCart() sends DELETE /cart and resets state', () => {
    service.clearCart().subscribe();
    const req = http.expectOne(`${url}/cart`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'El carrito ha sido vaciado exitosamente' });

    expect(service.count()).toBe(0);
    expect(service.items().length).toBe(0);
  });
});
