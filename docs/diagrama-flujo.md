# Diagrama del flujo actual de Zona Fitness

El sitio público es promocional e informativo: presenta los servicios, planes, horarios, espacios,
productos y contenidos para redes sociales. No registra socios, no valida la edad, no selecciona
planes ni procesa pagos. Los precios y las condiciones publicadas corresponden a la información
aprobada por Zona Fitness.

```mermaid
flowchart TD
    A([Visita el sitio]) --> H["Inicio: hero con carrusel y navegación"]

    H --> S["/servicios: cardio, pesas, sauna y jacuzzi"]
    H --> P["/planes: Cobre, Bronce, Platino y Oro"]
    H --> O["/horarios: lunes a sábado, mañana y tarde"]
    H --> G["/espacio: galería del gimnasio"]
    H --> R["/#redes: contenidos de Zona Fitness"]
    H --> C["/productos: batidos, suplementos y artículos de entrenamiento"]
    H --> J["/#inscripcion: información para consultar cómo empezar"]

    S --> H
    O --> H
    G --> H
    C --> H

    P -->|Consultar este plan| J
    J --> I["Confirmar precio, disponibilidad y condiciones con el gimnasio"]
    I --> E["Revisar edad mínima de 14 años y condiciones para acudientes"]
    E --> M["Consultar medios informativos: Nequi y Bancolombia"]
    M --> X["Confirmar directamente con el gimnasio los datos de pago y la inscripción"]
    X --> Z([Continuar fuera del sitio])

    R --> L{¿Hay enlaces oficiales configurados?}
    L -->|Sí| OI["Mostrar enlaces oficiales confirmados"]
    L -->|No| N["Mostrar los contenidos publicados de Zona Fitness"]
    R -->|Abrir contenidos| IG["/redes/instagram.html: Instagram de Zona Fitness"]
    R -->|Abrir contenidos| FB["/redes/facebook.html: Facebook de Zona Fitness"]
    OI --> H
    N --> H
    IG --> H
    FB --> H

    H --> T["Acceso del equipo: /login"]
    T --> Q{¿Cuenta de soporte?}
    Q -->|Sí| LO["Enviar formulario de inicio de sesión"]
    Q -->|No| RE["/register: registro para el sistema de soporte"]
    RE -->|Registro correcto| LO
    LO -->|Credenciales correctas| TK["/tickets: acceso protegido"]
    LO -. Credenciales incorrectas o servicio no disponible .-> LO
    TK --> D{¿Rol administrador?}
    D -->|Sí| U["/users: gestión de usuarios"]
    D -->|No| TK

    H -. Ruta desconocida .-> H
```

**Importante:** el acceso y registro del equipo pertenecen al sistema de soporte, no son cuentas ni
inscripciones de socios. La web informa sobre edad y medios de pago: no valida la edad, no inicia
una compra ni confirma una inscripción.
