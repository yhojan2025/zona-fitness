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

  it('does not invent plan prices or contact information', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent).toContain('Precio por confirmar');
    expect(page.textContent).toContain('Confirma los datos oficiales de pago');
    expect(page.querySelectorAll('a[href^="https://"]')).toHaveLength(0);
  });
});
