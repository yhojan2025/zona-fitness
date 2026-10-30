-- ====================================================================
-- MIGRACIÓN 004: Precios Oficiales de Planes, Compras Simuladas y Membresías de Usuario
-- ZONA FITNESS - PostgreSQL 18
-- ====================================================================

-- 1. Confirmar precios oficiales de planes comerciales conforme al catálogo publicado
UPDATE plans SET price = 45000.00, price_unconfirmed = false WHERE slug = 'cobre';
UPDATE plans SET price = 260000.00, price_unconfirmed = false WHERE slug = 'bronce';
UPDATE plans SET price = 500000.00, price_unconfirmed = false WHERE slug = 'platino';
UPDATE plans SET price = 900000.00, price_unconfirmed = false WHERE slug = 'oro';

-- 2. Vincular directamente las membresías al usuario de autenticación y registrar importes
ALTER TABLE memberships
    ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_memberships_user_direct ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status_dates ON memberships(status, end_date);

-- 3. Permitir método 'simulacion' en la tabla de pagos
DO $$
BEGIN
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
    ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
        CHECK (payment_method IN ('nequi', 'bancolombia', 'efectivo', 'tarjeta', 'transferencia', 'simulacion', 'otro'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Permitir método 'simulacion' en la tabla de pedidos (orders)
DO $$
BEGIN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
        CHECK (payment_method IS NULL OR payment_method IN ('nequi', 'bancolombia', 'efectivo', 'tarjeta', 'transferencia', 'simulacion', 'otro'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 5. Registro de auditoría para trazabilidad de la migración
INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address)
VALUES (
    'migrations',
    4,
    'INSERT',
    '{"migration": "004_official_prices_and_simulated_purchases", "description": "Precios oficiales confirmados en planes y soporte para compras simuladas"}'::jsonb,
    NULL,
    '127.0.0.1'
);
