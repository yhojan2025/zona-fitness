import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { SiteFooter } from '../../shared/site-footer/site-footer';

@Component({
  selector: 'app-home',
  imports: [RouterLink, SiteFooter],
  templateUrl: './home.html',
})
export class Home {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly socialLinks: { name: string; url: string }[] = [];
  protected readonly heroSlides = [
    {
      image:
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=75&fm=webp',
      alt: 'Gimnasio equipado con máquinas y áreas de entrenamiento',
      label: 'UN ESPACIO PARA ENTRENAR',
    },
    {
      image:
        'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=75&fm=webp',
      alt: 'Persona entrenando fuerza con pesas',
      label: 'FUERZA A TU MANERA',
    },
    {
      image:
        'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=1200&q=75&fm=webp',
      alt: 'Zona de entrenamiento y equipos de gimnasio',
      label: 'ENCUENTRA TU RITMO',
    },
    {
      image:
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=75&fm=webp',
      alt: 'Entrenamiento personal en un espacio deportivo',
      label: 'HAZ ESPACIO PARA TI',
    },
  ];
  protected readonly activeHeroIndex = signal(0);
  protected readonly activeHeroSlide = computed(() => this.heroSlides[this.activeHeroIndex()]);
  protected readonly heroRotationPaused = signal(false);
  protected readonly heroSecondsRemaining = signal(5);

  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.heroRotationPaused()) {
          const secondsRemaining = this.heroSecondsRemaining();
          if (secondsRemaining <= 1) {
            this.moveHeroSlide(1);
          } else {
            this.heroSecondsRemaining.set(secondsRemaining - 1);
          }
        }
      });
  }

  protected readonly services = [
    {
      number: '01',
      name: 'Cardio',
      description: 'Activa tu energía con sesiones a tu propio ritmo.',
    },
    {
      number: '02',
      name: 'Zona de pesas',
      description: 'Espacio para entrenar fuerza y avanzar paso a paso.',
    },
    { number: '03', name: 'Sauna', description: 'Un momento de pausa para cerrar tu rutina.' },
    {
      number: '04',
      name: 'Jacuzzi',
      description: 'Completa tu visita con un espacio para relajarte.',
    },
  ];

  protected readonly plans = [
    {
      name: 'Cobre',
      duration: '15 días',
      detail: '2 horas de ejercicio al día',
      price: '$45.000',
      featured: false,
    },
    {
      name: 'Bronce',
      duration: '3 meses',
      detail: 'Un plan para construir constancia',
      price: '$260.000',
      featured: false,
    },
    {
      name: 'Platino',
      duration: '6 meses',
      detail: 'Más tiempo para mantener tu ritmo',
      price: '$500.000',
      featured: true,
    },
    {
      name: 'Oro',
      duration: '1 año',
      detail: 'Un año para hacer del movimiento un hábito',
      price: '$900.000',
      featured: false,
    },
  ];

  protected readonly gallery = [
    {
      image:
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=960&q=75&fm=webp',
      alt: 'Interior de un gimnasio con equipos de entrenamiento',
      label: 'Un espacio para entrenar',
      className: '',
    },
    {
      image:
        'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=720&q=75&fm=webp',
      alt: 'Persona entrenando con pesas',
      label: 'Fuerza a tu manera',
      className: '',
    },
    {
      image:
        'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=720&q=75&fm=webp',
      alt: 'Zona de entrenamiento con máquinas de gimnasio',
      label: 'Muévete a tu ritmo',
      className: '',
    },
  ];

  protected showHeroSlide(index: number): void {
    this.activeHeroIndex.set((index + this.heroSlides.length) % this.heroSlides.length);
    this.heroSecondsRemaining.set(5);
  }

  protected moveHeroSlide(direction: number): void {
    this.showHeroSlide(this.activeHeroIndex() + direction);
  }

  protected toggleHeroRotation(): void {
    this.heroRotationPaused.update((paused) => !paused);
  }
}
