import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { map } from 'rxjs';
import { SiteFooter } from '../../shared/site-footer/site-footer';

type SectionKey = 'services' | 'plans' | 'hours' | 'space' | 'products';

interface FeatureCard {
  id?: number;
  slug?: string;
  title: string;
  description: string;
  duration?: string;
  detail?: string;
  price?: string;
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
  about?: {
    image: string;
    imageAlt: string;
  };
  location?: {
    address: string;
    mapUrl: string;
    embedUrl: string;
    image: string;
    imageAlt: string;
  };
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
      'Elige la duración que mejor se adapta a ti. Todos los valores están expresados en pesos colombianos.',
    cards: [
      {
        id: 1, slug: 'cobre', title: 'Cobre',
        duration: '15 días',
        detail: '2 horas de ejercicio al día',
        price: '$45.000',
        description: 'Una opción para comenzar y conocer tu rutina.',
      },
      {
        id: 2, slug: 'bronce', title: 'Bronce',
        duration: '3 meses',
        detail: 'Un plan para construir constancia',
        price: '$260000',
        description: 'Encuentra tu ritmo y sigue avanzando.',
      },
      {
        id: 3, slug: 'platino', title: 'Platino',
        duration: '6 meses',
        detail: 'Más tiempo para mantener tu ritmo',
        price: '$500000',
        description: 'Dale continuidad a tus objetivos.',
      },
      {
        id: 4, slug: 'oro', title: 'Oro',
        duration: '1 año',
        detail: 'Un año para hacer del movimiento un hábito',
        price: '$900000',
        description: 'Haz del entrenamiento parte de tu día a día.',
      },
    ],
    note: 'Valores expresados en pesos colombianos. La web no registra inscripciones ni procesa pagos; consulta las condiciones directamente con el gimnasio.',
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
    location: {
      address: 'Cra. 7 # 7-7, Aguadas, Caldas',
      mapUrl:
        'https://www.google.com/maps/place/Cra.+7+%23+7-7,+Aguadas,+Caldas/@5.613327,-75.4571107,19z/data=!3m1!4b1!4m6!3m5!1s0x8e46e3eb5d185a53:0x370767b119f68c8f!8m2!3d5.613327!4d-75.456467!16s%2Fg%2F11x7gw0hqn?entry=ttu&g_ep=EgoyMDI2MTAyMC4wIKXMDSoASAFQAw%3D%3D',
      embedUrl: 'https://www.google.com/maps?q=Cra.+7+%237-7,+Aguadas,+Caldas&output=embed',
      image: '/zona-fitness-fachada.jpg',
      imageAlt: 'Fachada exterior generada como referencia para Zona Fitness',
    },
  },
  space: {
    key: 'space',
    eyebrow: 'CONOCE ZONA FITNESS',
    title: 'Un espacio para cada versión de ti',
    description: 'Explora algunos espacios de entrenamiento y encuentra nuevas formas de moverte.',
    cards: [
      {
        title: 'Espacio de cardio',
        description: 'Activa tu energía con sesiones a tu propio ritmo.',
        image:
          'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=960&q=75&fm=webp',
        alt: 'Máquinas de cardio en una zona de gimnasio',
      },
      {
        title: 'Zona de pesas',
        description: 'Entrena fuerza y avanza paso a paso.',
        image:
          'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=720&q=75&fm=webp',
        alt: 'Persona entrenando con pesas',
      },
      {
        title: 'Sauna',
        description: 'Un momento de pausa para cerrar tu rutina.',
        image:
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=720&q=75&fm=webp',
        alt: 'Espacio de spa y recuperación con ambiente cálido',
      },
      {
        title: 'Jacuzzi',
        description: 'Completa tu visita con un espacio para relajarte.',
        image:
          'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=720&q=75&fm=webp',
        alt: 'Piscina de hidromasaje en un espacio de bienestar',
      },
    ],
    note: 'Las imágenes son referenciales y están pendientes de aprobación o reemplazo por fotografías oficiales del gimnasio.',
    about: {
      image: '/zona-fitness-atleta-hidratandose.jpg',
      imageAlt:
        'Atleta adulta hidratándose después de entrenar en una imagen generada para Zona Fitness',
    },
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
          'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=960&q=75&fm=webp',
        alt: 'Batido de frutos rojos servido en un vaso',
      },
      {
        title: 'Suplementación',
        description:
          'Conoce referencias de suplementación disponibles y revisa sus etiquetas e indicaciones antes de elegir.',
        image:
          'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=960&q=75&fm=webp',
        alt: 'Productos de suplementación deportiva',
      },
      {
        title: 'Productos para entrenar',
        description:
          'Accesorios y básicos para acompañar tus sesiones. Pregunta por los artículos y referencias disponibles.',
        image:
          'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=960&q=75&fm=webp',
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
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly cartService = inject(CartService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly page = toSignal(
    this.route.data.pipe(
      map((data) => (isSectionKey(data['section']) ? CONTENT[data['section']] : CONTENT.services)),
    ),
    { initialValue: CONTENT.services },
  );

  protected readonly hoursMapEmbedUrl: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl(CONTENT.hours.location?.embedUrl ?? '');
  protected buyPlan(card: FeatureCard): void {
    const planIdMap: Record<string, number> = {
      Cobre: 1,
      Bronce: 2,
      Platino: 3,
      Oro: 4,
    };
    const id = card.id || planIdMap[card.title] || 1;
    if (!this.auth.isLoggedIn()) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          'pending_buy_plan',
          JSON.stringify({ id, name: card.title, slug: card.slug || card.title.toLowerCase() })
        );
      }
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/carrito' } });
      return;
    }
    this.cartService.addItem('plan', id).subscribe({
      next: () => {
        this.router.navigate(['/carrito']);
      },
    });
  }
}
