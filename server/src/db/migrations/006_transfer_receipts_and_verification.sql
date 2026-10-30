-- ============================================================================
-- MIGRACIÓN 006: GESTIÓN DE COMPROBANTES DE TRANSFERENCIA Y VERIFICACIÓN DE PAGOS
-- ZONA FITNESS | PostgreSQL 18
-- ============================================================================

-- 1. Ampliar estados permitidos en tabla payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'pending_verification', 'verified', 'approved', 'rejected', 'simulated'));

-- 2. Ampliar estados permitidos en tabla orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'pending_verification', 'approved', 'rejected', 'cancelled'));

-- 3. Columnas de almacenamiento seguro de comprobante y rechazo en payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_original_name TEXT,
  ADD COLUMN IF NOT EXISTS receipt_mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS receipt_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. Tabla de cuentas bancarias institucionales para transferencias
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  bank_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  account_holder VARCHAR(150) NOT NULL,
  holder_document VARCHAR(50) NOT NULL,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Semilla inicial de datos bancarios oficiales para ZONA FITNESS
INSERT INTO bank_accounts (bank_name, account_type, account_number, account_holder, holder_document, instructions, is_active)
SELECT 'Bancolombia', 'Cuenta de Ahorros', '942-000123-45', 'ZONA FITNESS S.A.S.', 'NIT: 901.482.391-4', 'Realiza la transferencia desde la app de tu banco o cajero e incluye como referencia tu documento o correo. Sube la foto nítida del comprobante para verificación.', true
WHERE NOT EXISTS (SELECT 1 FROM bank_accounts WHERE account_number = '942-000123-45');

INSERT INTO bank_accounts (bank_name, account_type, account_number, account_holder, holder_document, instructions, is_active)
SELECT 'Nequi / Daviplata', 'Billetera Digital', '300 123 4567', 'ZONA FITNESS Pagos', 'NIT: 901.482.391-4', 'Envía a través de Transfiya o transferencia directa al número 300 123 4567 y captura el comprobante con fecha y referencia visible.', true
WHERE NOT EXISTS (SELECT 1 FROM bank_accounts WHERE account_number = '300 123 4567');

-- 6. Índices para búsqueda rápida en consola de verificación
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
