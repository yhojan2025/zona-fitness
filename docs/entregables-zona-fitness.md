# Revisión de entregables — Zona Fitness

Este documento compara el estado del repositorio con la propuesta técnica. El sitemap y el wireframe siguientes son una **base para revisión**, no evidencia de aprobación escrita del cliente.

## Matriz de cumplimiento

| Entregable / criterio                                             | Estado                                                         | Evidencia y pendiente                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requisitos y estructura de navegación aprobados                   | Parcial                                                        | La navegación implementada y el sitemap preliminar están documentados aquí. Hace falta aprobación escrita del cliente y confirmar el recorrido comercial.                                                                                                                         |
| Propuesta visual de páginas principales aprobada                  | Parcial                                                        | La landing responsive es un prototipo visual implementado; no hay evidencia de presentación o aprobación formal. Falta validar identidad, copy y fotografías con el cliente.                                                                                                      |
| Sitio publicado bajo el dominio acordado                          | No cumple todavía                                              | El código está en un repositorio GitHub; eso no equivale a publicar el sitio. No hay dominio acordado, hosting ni despliegue web configurados.                                                                                                                                    |
| Formularios de registro e inicio de sesión según flujo aprobado   | Parcial                                                        | Existen `/login` y `/register` para las cuentas del sistema de soporte. No crean una membresía, no recogen un plan y no hay un flujo de inscripción de clientes aprobado/implementado.                                                                                            |
| Carga inicial de textos, planes, productos y horarios             | Parcial                                                        | La landing presenta los cuatro planes, servicios, productos y horarios solicitados. Los precios permanecen por confirmar y los textos/condiciones requieren validación del gimnasio.                                                                                              |
| Selección e incorporación de imágenes por el equipo               | Parcial                                                        | Hay imágenes provisionales remotas de Unsplash; no hay evidencia de selección, autorización de uso o aprobación por el equipo de Zona Fitness. Deben sustituirse o aprobarse antes de publicar.                                                                                   |
| Pruebas funcionales y guía para actualizar contenido              | Parcial                                                        | Hay pruebas unitarias Angular y compilación de producción. Esta guía indica cómo actualizar contenido estático. No hay pruebas end-to-end, panel de administración de contenido ni edición desde la web.                                                                          |
| Sesión de entrega y período de garantía                           | Pendiente externo                                              | Deben acordarse y registrarse con el cliente; el código no puede confirmar asistencia, duración o condiciones de garantía.                                                                                                                                                        |
| Secciones, planes, horarios, servicios, productos y regla de edad | Implementado como contenido informativo                        | Está en la landing. La edad mínima de 14 años se presenta como regla informada por el cliente; la web no valida edades ni determina requisitos legales.                                                                                                                           |
| Pagos, contacto y redes sociales                                  | Parcial                                                        | Se mencionan Nequi y Bancolombia de forma informativa, sin datos de cuenta ni simulación de pago. El sitio reserva una sección para redes oficiales, pero no publica perfiles hasta recibir sus enlaces confirmados. No hay teléfono, correo, dirección ni WhatsApp configurados. |
| Diseño responsive                                                 | Implementado en CSS; falta aceptación en dispositivos objetivo | Hay estilos adaptables y breakpoints para móvil/tablet/escritorio. La aceptación visual final debe comprobarse con el cliente en sus dispositivos/navegadores objetivo.                                                                                                           |
| Validación de formularios                                         | Parcial                                                        | Login/registro de soporte usan validación HTML básica. No hay formulario de inscripción comercial, validación de edad ni validación de selección de plan.                                                                                                                         |
| Enlaces funcionales y HTTPS                                       | Parcial / depende de despliegue                                | La navegación interna y las rutas Angular están implementadas. HTTPS depende del hosting y dominio, que no están configurados. La API actual apunta a `localhost`; no es configuración de producción.                                                                             |
| Revisión escrita del cliente                                      | Pendiente externo                                              | No se incluye en el repositorio evidencia de revisión o aceptación del cliente.                                                                                                                                                                                                   |

## Sitemap preliminar

```text
/
├── Sección Servicios (#servicios) · /servicios
├── Sección Planes (#planes) · /planes
├── Sección Horarios (#horarios) · /horarios
├── Sección El espacio / galería (#espacio) · /espacio
├── Catálogo informativo de productos (sección en la landing)
├── Inscripción, condiciones de edad y medios de pago (#inscripcion)
├── /login              Acceso del equipo de soporte
│   └── /register       Crear cuenta del sistema de soporte
├── /tickets            Requiere autenticación
└── /users              Requiere rol de administrador
```

Las rutas no reconocidas redirigen a `/`. La barra de navegación abre las páginas dedicadas. Los enlaces “Consultar condiciones” de planes vuelven a `/#inscripcion` y no llevan un identificador del plan ni completan una inscripción.

## Wireframe textual preliminar

1. **Barra superior:** identidad Zona Fitness, rutas dedicadas para Servicios/Planes/Horarios/El espacio y acceso separado del equipo.
2. **Hero:** mensaje promocional, acción “Explorar planes” y acceso a servicios.
3. **Servicios:** cardio, pesas, sauna y jacuzzi.
4. **Planes:** Cobre (15 días y 2 horas al día), Bronce (3 meses), Platino (6 meses) y Oro (1 año); precio por confirmar.
5. **Horarios:** lunes a sábado, 5:00–11:00 y 15:00–22:00.
6. **Galería:** fotografías provisionales del espacio y entrenamiento.
7. **Productos:** batidos de proteína, suplementos y productos para entrenar, sin e-commerce.
8. **Inscripción informativa:** cómo confirmar condiciones, nota de edad mínima de 14 años/acudiente y medios informativos Nequi/Bancolombia.
9. **Redes sociales:** apartado visible con aviso neutro hasta que el gimnasio confirme sus perfiles oficiales.
10. **Pie:** identidad, acceso del equipo y copyright de Análisis y soluciones web 12. Contacto oficial pendiente de confirmación.

## Decisiones necesarias antes de declarar todos los entregables completos

- Aprobar por escrito requisitos, sitemap, diseño, textos, fotografías e imágenes.
- Confirmar precios y condiciones de planes, datos oficiales de contacto/redes y datos/instrucciones autorizados para pago.
- Aclarar si el alta de clientes será un formulario web, si se procesa fuera de línea o si se requiere un backend nuevo; el soporte actual no es un sistema de socios.
- Confirmar dominio, hosting, backend de producción, certificado HTTPS y procedimiento de despliegue.
- Acordar pruebas de aceptación, sesión de entrega y condiciones/duración de garantía.
