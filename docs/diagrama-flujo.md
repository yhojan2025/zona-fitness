# Diagrama de flujo de Zona Fitness

El recorrido público es informativo: el sitio no gestiona inscripciones ni procesa pagos. Los precios, datos de contacto y datos de transferencia deben confirmarse directamente con el gimnasio.

```mermaid
flowchart TD
    A([Inicio]) --> B[Visitar la web]
    B --> C[Inicio: Zona Fitness]

    C --> D{¿Qué quiere consultar?}
    D -->|Servicios| S[Cardio · Pesas · Sauna · Jacuzzi]
    D -->|Planes| P[Planes: Cobre 15 días, 2 h al día<br/>Bronce 3 meses · Platino 6 meses · Oro 1 año]
    D -->|Horarios| H[Lunes a sábado<br/>5:00–11:00 y 15:00–22:00]
    D -->|El espacio| G[Ver galería]
    D -->|Productos| R[Batidos · Suplementos · Productos]
    D -->|Empezar| I[Consultar condiciones de inscripción]

    S --> C
    P --> Q[Consultar precios y disponibilidad con el gimnasio]
    Q --> I
    H --> C
    G --> C
    R --> X[Consultar referencias y disponibilidad]
    X --> C

    I --> E{¿Tiene al menos 14 años?}
    E -->|Sí| M[Confirmar condiciones e inscripción directamente con el gimnasio]
    E -->|No| N[Consultar condiciones con el gimnasio y acudiente]
    M --> Y([Fin: fuera del sitio])
    N --> Y

    I --> T[Medios informativos: Nequi o Bancolombia]
    T --> U[Confirmar datos oficiales antes de transferir]
    U --> Y
    T -. El sitio no procesa pagos .-> Y

    C --> F[Acceso del equipo]
    F --> L{¿Tiene cuenta?}
    L -->|Sí| LO[Iniciar sesión]
    L -->|No| RE[Crear cuenta de soporte]
    RE -->|Registro correcto| LO
    LO -->|Credenciales correctas| TK[Tickets de soporte]
    TK --> AD{¿Es administrador?}
    AD -->|Sí| US[Gestión de usuarios]
    AD -->|No| TU[Funciones según el rol]
    US --> Y
    TU --> Y
    LO -. Login incorrecto o API no disponible .-> LO

    C -. Ruta desconocida .-> B
```

> El registro y el inicio de sesión existentes son para el sistema interno de soporte; no crean una membresía del gimnasio.
