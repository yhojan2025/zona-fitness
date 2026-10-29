# Guía de Administración de ZONA FITNESS en pgAdmin 4 y PostgreSQL 18

Esta guía documenta paso a paso cómo gestionar y visualizar la base de datos `zona_fitness_db` de **ZONA FITNESS** utilizando la herramienta gráfica oficial **pgAdmin 4** y el motor **PostgreSQL 18** en Windows.

---

## 1. Distinción Fundamental: Servidor PostgreSQL vs. pgAdmin 4

- **PostgreSQL 18:** Es el motor gestor de base de datos relacional (servicio en segundo plano `postgresql-x64-18` que se ejecuta en el puerto `5432`). Es el encargado de almacenar la información, validar las restricciones y procesar las consultas SQL.
- **pgAdmin 4:** Es una aplicación cliente gráfica e interactiva (ubicada en `C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\pgAdmin4.exe`) que permite navegar visualmente por las bases de datos, inspeccionar tablas, ver relaciones, ejecutar sentencias SQL y realizar copias de seguridad.

---

## 2. Cómo Abrir pgAdmin 4

1. Presione la tecla **Windows** o abra el menú Inicio.
2. Escriba `pgAdmin 4` y seleccione la aplicación.
   - Alternativamente, puede ejecutar directamente desde PowerShell:
     ```powershell
     & "C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\pgAdmin4.exe"
     ```
3. Al iniciar, pgAdmin 4 solicitará la contraseña maestra (*Master Password*) que protege la aplicación cliente.

---

## 3. Conexión al Servidor PostgreSQL 18

1. En el panel izquierdo (**Browser** / Explorador de objetos), expanda la sección **Servers**.
2. Haga clic sobre **PostgreSQL 18** (o el servidor local configurado).
3. Si el servidor no está registrado:
   - Haga clic derecho en **Servers** > **Register** > **Server...**
   - En la pestaña **General**:
     - *Name:* `PostgreSQL 18 Local`
   - En la pestaña **Connection**:
     - *Host name/address:* `127.0.0.1` o `localhost`
     - *Port:* `5432`
     - *Maintenance database:* `postgres`
     - *Username:* `postgres`
     - Marque la casilla *Save password* si desea recordar la contraseña de forma segura en su equipo.
   - Haga clic en **Save**.

---

## 4. Encontrar la Base de Datos `zona_fitness_db`

1. Conectado al servidor, despliegue el árbol:
   `Servers` > `PostgreSQL 18` > `Databases`.
2. Verá listada la base de datos **`zona_fitness_db`**.
   *(Importante: respete las demás bases existentes como `fastgo_db_new`, las cuales no deben ser modificadas).*
3. Para ver el esquema relacional, despliegue:
   `zona_fitness_db` > `Schemas` > `public` > `Tables`.

---

## 5. Consultar las Tablas, Columnas y Restricciones

Bajo la sección **Tables**, encontrará las 22 tablas del sistema:

| Tabla | Propósito |
|---|---|
| `roles` | Catálogo de roles (`admin`, `agent`, `trainer`, `member`, `user`). |
| `users` | Cuentas de acceso con contraseñas cifradas con `bcrypt`, fecha de nacimiento y teléfono. |
| `profiles` | Perfiles complementarios (contacto de emergencia, notas médicas). |
| `consent_records` | Trazabilidad auditable de consentimiento de política de datos (Ley 1581 de 2012). |
| `members` | Registro de socios del gimnasio (documento, correo, teléfono). |
| `plans` | Planes comerciales oficiales (`Cobre`, `Bronce`, `Platino`, `Oro`). |
| `memberships` | Membresías contratadas con fechas de inicio, vencimiento y estados (`active`, `pending_payment`). |
| `membership_events` | Historial de renovaciones, congelaciones, vencimientos y cancelaciones de membresías. |
| `payments` | Registro y verificación de pagos (Nequi, Bancolombia, etc.). |
| `payment_events` | Registro de transacciones, estados y webhooks de pasarelas. |
| `attendance` | Registro de acceso y asistencia de socios. |
| `opening_hours` | Franjas horarias de atención (lunes a sábado, mañana y tarde). |
| `trainers` | Catálogo de entrenadores y sus especialidades. |
| `products` | Catálogo de batidos, suplementos y accesorios deportivos. |
| `inventory_movements` | Registro de entradas, salidas y ajustes de inventario. |
| `cart_items` | Carrito de compras persistido por usuario con claves compuestas únicas. |
| `orders` | Pedidos generados (`pending`, `completed`), métodos de pago y totales calculados. |
| `order_items` | Artículos desglosados asociados a cada pedido. |
| `notification_logs` | Registro idempotente de notificaciones y recordatorios. |
| `audit_logs` | Bitácora de auditoría de operaciones administrativas y de usuario. |
| `tickets` | Tickets de soporte técnico del equipo. |
| `_migrations` | Control de versiones y trazabilidad de migraciones aplicadas. |

### Visualizar Columnas y Restricciones
- Al hacer clic sobre cualquier tabla, despliegue `Columns` para ver los tipos de datos y nulabilidad.
- Despliegue `Constraints` para examinar:
  - Claves primarias (`Primary Key`).
  - Claves foráneas (`Foreign Keys`) que garantizan la integridad referencial.
  - Restricciones de verificación (`Check Constraints`), tales como validación de fechas o importes positivos.

---

## 6. Uso del Query Tool (Herramienta de Consultas)

Para ejecutar consultas interactivas:
1. Seleccione la base de datos `zona_fitness_db` en el panel izquierdo.
2. En la barra de herramientas superior, haga clic en el botón **Query Tool** (icono de rayo / base de datos) o presione `Alt + Shift + Q`.
3. Escriba su consulta SQL y presione **F5** (o haga clic en el botón de reproducción ▶).

### Consultas de Ejemplo

#### Consultar Planes Comerciales
```sql
SELECT id, name, slug, duration_days, daily_hours_limit, price_unconfirmed, is_active
FROM plans
ORDER BY duration_days ASC;
```

#### Consultar Horarios de Atención
```sql
SELECT
    CASE day_of_week
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miércoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sábado'
        WHEN 7 THEN 'Domingo'
    END AS dia,
    shift_name AS turno,
    open_time AS apertura,
    close_time AS cierre
FROM opening_hours
WHERE is_active = true
ORDER BY day_of_week, open_time ASC;
```

#### Consultar Pedidos y Artículos Generados
```sql
SELECT o.order_number, o.status, o.total_amount, o.payment_method, o.created_at,
       oi.item_name, oi.unit_price, oi.quantity, oi.subtotal
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
ORDER BY o.created_at DESC;
```

#### Consultar Registros de Consentimiento de Datos (Ley 1581)
```sql
SELECT c.id, u.email, u.name, c.accepted, c.policy_version, c.is_minor_authorized, c.guardian_name, c.created_at
FROM consent_records c
JOIN users u ON c.user_id = u.id
ORDER BY c.created_at DESC;
```

#### Consultar Carritos Activos en Base de Datos
```sql
SELECT ci.id, u.name, u.email, ci.item_type, ci.item_id, ci.quantity, ci.updated_at
FROM cart_items ci
JOIN users u ON ci.user_id = u.id
ORDER BY ci.updated_at DESC;
```

#### Consultar Clientes de Prueba Registrados
```sql
SELECT id, first_name, last_name, document_type, document_number, email, phone, is_active
FROM members
ORDER BY id DESC;
```

#### Consultar Auditoría Reciente
```sql
SELECT id, table_name, action, record_id, created_at, new_data
FROM audit_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 7. Ejecución de Migraciones desde la Consola del Proyecto

El proyecto incluye un motor automatizado e idempotente de migraciones para evitar tener que ejecutar scripts manualmente.

Desde la terminal en `C:\Users\PC\Desktop\zona fit\zona-fitness`:
```powershell
npm run db:migrate
```
El motor:
1. Lee la tabla `_migrations`.
2. Identifica los archivos en `server/src/db/migrations/` que aún no han sido aplicados.
3. Ejecuta cada archivo pendiente dentro de una transacción `BEGIN ... COMMIT`.
4. Si ocurre cualquier error, realiza `ROLLBACK` y previene inconsistencias.

---

## 8. Copias de Seguridad (Backup)

### Método 1: Desde la Interfaz de pgAdmin 4
1. Haga clic derecho sobre `zona_fitness_db`.
2. Seleccione **Backup...**
3. En la pestaña **General**:
   - *Filename:* Seleccione una ruta y nombre (ej. `C:\Users\PC\Desktop\zona-fitness-backup.sql`).
   - *Format:* Seleccione **Plain** (SQL) o **Custom**.
4. En la pestaña **Dump options**:
   - Active *Include CREATE DATABASE statement* si desea incluir la creación.
5. Haga clic en **Backup**.

### Método 2: Mediante el Script Automatizado del Proyecto
Desde PowerShell en la carpeta del proyecto:
```powershell
.\scripts\backup-db.ps1
```
El script generará automáticamente un archivo con fecha y hora en la carpeta `backups/`.

---

## 9. Restauración de una Copia en un Entorno de Prueba

### Método 1: Desde pgAdmin 4
1. En pgAdmin 4, cree una base de datos vacía de prueba (ej. `zona_fitness_db_test`).
2. Haga clic derecho sobre la base de prueba > **Restore...**
3. Seleccione el archivo de respaldo generado.
4. Haga clic en **Restore**.

### Método 2: Mediante el Script Automatizado
```powershell
.\scripts\restore-db.ps1 -BackupFile ".\backups\zona_fitness_db_backup_XXXXXXXX_XXXXXX.sql" -TargetDb "zona_fitness_db_test_restore"
```
El script crea la base de datos de prueba si no existe y restaura íntegramente las tablas y datos sin alterar la base de datos principal.
