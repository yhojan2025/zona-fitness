# Diagrama del flujo actual de Zona Fitness

Este diagrama describe lo que la aplicación implementa hoy. El recorrido público es informativo: no recoge datos de inscripción, no valida la edad, no selecciona un plan y no procesa pagos. Los botones de los planes solo llevan a la sección informativa de inscripción.

```mermaid
flowchart TD
    A([Visita la web]) --> H[Inicio de Zona Fitness]

    H --> S[Desplazarse a servicios<br/>Cardio · Pesas · Sauna · Jacuzzi]
    H --> P[Desplazarse a planes<br/>Cobre · Bronce · Platino · Oro]
    H --> O[Desplazarse a horarios<br/>Lunes a sábado, dos franjas]
    H --> G[Desplazarse a galería]
    H --> R[Consultar catálogo informativo<br/>Batidos · Suplementos · Productos]
    H --> J[Sección de inscripción informativa]

    S --> H
    O --> H
    G --> H
    R --> H
    P -->|Consultar este plan: ancla genérica, sin plan seleccionado| J

    J --> I[Leer precios por confirmar,<br/>edad mínima 14 y nota para acudientes]
    I --> M[Leer medios informativos: Nequi y Bancolombia]
    M --> X[Confirmar condiciones y datos directamente con el gimnasio<br/>La web no ofrece canal de contacto]
    X --> Z([Continuar fuera del sitio])

    H --> E[Acceso del equipo: /login]
    E --> L{¿Ya tiene cuenta de soporte?}
    L -->|Sí| LO[Enviar formulario de inicio de sesión]
    L -->|No| RE[Ir a /register y enviar formulario de soporte]
    RE -->|Registro correcto| LO
    LO -->|Credenciales correctas| T["/tickets"]
    LO -. Credenciales incorrectas o API no disponible .-> LO
    T --> D{¿Rol administrador?}
    D -->|Sí| U["/users: gestionar usuarios"]
    D -->|No| T

    H -. Ruta desconocida .-> H
```

**Importante:** el registro y el inicio de sesión son del sistema de soporte existente, no una inscripción o cuenta de socio del gimnasio. El sitio muestra las condiciones de edad, pero no pregunta ni comprueba la edad. La confirmación de compra/inscripción y el contacto requieren información y procesos que aún no están configurados.
