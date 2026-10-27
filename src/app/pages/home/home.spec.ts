import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows the gym services, plans, hours, and age policy', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent).toContain('Cardio');
    expect(page.textContent).toContain('Zona de pesas');
    expect(page.textContent).toContain('Sauna');
    expect(page.textContent).toContain('Jacuzzi');
    expect(page.textContent).toContain('15 días');
    expect(page.textContent).toContain('3 meses');
    expect(page.textContent).toContain('6 meses');
    expect(page.textContent).toContain('1 año');
    expect(page.textContent).toContain('5:00 a. m. – 11:00 a. m.');
    expect(page.textContent).toContain('3:00 p. m. – 10:00 p. m.');
    expect(page.textContent).toContain('14 años');
    expect(page.textContent).toContain('Nequi y Bancolombia');
  });

  it('shows a category icon for each home plan', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelectorAll('.plan-card .plan-metal-icon')).toHaveLength(4);
    expect(page.querySelector('.plan-metal-cobre svg')).not.toBeNull();
    expect(page.querySelector('.plan-metal-bronce svg')).not.toBeNull();
    expect(page.querySelector('.plan-metal-platino svg')).not.toBeNull();
    expect(page.querySelector('.plan-metal-oro svg')).not.toBeNull();
  });

  it('keeps the featured plan label subtle and out of the plan content flow', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const tag = fixture.nativeElement.querySelector('.plan-tag') as HTMLElement;

    expect(tag?.textContent).toContain('PARA SEGUIR AVANZANDO');
    expect(tag?.parentElement?.classList.contains('plan-card')).toBe(true);
  });

  it('renders each service as an independent rounded information card', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.service-card');

    expect(cards).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll('.service-card .service-icon')).toHaveLength(4);
  });

  it('keeps the start link readable on the light schedule section', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.schedule-start-link') as HTMLAnchorElement;

    expect(link.textContent).toContain('Conoce cómo empezar');
    expect(link.classList.contains('text-link')).toBe(true);
  });

  it('does not invent plan prices or official contact links', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent).toContain('Precio por confirmar');
    expect(page.textContent).toContain('Confirma los datos oficiales de pago');
    expect(page.querySelectorAll('#redes a[href^="https://"]')).toHaveLength(0);
  });

  it('shows social section and copyright without inventing social links', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('#redes')?.textContent).toContain('perfiles oficiales');
    expect(page.querySelector('#redes')?.textContent).toContain('maquetas visuales locales');
    expect(page.querySelectorAll('#redes .social-prototype-card')).toHaveLength(3);
    expect(page.querySelectorAll('#redes .social-sample-gallery img')).toHaveLength(6);
    expect(page.querySelectorAll('#redes .social-platform-icon')).toHaveLength(3);
    expect(page.querySelector('#redes a[href^="https://"]')).toBeNull();
    expect(page.querySelector('#redes')?.textContent).toContain('Visita las redes de Zona Fitness');
    expect(page.querySelector('#redes a[href="/redes/instagram.html"]')?.textContent).toContain(
      'Visitar Instagram',
    );
    expect(page.querySelector('#redes a[href="/redes/facebook.html"]')?.textContent).toContain(
      'Visitar Facebook',
    );
    expect(page.querySelector('#redes a[href="/redes/whatsapp.html"]')?.textContent).toContain(
      'Abrir WhatsApp',
    );
    expect(page.textContent).toContain(
      '© 2026 Análisis y diseño de soluciones web 12. Todos los derechos reservados.',
    );
    expect(page.querySelector('.site-footer .footer-logo')?.getAttribute('src')).toBe(
      '/zona-fitness-logo.png',
    );
    expect(page.querySelector('.site-footer .footer-logo')?.getAttribute('alt')).toBe(
      'Logo de Zona Fitness',
    );
  });

  it('keeps the home gallery images uniform and emphasizes its description', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelectorAll('.gallery-grid figure')).toHaveLength(3);
    expect(page.querySelectorAll('.gallery-grid figure.gallery-large')).toHaveLength(0);
    expect(page.querySelector('.gallery-description strong')?.textContent).toContain(
      'Cardio, pesas y momentos para recuperar.',
    );
  });

  it('provides an accessible hero image slider with working controls', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const slider = page.querySelector('.hero-visual');
    const image = slider?.querySelector('img');

    expect(slider?.getAttribute('aria-roledescription')).toBe('carrusel');
    expect(page.querySelectorAll('.slider-dot')).toHaveLength(4);
    expect(image?.getAttribute('alt')).toContain('Gimnasio equipado');
    expect(image?.classList.contains('hero-slide-image')).toBe(true);

    page.querySelector<HTMLButtonElement>('[aria-label="Imagen siguiente"]')?.click();
    fixture.detectChanges();

    expect(page.querySelector('.hero-slide-image')?.getAttribute('alt')).toContain(
      'Persona entrenando fuerza',
    );
  });

  it('rotates hero images every five seconds and allows pausing', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(Home);
      fixture.detectChanges();
      const page = fixture.nativeElement as HTMLElement;

      vi.advanceTimersByTime(5000);
      fixture.detectChanges();
      expect(page.querySelector('.hero-slide-image')?.getAttribute('alt')).toContain(
        'Persona entrenando fuerza',
      );

      page.querySelector<HTMLButtonElement>('[aria-label="Pausar rotación automática"]')?.click();
      fixture.detectChanges();
      vi.advanceTimersByTime(5000);
      fixture.detectChanges();
      expect(page.querySelector('.hero-slide-image')?.getAttribute('alt')).toContain(
        'Persona entrenando fuerza',
      );
      expect(page.querySelector('[aria-label="Reanudar rotación automática"]')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
