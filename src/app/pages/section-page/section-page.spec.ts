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
});
