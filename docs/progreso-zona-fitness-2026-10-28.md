# Progreso de Zona Fitness — 28 de octubre de 2026

Este corte documenta las funcionalidades implementadas y aprobadas para continuar con
la solución promocional de Zona Fitness. La aprobación indicada aquí corresponde al
alcance visual y funcional revisado en la conversación; no reemplaza la confirmación de
datos comerciales, legales, de infraestructura o de publicación.

## Alcance aprobado e implementado

- **Landing promocional responsive:** hero con carrusel, rotación automática cada cinco
  segundos, controles manuales, pausa/reanudación, contador visible y barra segmentada
  con colores de marca.
- **Hero móvil:** composición priorizada para pantallas pequeñas, acciones apiladas,
  texto y controles compactos, progreso y caption separados, y ocultamiento del sello
  decorativo para evitar solapamientos.
- **Servicios:** Cardio, Zona de pesas, Sauna y Jacuzzi.
- **Planes:** Cobre (15 días, 2 horas de ejercicio diario), Bronce (3 meses), Platino
  (6 meses) y Oro (1 año), con precios y condiciones comerciales como placeholders.
- **Página `/espacio`:** cuatro zonas temáticas con imágenes referenciales coherentes:
  Espacio de cardio, Zona de pesas, Sauna y Jacuzzi.
- **Sección “Acerca del gym”:** imagen referencial del local, logotipo de Zona Fitness
  superpuesto, texto promocional neutral y aviso para reemplazar la fotografía por una
  imagen oficial cuando exista.
- **Horarios:** lunes a sábado, 5:00–11:00 y 15:00–22:00.
- **Productos:** catálogo informativo de batidos de proteína, suplementación y artículos
  para entrenar; no hay carrito ni checkout.
- **Redes:** maquetas locales de Instagram, Facebook y WhatsApp Business, identificadas
  como prototipos y separadas de perfiles oficiales.
- **Marca y navegación:** logo, icono, paleta `#CFF0EA`, `#88C9C4`, `#3E9B94`,
  tipografías, botones redondeados, footer público y rutas de sección.
- **Documentación de diseño:** el mockup y el Wireframe V2 de Figma están enlazados en
  el README y se consideran referencias aprobadas para este alcance visual.

## Ubicación de los cambios

| Área                        | Archivos principales                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Hero y carrusel             | `src/app/pages/home/home.ts`, `home.html`, `home.css`                                 |
| Ajustes del hero móvil      | `src/app/pages/home/home.css`, bloque `@media (max-width: 620px)`                     |
| Espacios y “Acerca del gym” | `src/app/pages/section-page/section-page.ts`, `section-page.html`, `section-page.css` |
| Pruebas                     | `src/app/pages/home/home.spec.ts`, `src/app/pages/section-page/section-page.spec.ts`  |
| Identidad y layout          | `src/app/app.html`, `src/app/app.css`, `src/app/shared/site-footer/`                  |
| Imágenes y logos            | `public/zona-fitness-logo.png`, `public/zona-fitness-icon.png`                        |
| Maquetas sociales           | `public/redes/`                                                                       |

## Placeholders estándar para información aún no definida

Mientras el gimnasio no entregue la información final, la documentación y el contenido
deben usar estos valores explícitos en lugar de inventar datos:

| Dato                         | Placeholder estándar                        |
| ---------------------------- | ------------------------------------------- |
| Precio de plan               | `[PENDIENTE_CONFIRMAR_PRECIO]`              |
| Teléfono                     | `[PENDIENTE_CONFIRMAR_TELEFONO]`            |
| Correo                       | `[PENDIENTE_CONFIRMAR_CORREO]`              |
| Dirección                    | `[PENDIENTE_CONFIRMAR_DIRECCION]`           |
| URL o handle social          | `[PENDIENTE_CONFIRMAR_URL_SOCIAL]`          |
| Datos de Nequi/Bancolombia   | `[PENDIENTE_CONFIRMAR_DATOS_PAGO]`          |
| Fotografía oficial del local | `[PENDIENTE_REEMPLAZAR_IMAGEN_REFERENCIAL]` |
| Dominio                      | `[PENDIENTE_DEFINIR_DOMINIO]`               |
| Hosting/proveedor            | `[PENDIENTE_DEFINIR_HOSTING]`               |
| API de producción            | `[PENDIENTE_DEFINIR_API_PRODUCCION]`        |
| HTTPS/certificado            | `[PENDIENTE_CONFIGURAR_HTTPS]`              |

Estos placeholders describen decisiones pendientes; no deben presentarse como valores
publicables ni convertirse automáticamente en enlaces o datos operativos.

## Límites que permanecen vigentes

- La web no procesa pagos, reservas ni compras.
- La inscripción mostrada es informativa y no crea cuentas de socios.
- La edad mínima de 14 años se comunica como regla del gimnasio; para menores se indica
  que podría requerirse acudiente según las condiciones que confirme el gimnasio.
- Las imágenes externas son referenciales y deben reemplazarse o aprobarse antes de una
  publicación comercial definitiva.
- Las maquetas de redes no son perfiles oficiales ni canales de atención conectados.
- Login, registro, tickets y usuarios pertenecen al soporte interno existente.

## Validación del corte

La validación asociada a este alcance debe ejecutarse desde el frontend:

```bash
npm test -- --watch=false
npm run build
npx prettier --check <archivos-modificados>
git diff --check
```

El último corte validado registró 78 pruebas exitosas, build de producción correcto,
Prettier correcto y árbol Git limpio después de publicar los cambios.
