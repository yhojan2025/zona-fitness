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

  it('shows an exterior reference image for the gym facade', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/espacio');
    const facadeImage = harness.routeNativeElement?.querySelector(
      '.space-photo img[alt*="Fachada exterior"]',
    );

    expect(facadeImage?.getAttribute('src')).toBe('/zona-fitness-fachada.jpg');
    expect(harness.routeNativeElement?.textContent).toContain('La fachada de Zona Fitness');
    expect(harness.routeNativeElement?.textContent).toContain('vista exterior ilustrada');
  });

  it('shows the exterior reference image beside the map on the Horarios page', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/horarios');
    const page = harness.routeNativeElement;

    expect(page?.textContent).toContain('¿DÓNDE ENCONTRARNOS?');
    expect(page?.textContent).toContain('Cra. 7 # 7-7, Aguadas, Caldas');
    expect(page?.querySelector('.hours-location-photo img')?.getAttribute('alt')).toContain(
      'Fachada exterior generada',
    );
    expect(page?.querySelector('.hours-location-map iframe')?.getAttribute('title')).toContain(
      'Mapa de ubicación',
    );
  });

  it('shows the hydration scene in the gym information block', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/espacio');
    const page = harness.routeNativeElement;

    expect(page?.textContent).toContain('ACERCA DEL GYM');
    expect(page?.querySelector('.space-about-photo img')?.getAttribute('src')).toBe(
      '/zona-fitness-atleta-hidratandose.jpg',
    );
    expect(page?.querySelector('.space-about-photo img')?.getAttribute('alt')).toContain(
      'Atleta adulta hidratándose',
    );
  });
});
