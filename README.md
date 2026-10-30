# ZONA FITNESS — Plataforma Web Integral

Plataforma oficial de **ZONA FITNESS** (Barranquilla, Colombia).
Arquitectura completa: **Angular 22** (Frontend) + **Node.js / Express** (Backend API REST) + **PostgreSQL 18** (Motor de Base de Datos Relacional) + **pgAdmin 4** (Administración gráfica).

---

## 1. Identidad Visual y Ubicación Oficial

- **Paleta de Color Oficial:**
  - Color principal claro: `#cff0ea`
  - Color secundario: `#88c9c4`
  - Color de acento deportivo: `#3e9b94`
  - Contraste / Texto oscuro: `#173330` / `#274844`
  - Verde profundo: `#0b2725`
- **Sede Principal:** Calle 84 # 47-22, Barrio El Golf, Barranquilla, Atlántico.
- **Horarios:** Lunes a Viernes de 5:00 a. m. a 9:00 p. m. | Sábados de 6:00 a. m. a 4:00 p. m.

---

## 2. Puesta en Marcha Rápida (Local)

### Requisitos Previos
- **Node.js** v20 o superior y **npm**.
- **PostgreSQL 18** instalado e iniciado como servicio en Windows (`postgresql-x64-18` en el puerto `5432`).
- Base de datos creada: `zona_fitness_db`.

### Variables de Entorno
El backend utiliza las variables configuradas en `server/.env` (o `.env` en la raíz). Se incluye `server/.env.example` y `.env.example` como plantillas con valores seguros de desarrollo:
```env
PORT=8000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=zona_fitness_db
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=zona_fitness_secret_dev_key_2026_xyz
```

### Iniciar el Backend API (Puerto 8000)
```powershell
npm run server
```
- API Health Check: `http://localhost:8000/api/health`
- Catálogo de Planes: `http://localhost:8000/api/plans`
- Horarios Oficiales: `http://localhost:8000/api/opening-hours`

### Iniciar el Frontend Angular (Puerto 4200)
En una segunda terminal:
```powershell
npm start
```
Abrir en el navegador: `http://localhost:4200/`

### Prototipo Visual Local (Mockup Estático)
Abra [`mockup/index.html`](mockup/index.html) en cualquier navegador para visualizar la maqueta estática responsiva de Zona Fitness de forma directa y sin dependencias.

---

## 3. Comandos de Desarrollo y Herramientas (Angular 22)

Este frontend fue estructurado y generado con [Angular CLI](https://github.com/angular/angular-cli) versión 22.2.2.

- **Servidor de desarrollo:** `ng serve` o `npm start`
- **Generación de componentes:** `ng generate component nombre-componente`
- **Compilación de producción:** `ng build` o `npm run build` (genera el bundle optimizado en `dist/frontend`)
- **Ejecución de pruebas unitarias:** `ng test --watch=false` o `npm test -- --watch=false` (utiliza el runner Vitest)

---

## 4. Suite Automatizada de Pruebas y Calidad

El proyecto dispone de **142 pruebas automatizadas** que cubren la integridad de base de datos, API REST, validaciones legales y componentes frontend:

| Comando | Tipo de Prueba | Cobertura |
|---|---|---|
| `npm run db:test` | Base de Datos (14 pruebas) | PostgreSQL 18, 22 tablas, FKs, CHECKs, triggers, migraciones 001-003. |
| `npm run api:test` | Integración API (9 pruebas) | Health check, planes, horarios, registro, tickets, miembros, pagos. |
| `npm run phase3:test` | Ley 1581 y Edad (14 pruebas) | Cálculo exacto de edad (mínimo 14 años), tutores 14-17, consentimiento y anti-IDOR. |
| `npm run cart:test` | Carrito y Pedidos (12 pruebas) | Carrito persistido, cálculo en servidor, rechazo de precios no confirmados, IDOR. |
| `npm run rbac:test` | Control de Roles RBAC (10 pruebas) | Separación estricta de permisos entre admin y user, prevención de escalamiento y bloqueos 403. |
| `npm test -- --watch=false` | Angular Unit Tests (83 pruebas) | 16 suites de componentes, menú de perfil, servicios, guards, routing y accesibilidad. |
| `npm run build` | Compilación de Producción | Compilación estricta y optimización de bundles en `dist/frontend`. |

---

## 5. Estado de Características e Integraciones

Conforme a las directrices de veracidad técnica y transparencia:

1. **Autenticación con Correo y Contraseña:**
   - *Estado:* `IMPLEMENTADO Y VERIFICADO`.
   - Cifrado seguro con `bcrypt` (factor de costo 10), tokens `JWT` con expiración y almacenamiento protegido.
2. **Selector Visual Ocultar / Mostrar Contraseña:**
   - *Estado:* `IMPLEMENTADO Y VERIFICADO`.
   - Botón interactivo con icono de ojo, accesible por teclado (`aria-label`) y sin recargar ni alterar el valor ingresado.
3. **Validación de Edad y Autorización de Menores:**
   - *Estado:* `IMPLEMENTADO Y VERIFICADO`.
   - Cálculo estricto día/mes/año. Menores de 14 años restringidos (`403`). Adolescentes (14 a 17 años) solicitan acudiente y registran consentimiento en `consent_records`.
4. **Consentimiento de Datos Personales (Ley 1581 de 2012):**
   - *Estado:* `IMPLEMENTADO Y VERIFICADO`.
   - Página pública `/politica-datos`. Registro inmutable con snapshot de versión y cláusulas en base de datos.
5. **Navegación Dinámica y Responsive:**
   - *Estado:* `IMPLEMENTADO Y VERIFICADO`.
   - Avatar con iniciales del usuario, badge de rol, contador reactivo de carrito y menú móvil hamburguesa accesible.
6. **Carrito de Compras Persistido:**
   - *Estado:* `IMPLEMENTADO Y VERIFICADO`.
   - Persistido en PostgreSQL (`cart_items`), subtotales y totales calculados en servidor, detección de precios no confirmados.
7. **Checkout y Generación de Pedidos:**
   - *Estado:* `IMPLEMENTADO Y VERIFICADO`.
   - Genera pedido en estado `pending` en PostgreSQL (`orders` + `order_items`), vacía el carrito y emite código único (`ZF-ORD-...`). Rechaza pedidos si algún artículo tiene precio por confirmar.
8. **Botón "Continuar con Google":**
   - *Estado:* `VISUALMENTE IMPLEMENTADO, SIN FUNCIONALIDAD REAL`.
   - Muestra aviso informativo: *"Inicio de sesión con Google próximamente"*. Sin OAuth ni redirecciones fingidas.
9. **Enlace "¿Olvidaste tu contraseña?":**
   - *Estado:* `VISUALMENTE IMPLEMENTADO, SIN FUNCIONALIDAD REAL`.
   - Muestra aviso informativo: *"La recuperación de contraseña estará disponible próximamente"*.
10. **Pasarelas de Pago en Línea (Nequi, Bancolombia, Tarjeta):**
    - *Estado:* `VISUALMENTE IMPLEMENTADO, SIN FUNCIONALIDAD REAL`.
    - Muestra aviso informativo: *"Los pagos en línea mediante [Pasarela] estarán disponibles próximamente. Puedes generar tu pedido y pagar en recepción"*. Sin cobros ni almacenamiento de tarjetas de crédito.

---

## 6. Administración con pgAdmin 4 y Base de Datos

Consulte la guía técnica en [`docs/guia-administracion-pgadmin4.md`](docs/guia-administracion-pgadmin4.md) y [`docs/arquitectura-base-de-datos.md`](docs/arquitectura-base-de-datos.md) para instrucciones sobre conexión, consultas útiles, copias de seguridad y visualización gráfica del esquema relacional en PostgreSQL 18.

---

## 7. Documentación y Recursos de Zona Fitness

- [Propuesta técnica Zona Fitness V2](docs/Propuesta-tecnica-Zona-Fitness-V2.pdf)
- [Manual de marca Zona Fitness](docs/Manual_Marca_Zona_Fitness.pptx)
- [Progreso del proyecto al 26 de octubre de 2026](docs/progreso-zona-fitness-2026-10-26.md)
- [Progreso y alcance aprobado al 28 de octubre de 2026](docs/progreso-zona-fitness-2026-10-28.md)
- [Cotización revisada con desarrollo, CEO y publicación](docs/cotizacion-revisada-zona-fitness-2026-10-28.md)
- [Mockup y prototipo web en Figma](https://www.figma.com/design/tJSu1aJTykZSVqmVA2XUOj/Zona-fitness---Mockup-y-prototipo-web?node-id=6-2)
- [Wireframe V2 en Figma](https://www.figma.com/design/0cFykiLWJPm8vRnY7l71M1/Zona-fitness---Wireframe-V2?node-id=0-1&t=KgR0ShNQ3ewfCDe7-1)
- [Entregables, mapa del sitio y wireframe preliminar](docs/entregables-zona-fitness.md)
- [Guía breve para actualizar el contenido](docs/actualizar-contenido.md)
- [Guía técnica de características y código](docs/guia-tecnica-zona-fitness.md)
- [Diagrama del flujo actual](docs/diagrama-flujo.md)
- [Proyecto guiado: análisis, roles, DOM, wireframe y flujo](docs/Proyecto-Guiado-Zona-Fitness.md)
- [Proyecto guiado en HTML](docs/Proyecto-Guiado-Zona-Fitness.html)
- [Proyecto guiado en PDF](docs/Proyecto-Guiado-Zona-Fitness.pdf)
- [Caso de estudio y proyecto integral (Markdown)](docs/proyecto-zona-fitness-caso-estudio.md)
- [Caso de estudio y proyecto integral (HTML maquetado)](docs/proyecto-zona-fitness-caso-estudio.html)
- [Caso de estudio y proyecto integral (PDF estético imprimible)](docs/Proyecto-Zona-Fitness-Caso-Estudio.pdf)
