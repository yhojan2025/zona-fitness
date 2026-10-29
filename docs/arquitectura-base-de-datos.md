# Arquitectura del Esquema de Base de Datos — ZONA FITNESS

Este documento especifica el diseño relacional implementado en **PostgreSQL 18** para el sistema de gestión del gimnasio **ZONA FITNESS**.

---

## 1. Diagrama Entidad-Relación (ER)

```mermaid
erDiagram
    ROLES ||--o{ USERS : "posee rol"
    USERS ||--o| PROFILES : "tiene perfil"
    USERS ||--o| MEMBERS : "cuenta de socio"
    USERS ||--o| TRAINERS : "cuenta de entrenador"
    USERS ||--o{ TICKETS : "crea ticket"
    USERS ||--o{ AUDIT_LOGS : "registrado por"

    MEMBERS ||--o{ MEMBERSHIPS : "contrata"
    PLANS ||--o{ MEMBERSHIPS : "define"
    MEMBERS ||--o{ PAYMENTS : "realiza"
    MEMBERSHIPS ||--o| PAYMENTS : "asociado a"
    MEMBERS ||--o{ ATTENDANCE : "registra acceso"

    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : "registra movimiento"
    USERS ||--o{ INVENTORY_MOVEMENTS : "responsable"

    OPENING_HOURS {
        int id PK
        int day_of_week
        string shift_name
        time open_time
        time close_time
        boolean is_active
    }

    MEMBERS {
        int id PK
        int user_id FK
        string first_name
        string last_name
        string document_type
        string document_number UK
        string email UK
        string phone
        date birth_date
        text address
        string emergency_contact
        string emergency_phone
        text medical_conditions
        boolean is_active
    }

    PLANS {
        int id PK
        string name UK
        string slug UK
        int duration_days
        int daily_hours_limit
        text description
        boolean price_unconfirmed
        numeric price
        boolean is_active
    }

    MEMBERSHIPS {
        int id PK
        int member_id FK
        int plan_id FK
        date start_date
        date end_date
        string status
        text notes
    }

    PAYMENTS {
        int id PK
        int member_id FK
        int membership_id FK
        numeric amount
        timestamp payment_date
        string payment_method
        string reference_number
        string status
        int verified_by FK
        timestamp verified_at
        text notes
    }

    ATTENDANCE {
        int id PK
        int member_id FK
        timestamp check_in
        timestamp check_out
        string status
        text notes
    }

    PRODUCTS {
        int id PK
        string name
        string sku UK
        string category
        text description
        numeric price
        boolean price_unconfirmed
        int stock_quantity
        int min_stock_alert
        boolean is_active
    }

    INVENTORY_MOVEMENTS {
        int id PK
        int product_id FK
        string movement_type
        int quantity
        string reason
        int created_by FK
        timestamp created_at
    }
```

---

## 2. Descripción de Entidades y Restricciones

### 2.1 Usuarios, Roles y Seguridad
- **`roles`**: Catálogo que define los roles de usuario: `admin`, `agent`, `trainer`, `member`, `user`.
- **`users`**: Cuentas de acceso al sistema. La columna `password_hash` almacena el hash criptográfico generado con `bcrypt` (factor de costo 10). **Nunca se almacenan contraseñas en texto claro**.
- **`profiles`**: Datos complementarios de contacto de emergencia, notas médicas y avatar.

### 2.2 Gestión Comercial y Clientes
- **`members`**: Registro maestro de socios. Exige unicidad en `document_number` y `email`. Clasifica el documento según valores permitidos (`CC`, `TI`, `CE`, `PASAPORTE`).
- **`plans`**: Catálogo de planes comerciales (`Cobre`, `Bronce`, `Platino`, `Oro`). Incorpora la bandera `price_unconfirmed` para mantener la integridad de los datos hasta que el gimnasio confirme formalmente las tarifas oficiales.
- **`memberships`**: Contratos de membresía. Relaciona un socio con un plan, calculando la fecha de vencimiento (`end_date`) y asegurando mediante `CHECK (end_date >= start_date)` la coherencia temporal.
- **`payments`**: Registro de pagos. Admite medios autorizados (`nequi`, `bancolombia`, `efectivo`, `tarjeta`, `transferencia`). Por seguridad y cumplimiento PCI-DSS, **no se almacenan números completos de tarjeta ni códigos CVV**. Cada pago requiere verificación administrativa explícita antes de considerarse confirmado.

### 2.3 Operaciones Diarias
- **`attendance`**: Control de acceso a las instalaciones. Valida automáticamente si el socio dispone de una membresía activa antes de otorgar el ingreso (`status: 'granted'` o `'denied'`).
- **`opening_hours`**: Horarios oficiales de atención organizados por día de la semana (1 = Lunes a 7 = Domingo) y franja horaria (mañana de 05:00 a 11:00, tarde de 15:00 a 22:00).
- **`trainers`**: Catálogo de entrenadores con especialidades y perfiles de presentación.
- **`products`**: Catálogo informativo y de venta de suplementos, batidos y artículos deportivos. Mantiene alertas de stock mínimo (`min_stock_alert`).
- **`inventory_movements`**: Bitácora de entradas, salidas y ajustes de stock con actualización en transacción atómica.

### 2.4 Soporte y Auditoría
- **`tickets`**: Sistema de soporte para incidentes, integrado con las vistas existentes de Angular (`/tickets`).
- **`audit_logs`**: Registro histórico inmutable de operaciones sensibles (`INSERT`, `UPDATE`, `DELETE`, `LOGIN`), registrando fecha, usuario responsable, dirección IP y estado previo y posterior en formato JSONB.
- **`_migrations`**: Registro de versiones y trazabilidad de ejecuciones de esquemas SQL.

---

## 3. Políticas de Seguridad Implementadas

1. **Principio de Mínimo Privilegio:** Se prevé el usuario de aplicación `zona_fitness_user` con permisos limitados exclusivamente a `SELECT`, `INSERT`, `UPDATE`, `DELETE` y `USAGE` en secuencias de `zona_fitness_db`. No se utiliza el superusuario `postgres` en la operativa cotidiana.
2. **Protección Criptográfica:** Hashing con salt mediante `bcrypt` y emisión de tokens JWT firmados con expiración limitada.
3. **Parametrización Estricta:** Todas las consultas SQL utilizan marcadores de posición (`$1`, `$2`), eliminando el riesgo de inyección SQL (SQL Injection).
4. **Validación de Entorno:** Las credenciales y claves secretas se gestionan mediante variables de entorno en `.env`, excluido del control de versiones mediante `.gitignore`.
