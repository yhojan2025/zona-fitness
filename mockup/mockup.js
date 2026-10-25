const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');

menuButton.addEventListener('click', () => {
  const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isExpanded));
  menuButton.setAttribute('aria-label', isExpanded ? 'Abrir navegación' : 'Cerrar navegación');
  navigation.classList.toggle('is-open', !isExpanded);
});

navigation.addEventListener('click', (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir navegación');
    navigation.classList.remove('is-open');
  }
});

const heroSlides = [
  {
    image:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=90',
    alt: 'Gimnasio equipado con máquinas y áreas de entrenamiento',
    label: 'UN ESPACIO PARA ENTRENAR',
  },
  {
    image:
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=90',
    alt: 'Persona entrenando fuerza con pesas',
    label: 'FUERZA A TU MANERA',
  },
  {
    image:
      'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=1200&q=90',
    alt: 'Zona de entrenamiento y equipos de gimnasio',
    label: 'ENCUENTRA TU RITMO',
  },
  {
    image:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=90',
    alt: 'Entrenamiento personal en un espacio deportivo',
    label: 'HAZ ESPACIO PARA TI',
  },
];

const heroImage = document.querySelector('#hero-image');
const heroCaption = document.querySelector('#hero-caption');
const heroDots = [...document.querySelectorAll('.slider-dot')];
const heroArrows = document.querySelectorAll('.slider-arrow');
let activeHeroIndex = 0;

function showHeroSlide(index) {
  activeHeroIndex = (index + heroSlides.length) % heroSlides.length;
  const slide = heroSlides[activeHeroIndex];
  heroImage.classList.remove('hero-slide-image');
  void heroImage.offsetWidth;
  heroImage.src = slide.image;
  heroImage.alt = slide.alt;
  heroCaption.textContent = slide.label;
  heroImage.classList.add('hero-slide-image');

  heroDots.forEach((dot, dotIndex) => {
    const active = dotIndex === activeHeroIndex;
    dot.classList.toggle('active', active);
    dot.setAttribute('aria-pressed', String(active));
  });
}

heroArrows[0].addEventListener('click', () => showHeroSlide(activeHeroIndex - 1));
heroArrows[1].addEventListener('click', () => showHeroSlide(activeHeroIndex + 1));
heroDots.forEach((dot, index) => {
  dot.addEventListener('click', () => showHeroSlide(index));
});
