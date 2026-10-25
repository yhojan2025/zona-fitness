import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {
  protected readonly socialLinks: { name: string; url: string }[] = [];

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
      featured: false,
    },
    {
      name: 'Bronce',
      duration: '3 meses',
      detail: 'Un plan para construir constancia',
      featured: false,
    },
    {
      name: 'Platino',
      duration: '6 meses',
      detail: 'Más tiempo para mantener tu ritmo',
      featured: true,
    },
    {
      name: 'Oro',
      duration: '1 año',
      detail: 'Un año para hacer del movimiento un hábito',
      featured: false,
    },
  ];

  protected readonly gallery = [
    {
      image:
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=960&q=85',
      alt: 'Interior de un gimnasio con equipos de entrenamiento',
      label: 'Un espacio para entrenar',
      className: 'gallery-large',
    },
    {
      image:
        'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=720&q=85',
      alt: 'Persona entrenando con pesas',
      label: 'Fuerza a tu manera',
      className: '',
    },
    {
      image:
        'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=720&q=85',
      alt: 'Zona de entrenamiento con máquinas de gimnasio',
      label: 'Muévete a tu ritmo',
      className: '',
    },
  ];
}
