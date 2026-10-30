import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { customerGuard } from './customer.guard';
import { AuthService } from './auth.service';

describe('customerGuard', () => {
  let authServiceSpy: any;
  let routerSpy: any;

  beforeEach(() => {
    authServiceSpy = {
      isLoggedIn: vitest.fn(),
      hasRole: vitest.fn(),
    };
    routerSpy = {
      navigate: vitest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  it('allows normal customers and visitors to access commercial routes', () => {
    authServiceSpy.isLoggedIn.mockReturnValue(false);
    authServiceSpy.hasRole.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => customerGuard({} as any, {} as any));
    expect(result).toBe(true);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('blocks administrators from accessing commercial routes and redirects to /admin/dashboard', () => {
    authServiceSpy.isLoggedIn.mockReturnValue(true);
    authServiceSpy.hasRole.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => customerGuard({} as any, {} as any));
    expect(result).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });
});
