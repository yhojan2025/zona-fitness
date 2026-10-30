import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminLogin } from './admin-login';
import { AuthService } from '../../../core/auth.service';

describe('AdminLogin Component', () => {
  let component: AdminLogin;
  let fixture: ComponentFixture<AdminLogin>;
  let authServiceSpy: any;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      login: () => of({ user: { id: 1, role: 'admin', name: 'Admin', email: 'admin@zonafitness.com' } }),
      logout: () => {},
    };

    await TestBed.configureTestingModule({
      imports: [AdminLogin],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AdminLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create admin login page', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('ACCESO ADMINISTRATIVO');
  });

  it('toggles password visibility', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePassword();
    expect(component.showPassword()).toBe(true);
  });

  it('redirects to /admin/dashboard when an admin logs in', () => {
    const navigateSpy = vitest.spyOn(router, 'navigate');
    component.email = 'admin@zonafitness.com';
    component.password = 'SuperSecret123!';
    component.submit();

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('rejects non-admin users attempting to log in', () => {
    authServiceSpy.login = () => of({ user: { id: 2, role: 'user', name: 'Regular' } });
    const logoutSpy = vitest.spyOn(authServiceSpy, 'logout');
    component.email = 'user@test.com';
    component.password = 'UserPass123!';
    component.submit();

    expect(logoutSpy).toHaveBeenCalled();
    expect(component.error()).toContain('Acceso denegado');
  });
});
