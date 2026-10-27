# Guía breve para actualizar contenido

El sitio usa contenido estático de Angular. **No existe un panel de administración de contenido**: los cambios requieren modificar el código, ejecutar las comprobaciones y volver a desplegar la web.

## Contenido de la landing

Desde `src/app/pages/home/home.ts`:

- `services`: títulos y descripciones de cardio, pesas, sauna y jacuzzi.
- `plans`: nombre, duración, descripción y tarjeta destacada.
- `heroSlides`: fotografías, textos alternativos y rótulos del carrusel principal.
- `gallery`: URL de cada imagen, texto alternativo y etiqueta.
- `socialLinks`: enlaces de redes oficiales. La lista está vacía hasta que el gimnasio confirme URLs; no agregues perfiles supuestos.
- Las maquetas de Instagram, Facebook y WhatsApp están en `public/redes/` y se enlazan desde la sección Redes de la landing. Son prototipos locales, no perfiles oficiales. Sus imágenes y estilos se actualizaron con los paquetes entregados; edita las publicaciones en `public/redes/instagram.html`, `public/redes/facebook.html` y `public/redes/whatsapp.html`, y los recursos en `public/redes/assets/`. No publiques nombres de usuario, cifras, insignias, URLs ni datos de contacto no confirmados. Actualiza `socialLinks` únicamente cuando el gimnasio entregue sus enlaces oficiales.

Desde `src/app/pages/home/home.html`:

- Titulares, párrafos y avisos comerciales.
- Horarios, productos, medios de pago y política de edad.
- Orden de secciones y anclas usadas por la navegación.

Desde `src/app/app.html`:

- Enlaces visibles de navegación y acceso del equipo.

Desde `src/index.html`:

- Título, idioma, descripción y color de tema del sitio.
- Icono de pestaña: `public/zona-fitness-icon.png`.

La marca del encabezado y del pie usa `public/zona-fitness-logo.png`. El footer público compartido está en `src/app/shared/site-footer/` y conserva el copyright del sitio.

Desde `src/styles.css`, `src/app/app.css` y `src/app/pages/home/home.css`:

- Colores, tipografía, disposición y breakpoints responsive.
- La tipografía usa Montserrat para títulos y Open Sans para textos de lectura.

## Precios, pagos, contacto e imágenes

- No publiques precios, teléfonos, direcciones, redes, enlaces de contacto o datos bancarios hasta recibir y verificar los valores oficiales del gimnasio.
- Antes de usar fotografías propias, confirma permiso de uso y aprobación. Las imágenes remotas actuales son provisionales; prefiere archivos optimizados en `public/` cuando el equipo entregue los recursos definitivos.
- Mantén un `alt` descriptivo en las imágenes informativas y `alt=""` solo en imágenes puramente decorativas.
- La mención de Nequi/Bancolombia es informativa: no agregues datos de transferencia o acciones que aparenten procesar un pago sin requisitos y autorización.

## Validación y publicación

Desde la carpeta del frontend, ejecuta:

```bash
npm ci
npm test -- --watch=false
npm run build
```

Revisa la landing en móvil y escritorio y confirma todas las anclas/rutas antes de desplegar. El entorno incluido configura la API local (`http://localhost:8000/api`); **no publiques esa URL como backend de producción**. El dominio, hosting, API de producción y HTTPS deben configurarse y probarse por separado con el responsable del despliegue.
