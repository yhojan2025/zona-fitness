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
