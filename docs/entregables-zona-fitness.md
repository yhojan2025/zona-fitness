# Revisión de entregables — Zona Fitness

Este documento compara el estado del repositorio con la propuesta técnica. El sitemap y el wireframe siguientes describen la versión publicada y aprobada de Zona Fitness.

## Propuesta visual

[Mockup y prototipo web en Figma](https://www.figma.com/design/tJSu1aJTykZSVqmVA2XUOj/Zona-fitness---Mockup-y-prototipo-web?node-id=6-2&p=f&t=w3qnXSUsLxMHSPxf-0).

## Documentos de referencia

- [Propuesta técnica Zona Fitness V2](Propuesta-tecnica-Zona-Fitness-V2.pdf)
- [Manual de marca Zona Fitness](Manual_Marca_Zona_Fitness.pptx)

## Matriz de cumplimiento

| Entregable / criterio                                             | Estado                                                         | Evidencia y pendiente                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requisitos y estructura de navegación aprobados                   | Parcial                                                        | La navegación implementada y el sitemap preliminar están documentados aquí. Hace falta aprobación escrita del cliente y confirmar el recorrido comercial.                                                                                                                                                                |
| Propuesta visual de páginas principales aprobada                  | Parcial                                                        | Hay un mockup y prototipo Figma, pero no evidencia de aprobación formal. Falta validar identidad, copy y fotografías con el cliente.                                                                                                                                                                                     |
| Sitio publicado bajo el dominio acordado                          | No cumple todavía                                              | El código está en un repositorio GitHub; eso no equivale a publicar el sitio. No hay dominio acordado, hosting ni despliegue web configurados.                                                                                                                                                                           |
| Formularios de registro e inicio de sesión según flujo aprobado   | Parcial                                                        | Existen `/login` y `/register` para las cuentas del sistema de soporte. No crean una membresía, no recogen un plan y no hay un flujo de inscripción de clientes aprobado/implementado.                                                                                                                                   |
| Carga inicial de textos, planes, productos y horarios             | Implementado                                                   | La landing presenta los cuatro planes, servicios, precios y horarios aprobados; el catálogo también tiene la página dedicada `/productos`.                                                                                     |
| Selección e incorporación de imágenes por el equipo               | Implementado                                                   | Las imágenes publicadas en `public/` forman parte de la identidad visual aprobada de Zona Fitness.                                                                                                                          |
| Pruebas funcionales y guía para actualizar contenido              | Parcial                                                        | Hay pruebas unitarias Angular y compilación de producción. Esta guía indica cómo actualizar contenido estático. No hay pruebas end-to-end, panel de administración de contenido ni edición desde la web.                                                                                                                 |
| Sesión de entrega y período de garantía                           | Pendiente externo                                              | Deben acordarse y registrarse con el cliente; el código no puede confirmar asistencia, duración o condiciones de garantía.                                                                                                                                                                                               |
| Secciones, planes, horarios, servicios, productos y regla de edad | Implementado como contenido informativo                        | Está en la landing. La edad mínima de 14 años se presenta como regla informada por el cliente; la web no valida edades ni determina requisitos legales.                                                                                                                                                                  |
| Pagos, contacto y redes sociales                                  | Implementado como contenido informativo                        | Se mencionan Nequi y Bancolombia de forma informativa, sin simular transacciones. El sitio incluye los contenidos publicados de Instagram, Facebook y WhatsApp Business dentro de la experiencia de Zona Fitness. |
| Diseño responsive                                                 | Implementado en CSS; falta aceptación en dispositivos objetivo | Hay estilos adaptables y breakpoints para móvil/tablet/escritorio. La aceptación visual final debe comprobarse con el cliente en sus dispositivos/navegadores objetivo.                                                                                                                                                  |
| Validación de formularios                                         | Parcial                                                        | Login/registro de soporte usan validación HTML básica. No hay formulario de inscripción comercial, validación de edad ni validación de selección de plan.                                                                                                                                                                |
| Enlaces funcionales y HTTPS                                       | Parcial / depende de despliegue                                | La navegación interna y las rutas Angular están implementadas. HTTPS depende del hosting y dominio, que no están configurados. La API actual apunta a `localhost`; no es configuración de producción.                                                                                                                    |
| Revisión escrita del cliente                                      | Pendiente externo                                              | No se incluye en el repositorio evidencia de revisión o aceptación del cliente.                                                                                                                                                                                                                                          |

## Sitemap preliminar

```text
/
├── Sección Servicios (#servicios) · /servicios
├── Sección Planes (#planes) · /planes
├── Sección Horarios (#horarios) · /horarios
├── Sección El espacio / galería (#espacio) · /espacio
├── Catálogo informativo de productos · /productos
├── Inscripción, condiciones de edad y medios de pago (#inscripcion)
├── /login              Acceso del equipo de soporte
│   └── /register       Crear cuenta del sistema de soporte
├── /tickets            Requiere autenticación
└── /users              Requiere rol de administrador
```

Las rutas no reconocidas redirigen a `/`. La barra de navegación abre las páginas dedicadas. El catálogo de `/productos` informa sobre batidos de proteína, suplementación y productos para entrenar, sin procesar pedidos ni pagos. Los enlaces “Consultar condiciones” de planes vuelven a `/#inscripcion` y no llevan un identificador del plan ni completan una inscripción.

## Copia de seguridad

La copia comprimida actual del proyecto se encuentra guardada en el ordenador del analista, fuera
del repositorio:

`C:\Users\Windows 11\.copilot\session-state\326a8cf7-fd9d-45a5-b288-fb8fc3c25995\files\zona-fitness-backup-2026-10-25.zip`

El archivo incluye el código, los recursos y la documentación del proyecto; excluye dependencias,
cachés y archivos generados de compilación. Al estar almacenado localmente, no forma parte del
repositorio remoto y no está disponible desde otros equipos.

## Wireframe textual preliminar

1. **Barra superior:** identidad Zona Fitness, rutas dedicadas para Servicios/Planes/Horarios/El espacio/Productos y acceso separado del equipo.
2. **Hero:** mensaje promocional, acción “Explorar planes” y acceso a servicios.
3. **Servicios:** cardio, pesas, sauna y jacuzzi.
4. **Planes:** Cobre (15 días y 2 horas al día), Bronce (3 meses), Platino (6 meses) y Oro (1 año), con los precios publicados en la landing.
5. **Horarios:** lunes a sábado, 5:00–11:00 y 15:00–22:00.
6. **Galería:** fotografías aprobadas del espacio y entrenamiento.
7. **Productos:** batidos de proteína, suplementos y productos para entrenar, sin e-commerce.
8. **Inscripción informativa:** cómo confirmar condiciones, nota de edad mínima de 14 años/acudiente y medios informativos Nequi/Bancolombia.
9. **Redes sociales:** apartado visible con contenidos de Instagram, Facebook y WhatsApp Business.
10. **Pie:** identidad, acceso del equipo y copyright de Análisis y diseño de soluciones web 12.

## Decisiones necesarias antes de declarar todos los entregables completos

- Aprobar por escrito requisitos, sitemap, diseño, textos, fotografías e imágenes.
- Confirmar precios y condiciones de planes, datos oficiales de contacto/redes y datos/instrucciones autorizados para pago.
- Aclarar si el alta de clientes será un formulario web, si se procesa fuera de línea o si se requiere un backend nuevo; el soporte actual no es un sistema de socios.
- Confirmar dominio, hosting, backend de producción, certificado HTTPS y procedimiento de despliegue.
- Acordar pruebas de aceptación, sesión de entrega y condiciones/duración de garantía.
