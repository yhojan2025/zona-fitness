import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { Role } from './core/models';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  async function render(role?: Role) {
    if (role) {
      const auth = TestBed.inject(AuthService);
      auth.token.set('abc');
      auth.user.set({ id: 1, name: 'Ana', email: 'a@x.com', role, is_active: true });
    }
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows the Zona Fitness brand and public navigation when logged out', async () => {
    const el = await render();
    expect(el.querySelector('.brand-mark')?.getAttribute('src')).toContain('zona-fitness-icon.png');
    expect(el.querySelector('.brand-wordmark')?.textContent).toContain('FITNESS');
    expect(el.querySelector('.primary-nav')?.textContent).toContain('Planes');
    expect(el.querySelector('.header-action')?.textContent).toContain('Acceso del equipo');
  });

  it('links each public navigation item to its dedicated page', async () => {
    const el = await render();

    expect(el.querySelector('.primary-nav a[href="/servicios"]')?.textContent).toContain(
      'Servicios',
    );
    expect(el.querySelector('.primary-nav a[href="/planes"]')?.textContent).toContain('Planes');
    expect(el.querySelector('.primary-nav a[href="/horarios"]')?.textContent).toContain('Horarios');
    expect(el.querySelector('.primary-nav a[href="/espacio"]')?.textContent).toContain(
      'El espacio',
    );
  });

  it('shows the user name and role badge when logged in', async () => {
    const el = await render('agent');
    expect(el.querySelector('.session')?.textContent).toContain('Ana');
    expect(el.querySelector('.badge')?.textContent).toContain('agent');
  });

  it('shows the "Usuarios" link only to admins', async () => {
    expect((await render('admin')).querySelector('.session')?.textContent).toContain('Usuarios');
  });

  it('hides the "Usuarios" link from non-admins', async () => {
    expect((await render('user')).querySelector('.session')?.textContent).not.toContain('Usuarios');
  });
});
