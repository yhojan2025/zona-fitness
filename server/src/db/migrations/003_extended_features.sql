-- ====================================================================
-- MIGRACIÓN 003: Evolución Integral de ZONA FITNESS
-- Pedidos, Carrito, Eventos de Pago, Consentimiento Ley 1581/2012,
-- Ciclo de Vida de Membresías y Registro de Notificaciones de Vencimiento
-- ====================================================================

-- 1. Ampliación de la tabla `users` (para cálculo exacto de edad, contacto y seguridad)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
    ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;

-- 2. Registro de Consentimiento de Datos Personales (Ley 1581 de 2012 / Decreto 1377 de 2013)
CREATE TABLE IF NOT EXISTS consent_records (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    policy_version VARCHAR(30) NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    consent_text_snapshot TEXT NOT NULL,
    is_minor_authorized BOOLEAN NOT NULL DEFAULT false,
    guardian_name VARCHAR(150),
    guardian_document VARCHAR(50),
    guardian_phone VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_version ON consent_records(policy_version);

-- 3. Tabla de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(30) CHECK (payment_method IS NULL OR payment_method IN ('nequi', 'bancolombia', 'efectivo', 'tarjeta', 'transferencia', 'otro')),
    idempotency_key VARCHAR(120) UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- 4. Tabla de Artículos del Pedido (Order Items)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('plan', 'product')),
    item_id INT NOT NULL,
    item_name VARCHAR(150) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- 5. Tabla de Carrito de Compras Persistente (Cart Items)
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('plan', 'product')),
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cart_user_item UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON cart_items;
CREATE TRIGGER trg_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- 6. Actualización del Ciclo de Vida y Extensiones en `memberships`
-- Actualizar la restricción CHECK de estado para incluir 'pending_payment'
DO $$
BEGIN
    ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_status_check;
    ALTER TABLE memberships ADD CONSTRAINT memberships_status_check
        CHECK (status IN ('pending_payment', 'active', 'expired', 'suspended', 'cancelled'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Añadir columnas de relación con pedidos y auditoría de suspensiones
ALTER TABLE memberships
    ADD COLUMN IF NOT EXISTS order_id INT REFERENCES orders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
    ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspended_by INT REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reactivated_by INT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_order ON memberships(order_id);

-- 7. Ampliación de la tabla `payments`
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS order_id INT REFERENCES orders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120) UNIQUE,
    ADD COLUMN IF NOT EXISTS gateway_provider VARCHAR(50) DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS gateway_transaction_id VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);

-- 8. Trazabilidad de Eventos de Pago y Webhooks (payment_events)
CREATE TABLE IF NOT EXISTS payment_events (
    id SERIAL PRIMARY KEY,
    payment_id INT REFERENCES payments(id) ON DELETE SET NULL,
    order_id INT REFERENCES orders(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'manual',
    payload JSONB,
    idempotency_key VARCHAR(120) UNIQUE,
    processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_key ON payment_events(idempotency_key);

-- 9. Historial y Trazabilidad del Ciclo de Vida de Membresías (membership_events)
CREATE TABLE IF NOT EXISTS membership_events (
    id SERIAL PRIMARY KEY,
    membership_id INT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('created', 'activated', 'suspended', 'reactivated', 'expired', 'renewed', 'cancelled')),
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    reason TEXT,
    actor_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_membership_events_membership ON membership_events(membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_events_created ON membership_events(created_at);

-- 10. Control de Notificaciones de Vencimiento con Idempotencia (notification_logs)
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    membership_id INT NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('7_days_before', '3_days_before', '1_day_before', 'expired_today', 'manual_notice')),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(150),
    scheduled_for DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    idempotency_key VARCHAR(150) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_membership ON notification_logs(membership_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_scheduled ON notification_logs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_key ON notification_logs(idempotency_key);
