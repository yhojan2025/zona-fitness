import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';

describe('dedicated navigation pages', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter(routes)],
    }).compileComponents();
  });

  it('opens dedicated pages for every public navigation link', async () => {
    const harness = await RouterTestingHarness.create();
    const expectedPages = [
      { path: '/servicios', heading: 'Servicios para moverte a tu ritmo' },
      { path: '/planes', heading: 'Planes para encontrar tu ritmo' },
      { path: '/horarios', heading: 'Encuentra el momento para ti' },
      { path: '/espacio', heading: 'Un espacio para cada versión de ti' },
      { path: '/productos', heading: 'Productos para acompañar tu entrenamiento' },
    ];

    for (const page of expectedPages) {
      await harness.navigateByUrl(page.path);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(page.heading);
    }
  });

  it('updates the displayed page when navigating between shared section routes', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/servicios');
    expect(harness.routeNativeElement?.textContent).toContain('Zona de pesas');

    await harness.navigateByUrl('/planes');
    expect(harness.routeNativeElement?.textContent).toContain('Cobre');
    expect(harness.routeNativeElement?.textContent).toContain('Precio por confirmar');
  });

  it('shows category icons for every dedicated plan card', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/planes');
    const page = harness.routeNativeElement;

    expect(page?.querySelectorAll('.plan-detail-card .plan-metal-icon')).toHaveLength(4);
    expect(page?.querySelector('.plan-metal-cobre svg')).not.toBeNull();
    expect(page?.querySelector('.plan-metal-bronce svg')).not.toBeNull();
    expect(page?.querySelector('.plan-metal-platino svg')).not.toBeNull();
    expect(page?.querySelector('.plan-metal-oro svg')).not.toBeNull();
  });

  it('styles the dedicated service cards like the hours information cards', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/servicios');
    const page = harness.routeNativeElement;

    expect(page?.querySelectorAll('.service-cards .detail-card')).toHaveLength(4);
    expect(page?.querySelectorAll('.service-cards .detail-icon')).toHaveLength(4);
  });

  it('shows the three informational product categories without checkout or invented prices', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/productos');
    const page = harness.routeNativeElement;

    expect(page?.textContent).toContain('Batidos de proteína');
    expect(page?.textContent).toContain('Suplementación');
    expect(page?.textContent).toContain('Productos para entrenar');
    expect(page?.textContent).toContain('no procesa pedidos ni pagos');
    expect(page?.querySelectorAll('.product-detail-card')).toHaveLength(3);
    expect(page?.querySelectorAll('a[href="/#inscripcion"]')).toHaveLength(3);
    expect(page?.textContent).not.toContain('$');
  });

  it('shows the shared Zona Fitness footer on every public section page', async () => {
    const harness = await RouterTestingHarness.create();
    const paths = ['/servicios', '/planes', '/horarios', '/espacio', '/productos'];

    for (const path of paths) {
      await harness.navigateByUrl(path);
      const footer = harness.routeNativeElement?.querySelector('app-site-footer');

      expect(footer?.querySelector('.footer-logo')?.getAttribute('src')).toBe(
        '/zona-fitness-logo.png',
      );
      expect(footer?.textContent).toContain(
        '© 2026 Análisis y diseño de soluciones web 12. Todos los derechos reservados.',
      );
    }
  });

  it('uses equal-sized images and bold subtitles on the El espacio page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/espacio');
    const page = harness.routeNativeElement;

    expect(page?.querySelector('.page-space')).not.toBeNull();
    expect(page?.querySelectorAll('.space-photo')).toHaveLength(4);
    expect(page?.querySelectorAll('.space-photo .space-subtitle')).toHaveLength(4);
    expect(page?.textContent).toContain('Espacio de cardio');
    expect(page?.textContent).toContain('Zona de pesas');
    expect(page?.textContent).toContain('Sauna');
    expect(page?.textContent).toContain('Jacuzzi');
    expect(page?.querySelector('.space-about')).not.toBeNull();
    expect(page?.querySelector('.space-about h2')?.textContent).toContain(
      'Un lugar para hacer de tu rutina un hábito',
    );
    expect(page?.querySelector('.space-about-brand img')?.getAttribute('src')).toBe(
      '/zona-fitness-logo.png',
    );
    expect(page?.querySelector('.detail-description')?.textContent).toContain(
      'Explora algunos espacios',
    );
  });
});
