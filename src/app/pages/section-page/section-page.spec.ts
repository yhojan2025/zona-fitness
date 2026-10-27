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
    expect(page?.querySelectorAll('.space-photo')).toHaveLength(3);
    expect(page?.querySelectorAll('.space-photo .space-subtitle')).toHaveLength(3);
    expect(page?.querySelector('.detail-description')?.textContent).toContain(
      'Explora algunos espacios',
    );
  });
});
