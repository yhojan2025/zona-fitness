-- ====================================================================
-- MIGRACIÓN 005: Historial de Planes, Eliminación Lógica y Auditoría Administrativa
-- ZONA FITNESS - PostgreSQL 18
-- ====================================================================

-- 1. Tabla de Historial de Cambios de Precio y Duración de Planes
CREATE TABLE IF NOT EXISTS plan_price_history (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    old_price NUMERIC(10, 2),
    new_price NUMERIC(10, 2) NOT NULL,
    old_duration_days INT,
    new_duration_days INT NOT NULL,
    changed_by INT REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plan_price_history_plan ON plan_price_history(plan_id, created_at DESC);

-- 2. Soporte para Eliminación Lógica Segura (Soft Delete) en users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by INT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. Columna de Motivo / Justificación en Registros de Auditoría
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS reason TEXT;

-- 4. Registrar línea base histórica inicial de precios si no existe historial previo
INSERT INTO plan_price_history (plan_id, old_price, new_price, old_duration_days, new_duration_days, reason)
SELECT id, price, price, duration_days, duration_days, 'Línea base oficial inicial ZONA FITNESS'
FROM plans
WHERE id NOT IN (SELECT DISTINCT plan_id FROM plan_price_history);

-- 5. Registro de auditoría de la migración
INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address, reason)
VALUES (
    'migrations',
    5,
    'INSERT',
    '{"migration": "005_admin_management_and_audit", "description": "Historial de planes, eliminación lógica segura de usuarios y campo reason en auditoría"}'::jsonb,
    NULL,
    '127.0.0.1',
    'Actualización de esquema para panel administrativo profesional'
);
