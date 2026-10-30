# Guía técnica de Zona Fitness

Documento de referencia para ubicar las características de la aplicación promocional,
sus componentes, estilos, datos, rutas, pruebas y documentación relacionada.

> **Alcance de las referencias:** los rangos de línea corresponden a la revisión actual
> del repositorio. Si se reorganiza un archivo, buscar primero el selector, símbolo o
> texto indicado en la columna de referencia.

## Índice

1. [Resumen de la solución](#1-resumen-de-la-solución)
2. [Arquitectura y arranque](#2-arquitectura-y-arranque)
3. [Rutas y navegación](#3-rutas-y-navegación)
4. [Landing page](#4-landing-page)
   1. [Hero y carrusel](#41-hero-y-carrusel)
   2. [Servicios](#42-servicios)
   3. [Planes](#43-planes)
   4. [Horarios](#44-horarios)
   5. [Galería y espacio](#45-galería-y-espacio)
   6. [Productos](#46-productos)
   7. [Inscripción informativa](#47-inscripción-informativa)
   8. [Redes sociales y WhatsApp](#48-redes-sociales-y-whatsapp)
5. [Páginas públicas de sección](#5-páginas-públicas-de-sección)
6. [Branding, layout y responsive](#6-branding-layout-y-responsive)
7. [Footer público](#7-footer-público)
8. [Accesibilidad y seguridad de interfaz](#8-accesibilidad-y-seguridad-de-interfaz)
9. [Soporte interno y autenticación](#9-soporte-interno-y-autenticación)
10. [Pruebas, build y validación](#10-pruebas-build-y-validación)
11. [Documentación y recursos](#11-documentación-y-recursos)
12. [Límites funcionales](#12-límites-funcionales)
13. [Guía rápida de mantenimiento](#13-guía-rápida-de-mantenimiento)

## 1. Resumen de la solución

Zona Fitness es una web promocional responsive para presentar un gimnasio y sus
servicios: cardio, pesas, sauna y jacuzzi. Incluye planes informativos Cobre, Bronce,
Platino y Oro; horarios; galería; catálogo informativo de productos; inscripción
informativa; experiencias de Instagram, Facebook y WhatsApp Business; y un footer
reutilizable.

La aplicación no simula pagos ni registra socios comerciales. Las credenciales, tickets
y administración de usuarios pertenecen al módulo interno de soporte, separado de la
experiencia promocional.

## 2. Arquitectura y arranque

| Tema                                           | Ubicación                                      |
| ---------------------------------------------- | ---------------------------------------------- |
| Componente raíz y punto de montaje del router  | `src/app/app.ts:1-14`, `src/app/app.html:1-31` |
| Configuración global de Angular                | `src/app/app.config.ts`                        |
| Rutas lazy-loaded                              | `src/app/app.routes.ts:1-55`                   |
| Estilos del header, navegación y layout global | `src/app/app.css:1-145`                        |
| Configuración del proyecto y scripts           | `package.json`                                 |
| Recursos estáticos públicos                    | `public/`                                      |
| Salida del build                               | `dist/frontend/browser/`                       |

Comandos principales:

```bash
npm install
npm run build
npm test -- --watch=false
```

El servidor de desarrollo se inicia con `ng serve` y sirve la aplicación en
`http://localhost:4200/`.

## 3. Rutas y navegación

Las rutas públicas usan `SectionPage` con contenido seleccionado mediante `data.section`.
Las rutas internas aplican guards:

| Ruta           | Tipo                       | Implementación                                             |
| -------------- | -------------------------- | ---------------------------------------------------------- |
| `/`            | Landing promocional        | `app.routes.ts:6-10`, `pages/home/home.*`                  |
| `/servicios`   | Servicios                  | `app.routes.ts:11-15`, `pages/section-page/section-page.*` |
| `/planes`      | Planes                     | `app.routes.ts:16-20`, `pages/section-page/section-page.*` |
| `/horarios`    | Horarios                   | `app.routes.ts:21-25`, `pages/section-page/section-page.*` |
| `/espacio`     | Galería y espacio          | `app.routes.ts:26-30`, `pages/section-page/section-page.*` |
| `/productos`   | Catálogo informativo       | `app.routes.ts:31-35`, `pages/section-page/section-page.*` |
| `/login`       | Acceso del equipo          | `app.routes.ts:36`                                         |
| `/register`    | Registro interno           | `app.routes.ts:37-40`                                      |
| `/tickets`     | Soporte autenticado        | `app.routes.ts:41-45`, `authGuard`                         |
| `/users`       | Administración de usuarios | `app.routes.ts:46-49`, `roleGuard('admin')`                |
| Cualquier otra | Redirección a la landing   | `app.routes.ts:50`                                         |

La navegación visual principal y el estado de sesión están en `src/app/app.html:1-31`.

## 4. Landing page

La estructura completa de la landing está en `src/app/pages/home/home.html:1-481`.
Los datos que alimentan carrusel, servicios, planes y galería están en
`src/app/pages/home/home.ts:14-121`; sus estilos están en
`src/app/pages/home/home.css`.

### 4.1 Hero y carrusel

**Interfaz y contenido**

- Título principal, descripción, CTA “Explorar planes” y enlace al bloque de servicios:
  `home.html:2-20`.
- Región accesible con `role="region"`, `aria-roledescription="carrusel"` y etiqueta:
  `home.html:21-106`.
- Imágenes, textos alternativos y etiquetas de cada slide:
  `home.ts:15-40`.
- Índice activo, slide calculado, estado de pausa y segundos restantes:
  `home.ts:41-44`.

**Rotación y controles**

- Temporizador de un segundo, cuenta regresiva de cinco segundos y cambio automático:
  `home.ts:46-60`.
- Cambio manual y reinicio del contador:
  `home.ts:133-142`.
- Botones anterior, siguiente, puntos de selección y pausar/reanudar:
  `home.html:60-99`.
- Transición de entrada de la imagen:
  `home.css:129-140`.
- Barra segmentada de progreso: cinco segmentos, activación por segundo y alternancia
  entre `#CFF0EA`, `#88C9C4` y `#3E9B94`:
  `home.html:40-58`, `home.css:247-296`.
- La reducción de movimiento desactiva la animación visual de la imagen, pero no bloquea
  la cuenta regresiva ni la rotación:
  `home.css:1175-1182`, `home.ts:50-60`.
- En móviles el contenido se prioriza sobre la fotografía, las acciones se apilan, los
  controles se compactan, el progreso y el caption ocupan franjas separadas y el sello
  decorativo se oculta para evitar solapamientos:
  `home.css:987-1068`.

### 4.2 Servicios

- Texto de introducción y ancla de sección: `home.html:106-113`.
- Datos de Cardio, Zona de pesas, Sauna y Jacuzzi: `home.ts:61-76`.
- Tarjetas, iconos SVG, numeración y contenido: `home.html:112-144`.
- Estilo de tarjetas independientes, fondo verde claro, bordes redondeados e iconos
  circulares: `home.css:370-420`.
- Vista dedicada `/servicios`: `section-page.ts:20-45`,
  `section-page.html:15-41`, `section-page.css:46-105`.

### 4.3 Planes

- Bloque de planes de la landing: `home.html:146-210`.
- Datos de Cobre, Bronce, Platino y Oro, duración y descripción:
  `home.ts:78-105`.
- Iconos categóricos SVG y clases por metal:
  `home.html:164-197`, `home.css:484-522`.
- Etiqueta sutil “PARA SEGUIR AVANZANDO”, posicionada sin alterar la alineación:
  `home.html:160-163`, `home.css:462-475`.
- Precios publicados para Cobre, Bronce, Platino y Oro:
  `home.html:200`.
- Vista dedicada `/planes`, incluyendo iconos y condiciones:
  `section-page.html:42-89`, `section-page.css:119-189`,
  `section-page.ts:46-83`.

### 4.4 Horarios

- Bloque de horarios de la landing: `home.html:213-237`.
- Horario de lunes a sábado, 5:00–11:00 y 15:00–22:00:
  `home.html:229-236`.
- Estilo de la tarjeta “HORARIO DE ATENCIÓN”:
  `home.css:565-614`.
- Contenido de la página dedicada `/horarios`:
  `section-page.ts:84-107`, `section-page.html:91-101`.
- Bloque “¿Dónde encontrarnos?” con la dirección `Cra. 7 # 7-7, Aguadas, Caldas`,
  enlace directo a Google Maps, mapa embebido y fotografía del local:
  `section-page.ts:107-123`, `section-page.html:101-135`,
  `section-page.css:220-314`.

### 4.5 Galería y espacio

- Galería de la landing: `home.html:239-263`.
- Descripción destacada en negrilla:
  `home.html:246-251`, `home.css:657-659`.
- Imágenes y textos alternativos de la landing:
  `home.ts:107-121`.
- Altura uniforme y `object-fit: cover` para las cuatro imágenes:
  `home.css:619-642`.
- Página `/espacio`, con las zonas de cardio, pesas, sauna y jacuzzi, subtítulos en
  negrilla y figuras uniformes:
  `section-page.html:117-128`, `section-page.css:266-313`.
- Bloque “Acerca del gym”, con imagen aprobada del local y logotipo superpuesto:
  `section-page.html:129-153`, `section-page.css:313-407`.
- Datos y textos aprobados:
  `section-page.ts:108-141`.

### 4.6 Productos

- Catálogo resumido de batidos, suplementación y productos para entrenar:
  `home.html:264-303`.
- Página dedicada con tres tarjetas informativas:
  `section-page.ts:142-176`, `section-page.html:102-116`.
- No hay checkout ni procesamiento de pagos; el aviso está en
  `section-page.ts:174-176`.

### 4.7 Inscripción informativa

- Bloque de llamada a la acción, medios de pago informativos y edad mínima:
  `home.html:305-334`.
- Nequi y Bancolombia se presentan como instrucciones informativas.
- La edad mínima indicada es 14 años. Para menores se señala que podría requerirse
  autorización o acompañamiento de acudiente según las condiciones que confirme el
  gimnasio; no se presenta una conclusión legal.

### 4.8 Redes sociales y WhatsApp

La sección de redes está en `home.html:336-481` y sus estilos en
`home.css:819-964`.

| Canal             | Entrada                       | Recursos                                                              |
| ----------------- | ----------------------------- | --------------------------------------------------------------------- |
| Instagram         | `public/redes/instagram.html` | `public/redes/assets/ig_*.jpg`                                        |
| Facebook          | `public/redes/facebook.html`  | `public/redes/assets/fb_*.jpg`                                        |
| WhatsApp Business | `public/redes/whatsapp.html`  | `public/redes/whatsapp.css`, `public/redes/assets/whatsapp-logo*.png` |

Las tres se enlazan desde la landing mediante rutas locales:
`home.html:397-438` y `home.html:477-481`. El enlace de WhatsApp se encuentra en
`home.html:442-467`.

La experiencia de WhatsApp contiene una conversación simulada, respuestas rápidas y
compositor de mensajes local; no conecta con WhatsApp real. La copia comercial usa los
precios y contenidos aprobados: `public/redes/whatsapp.html:1-120`.

## 5. Páginas públicas de sección

`src/app/pages/section-page/section-page.ts:1-205` concentra el contenido de las cinco
secciones públicas en `CONTENT`. `section-page.html:1-147` decide qué presentación usar:

- Servicios: tarjetas con iconos y numeración.
- Planes: icono de categoría, duración, descripción, precio publicado y CTA.
- Horarios: tarjetas de mañana y tarde.
- Productos: imagen, descripción y enlace de consulta.
- Espacio: galería de cuatro imágenes temáticas, subtítulos, texto alternativo y bloque
  “Acerca del gym” con imagen aprobada y logo superpuesto.

El footer público se incluye al final de la vista en `section-page.html:146-147`.
Los breadcrumbs y el CTA de regreso están en `section-page.html:3-14` y `135-145`.

## 6. Branding, layout y responsive

| Característica                                   | Referencia                                            |
| ------------------------------------------------ | ----------------------------------------------------- |
| Navbar verde teal sincronizada con los botones   | `src/app/app.css:9-105`                               |
| Marca superior, icono y wordmark                 | `src/app/app.html:2-6`                                |
| Paleta principal `#CFF0EA`, `#88C9C4`, `#3E9B94` | `home.css:38-39`, `home.css:285-292`, `app.css:38-39` |
| Botones redondeados y estilos globales           | `src/styles.css` y `home.css`                         |
| Responsive de la landing                         | `home.css:965-1174`                                   |
| Responsive de páginas de sección                 | `section-page.css:533-610`                            |
| Responsive del footer                            | `site-footer.css:99-128`                              |
| Logo completo del footer                         | `public/zona-fitness-logo.png`                        |
| Icono de navegación superior                     | `public/zona-fitness-icon.png`                        |

Las imágenes de galerías usan `object-fit: cover`; los tamaños se definen por breakpoint
para conservar una composición uniforme en escritorio, tablet y móvil.

## 7. Footer público

El footer reutilizable se implementa en:

- Componente: `src/app/shared/site-footer/site-footer.ts:1-12`.
- Markup, logo, navegación, acceso del equipo y copyright:
  `src/app/shared/site-footer/site-footer.html:1-29`.
- Estilos y responsive: `src/app/shared/site-footer/site-footer.css:1-128`.

Se muestra en la landing y en las páginas públicas de sección. No se añade a login,
register, tickets ni users, para conservar separada la interfaz interna de HelpDesk.
El copyright vigente se conserva exactamente:

`© 2026 Análisis y diseño de soluciones web 12. Todos los derechos reservados.`

## 8. Accesibilidad y seguridad de interfaz

- Enlace para saltar al contenido: `app.html:1`.
- Navegación con etiquetas ARIA: `app.html:7`,
  `site-footer.html:10`, `home.html:21-24`.
- Imágenes con `alt`; las imágenes decorativas usan `alt=""` o `aria-hidden`:
  `app.html:4`, `home.html:30-34`, `section-page.html:119-123`.
- Controles del carrusel con `aria-label`, `aria-pressed` y región con
  `aria-live`: `home.html:37-99`.
- Estados de foco visibles y navegación de teclado:
  `app.css:76-105`, `site-footer.css:33-40`.
- `target="_blank"` de enlaces oficiales potenciales usa
  `rel="noopener noreferrer"`: `home.html:343-346`.
- El cliente no expone pagos reales ni datos bancarios.

La autenticación y autorización del módulo interno se protegen mediante guards en
`app.routes.ts:41-49`; los servicios asociados están en `src/app/core/`.

## 9. Soporte interno y autenticación

Estas pantallas no forman parte del footer promocional:

| Funcionalidad   | Archivos principales                                          |
| --------------- | ------------------------------------------------------------- |
| Login           | `pages/login/login.ts`, `login.html`, `login.css`             |
| Registro        | `pages/register/register.ts`, `register.html`, `register.css` |
| Tickets         | `pages/tickets/tickets.ts`, `tickets.html`, `tickets.css`     |
| Usuarios/admin  | `pages/users/users.ts`, `users.html`, `users.css`             |
| Cliente API     | `core/api.service.ts`                                         |
| Sesión          | `core/auth.service.ts`                                        |
| Guard de sesión | `core/auth-guard.ts`                                          |
| Guard de rol    | `core/role-guard.ts`                                          |
| Interceptor     | `core/auth-interceptor.ts`                                    |
| Modelos         | `core/models.ts`                                              |

La web promocional no debe describirse como un sistema de inscripción de socios:
las pantallas internas corresponden al soporte existente.

## 10. Pruebas, build y validación

Pruebas relevantes:

- Landing, planes, servicios, footer, redes y carrusel:
  `pages/home/home.spec.ts`.
- Rutas públicas, footer, servicios, planes, productos y espacio:
  `pages/section-page/section-page.spec.ts`.
- Autenticación, guards, interceptor, login, register, tickets y users:
  los archivos `*.spec.ts` correspondientes en `src/app/core/` y `src/app/pages/`.

Comandos de validación:

```bash
npm test -- --watch=false
npm run build
npx prettier --check <archivos-modificados>
git diff --check
```

En las validaciones recientes del proyecto, la suite Angular se ejecutó con 78 pruebas
exitosas y el build terminó correctamente en `dist/frontend/browser/`.

## 11. Documentación y recursos

| Documento o recurso                                   | Propósito                                          |
| ----------------------------------------------------- | -------------------------------------------------- |
| `docs/Propuesta-tecnica-Zona-Fitness-V2.pdf`          | Fuente de requisitos de producto                   |
| `docs/Manual_Marca_Zona_Fitness.pptx`                 | Manual visual                                      |
| `docs/progreso-zona-fitness-2026-10-26.md`            | Estado y pendientes al corte documentado           |
| `docs/progreso-zona-fitness-2026-10-28.md`            | Registro histórico del alcance y cambios           |
| `docs/cotizacion-revisada-zona-fitness-2026-10-28.md` | Estimación de equipo, CEO, publicación y operación |
| `docs/entregables-zona-fitness.md`                    | Entregables, sitemap y wireframe                   |
| Figma Mockup y Wireframe V2                           | Referencia visual y de estructura                  |
| `docs/actualizar-contenido.md`                        | Guía operativa de edición                          |
| `docs/diagrama-flujo.md`                              | Flujo de navegación                                |
| `public/redes/README.txt`                             | Guía de los contenidos sociales                    |
| `public/redes/`                                       | Contenidos HTML y recursos de redes                |

## 12. Límites funcionales

La web promocional no registra socios, no valida edades, no procesa pagos en línea ni
gestiona reservas. El módulo interno de soporte mantiene sus propias cuentas, tickets,
roles y estados de pedido.

## 13. Guía rápida de mantenimiento

1. **Cambiar textos o duración de planes:** editar `home.ts:78-105` y
   `section-page.ts:46-83`; conservar ambas fuentes sincronizadas.
2. **Cambiar servicios:** editar `home.ts:61-76` y `section-page.ts:20-45`.
3. **Cambiar imágenes de la galería:** editar las listas de `home.ts:107-121` y
   `section-page.ts:108-141`, verificando `alt`.
4. **Cambiar el carrusel:** revisar `home.ts:15-60`, `home.ts:133-145`,
   `home.html:21-99` y `home.css:103-140`, `home.css:247-296`.
5. **Actualizar contenidos sociales:** editar los HTML y CSS en `public/redes/` y sus
   recursos; conservar la identidad visual y los textos aprobados.
6. **Cambiar footer:** editar `shared/site-footer/site-footer.html` y
   `site-footer.css`; no añadirlo a pantallas internas sin una decisión explícita.
7. **Actualizar documentación:** enlazar cualquier documento nuevo desde el bloque
   “Documentación de Zona Fitness” de `README.md`.
8. **Validar antes de publicar:** ejecutar tests, build, Prettier y `git diff --check`.
