import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders name, email, password and privacy policy fields', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h2')?.textContent).toContain('Crear cuenta');
    // Verifica que existan los inputs principales de registro
    expect(el.querySelector('input[name="name"]')).toBeTruthy();
    expect(el.querySelector('input[name="email"]')).toBeTruthy();
    expect(el.querySelector('input[name="password"]')).toBeTruthy();
    expect(el.querySelector('input[name="birthDate"]')).toBeTruthy();
    expect(el.querySelector('input[name="acceptedPrivacyPolicy"]')).toBeTruthy();
  });

  it('goes to /login after registering', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.name = 'Ana';
    component.email = 'ana@example.com';
    component.password = 'password123';
    component.acceptedPrivacyPolicy = true;
    component.submit();

    const req = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.body).toEqual({
      name: 'Ana',
      email: 'ana@example.com',
      password: 'password123',
      accepted_privacy_policy: true,
    });
    req.flush({ id: 1, name: 'Ana', email: 'ana@example.com', role: 'user', is_active: true });

    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('blocks submit if age is under 14 and shows alert', () => {
    component.birthDate = '2015-01-01'; // 11 años
    expect(component.isUnderageRestricted()).toBe(true);

    component.submit();
    expect(component.error()).toContain('edad mínima de 14 años');
    http.expectNone(`${environment.apiUrl}/auth/register`);
  });

  it('explains that the email is already registered on 409', () => {
    component.submit();
    http.expectOne(`${environment.apiUrl}/auth/register`).flush({}, { status: 409, statusText: 'Conflict' });
    expect(component.error()).toBe('Ese email ya está registrado');
    expect(component.loading()).toBe(false);
  });

  it('shows a validation hint on 422', () => {
    component.submit();
    http.expectOne(`${environment.apiUrl}/auth/register`).flush({}, { status: 422, statusText: 'Unprocessable' });
    expect(component.error()).toContain('Datos inválidos');
  });
});
