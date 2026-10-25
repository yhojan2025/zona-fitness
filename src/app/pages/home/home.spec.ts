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
    expect(page.querySelector('#redes a')).toBeNull();
    expect(page.textContent).toContain(
      '© 2026 Análisis y soluciones web 12. Todos los derechos reservados.',
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

    page.querySelector<HTMLButtonElement>('[aria-label="Imagen siguiente"]')?.click();
    fixture.detectChanges();

    expect(image?.getAttribute('alt')).toContain('Persona entrenando fuerza');
  });
});
