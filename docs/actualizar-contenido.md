# Guía breve para actualizar contenido

El sitio usa contenido estático de Angular. **No existe un panel de administración de contenido**: los cambios requieren modificar el código, ejecutar las comprobaciones y volver a desplegar la web.

## Contenido de la landing

Desde `src/app/pages/home/home.ts`:

- `services`: títulos y descripciones de cardio, pesas, sauna y jacuzzi.
- `plans`: nombre, duración, descripción y tarjeta destacada.
- `gallery`: URL de cada imagen, texto alternativo y etiqueta.

Desde `src/app/pages/home/home.html`:

- Titulares, párrafos y avisos comerciales.
- Horarios, productos, medios de pago y política de edad.
- Orden de secciones y anclas usadas por la navegación.

Desde `src/app/app.html`:

- Enlaces visibles de navegación y acceso del equipo.

Desde `src/index.html`:

- Título, idioma, descripción y color de tema del sitio.

Desde `src/styles.css`, `src/app/app.css` y `src/app/pages/home/home.css`:

- Colores, tipografía, disposición y breakpoints responsive.

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
