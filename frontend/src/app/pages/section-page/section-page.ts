import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { SiteFooter } from '../../shared/site-footer/site-footer';

type SectionKey = 'services' | 'plans' | 'hours' | 'space' | 'products';

interface FeatureCard {
  title: string;
  description: string;
  duration?: string;
  detail?: string;
  image?: string;
  alt?: string;
}

interface SectionContent {
  key: SectionKey;
  eyebrow: string;
  title: string;
  description: string;
  cards: FeatureCard[];
  note: string;
}

const CONTENT: Record<SectionKey, SectionContent> = {
  services: {
    key: 'services',
    eyebrow: 'ENTRENA · RECUPERA · REPITE',
    title: 'Servicios para moverte a tu ritmo',
    description:
      'Conoce las zonas y espacios de Zona Fitness para construir una rutina que se sienta tuya.',
    cards: [
      {
        title: 'Cardio',
        description: 'Activa tu energía con sesiones a tu propio ritmo.',
      },
      {
        title: 'Zona de pesas',
        description: 'Espacio para entrenar fuerza y avanzar paso a paso.',
      },
      {
        title: 'Sauna',
        description: 'Un momento de pausa para cerrar tu rutina.',
      },
      {
        title: 'Jacuzzi',
        description: 'Completa tu visita con un espacio para relajarte.',
      },
    ],
    note: 'Consulta directamente con el gimnasio la disponibilidad de cada servicio.',
  },
  plans: {
    key: 'plans',
    eyebrow: 'EMPIEZA COMO QUIERAS',
    title: 'Planes para encontrar tu ritmo',
    description:
      'Elige la duración que mejor se adapta a ti. Los valores y condiciones deben confirmarse con Zona Fitness.',
    cards: [
      {
        title: 'Cobre',
        duration: '15 días',
        detail: '2 horas de ejercicio al día',
        description: 'Una opción para comenzar y conocer tu rutina.',
      },
      {
        title: 'Bronce',
        duration: '3 meses',
        detail: 'Un plan para construir constancia',
        description: 'Encuentra tu ritmo y sigue avanzando.',
      },
      {
        title: 'Platino',
        duration: '6 meses',
        detail: 'Más tiempo para mantener tu ritmo',
        description: 'Dale continuidad a tus objetivos.',
      },
      {
        title: 'Oro',
        duration: '1 año',
        detail: 'Un año para hacer del movimiento un hábito',
        description: 'Haz del entrenamiento parte de tu día a día.',
      },
    ],
    note: 'Precio por confirmar. La web no registra inscripciones ni procesa pagos; consulta las condiciones directamente con el gimnasio.',
  },
  hours: {
    key: 'hours',
    eyebrow: 'UN HORARIO QUE TE ACOMPAÑA',
    title: 'Encuentra el momento para ti',
    description:
      'Zona Fitness abre de lunes a sábado en dos franjas para que elijas la que encaja con tu día.',
    cards: [
      {
        title: 'Jornada de la mañana',
        duration: '5:00 a. m. – 11:00 a. m.',
        description: 'Lunes a sábado',
      },
      {
        title: 'Jornada de la tarde',
        duration: '3:00 p. m. – 10:00 p. m.',
        description: 'Lunes a sábado',
      },
    ],
    note: 'Confirma directamente con Zona Fitness cualquier cambio u horario especial.',
  },
  space: {
    key: 'space',
    eyebrow: 'CONOCE ZONA FITNESS',
    title: 'Un espacio para cada versión de ti',
    description: 'Explora algunos espacios de entrenamiento y encuentra nuevas formas de moverte.',
    cards: [
      {
        title: 'Un espacio para entrenar',
        description: 'Conoce el entorno y sus equipos.',
        image:
          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=960&q=85',
        alt: 'Interior de un gimnasio con equipos de entrenamiento',
      },
      {
        title: 'Fuerza a tu manera',
        description: 'Una zona para trabajar con pesas.',
        image:
          'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=720&q=85',
        alt: 'Persona entrenando con pesas',
      },
      {
        title: 'Muévete a tu ritmo',
        description: 'Encuentra tu lugar para hacer ejercicio.',
        image:
          'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=720&q=85',
        alt: 'Zona de entrenamiento con máquinas de gimnasio',
      },
    ],
    note: 'Las imágenes son referenciales y están pendientes de aprobación o reemplazo por fotografías oficiales del gimnasio.',
  },
  products: {
    key: 'products',
    eyebrow: 'UN EXTRA PARA TU RUTINA',
    title: 'Productos para acompañar tu entrenamiento',
    description:
      'Explora las categorías informativas de Zona Fitness. Consulta directamente con el gimnasio las referencias disponibles y sus características.',
    cards: [
      {
        title: 'Batidos de proteína',
        description:
          'Alternativas para complementar tu alimentación alrededor de tu rutina. Consulta ingredientes, presentación y disponibilidad.',
        image:
          'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=960&q=85',
        alt: 'Batido de frutos rojos servido en un vaso',
      },
      {
        title: 'Suplementación',
        description:
          'Conoce referencias de suplementación disponibles y revisa sus etiquetas e indicaciones antes de elegir.',
        image:
          'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=960&q=85',
        alt: 'Productos de suplementación deportiva',
      },
      {
        title: 'Productos para entrenar',
        description:
          'Accesorios y básicos para acompañar tus sesiones. Pregunta por los artículos y referencias disponibles.',
        image:
          'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=960&q=85',
        alt: 'Persona entrenando en un gimnasio',
      },
    ],
    note: 'Esta página es informativa; no procesa pedidos ni pagos. La información no reemplaza la orientación de un profesional de la salud. Confirma disponibilidad y consulta a un profesional antes de usar suplementos.',
  },
};

function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === 'string' && Object.hasOwn(CONTENT, value);
}

@Component({
  selector: 'app-section-page',
  imports: [RouterLink, SiteFooter],
  templateUrl: './section-page.html',
})
export class SectionPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly page = toSignal(
    this.route.data.pipe(
      map((data) => (isSectionKey(data['section']) ? CONTENT[data['section']] : CONTENT.services)),
    ),
    { initialValue: CONTENT.services },
  );
}
