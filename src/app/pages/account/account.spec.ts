import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Account } from './account';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { of } from 'rxjs';

describe('Account Component', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;
  let authServiceSpy: any;
  let cartServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      user: () => ({ id: 1, name: 'Carlos Pérez', email: 'carlos@test.com', role: 'user' }),
      hasRole: (r: string) => r === 'user',
      getProfile: () => of({ id: 1, name: 'Carlos Pérez', email: 'carlos@test.com', role: 'user' }),
      updateProfile: () => of({}),
      logout: () => {},
    };

    cartServiceSpy = {
      getOrders: () => of([
        {
          id: 1,
          order_number: 'ZF-ORD-20261028-1234',
          user_id: 1,
          status: 'pending',
          total_amount: 80000,
          payment_method: 'nequi',
          created_at: new Date().toISOString(),
          items: [],
        },
      ]),
      getMyActiveMembership: () => of({
        active: true,
        membership: {
          id: 1,
          plan_name: 'Plan Platino',
          raw_plan_name: 'Platino',
          status: 'active',
          start_date: '2026-10-29',
          end_date: '2027-04-27',
          duration: '6 meses',
          duration_days: 180,
          price_registered: 500000,
          order_number: 'ZF-ORD-20261029-9999',
          payment_status: 'SIMULADO — SIN COBRO REAL',
          days_remaining: 180,
          is_simulated: true,
        },
      }),
      getMyMembershipHistory: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [Account],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create account page', () => {
    expect(component).toBeTruthy();
  });

  it('calculates user initials correctly', () => {
    expect(component.userInitials).toBe('CP');
  });

  it('displays active membership when available', () => {
    component.setTab('memberships');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('MI MEMBRESÍA ACTIVA');
    expect(el.textContent).toContain('Plan Platino');
    expect(el.textContent).toContain('SIMULADO — SIN COBRO REAL');
  });

  it('displays user name and email', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Carlos Pérez');
    expect(el.textContent).toContain('carlos@test.com');
  });
});
