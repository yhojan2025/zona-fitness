-- ====================================================================
-- MIGRACIÓN 002: Datos Iniciales del Sistema y Configuración Comercial
-- ZONA FITNESS
-- ====================================================================

-- 1. Roles del Sistema
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrador general con acceso total al sistema y métricas'),
    ('agent', 'Agente de soporte y recepción para atención al socio'),
    ('trainer', 'Entrenador físico responsable de rutinas y valoraciones'),
    ('member', 'Cliente / socio del gimnasio'),
    ('user', 'Usuario general de soporte técnico')
ON CONFLICT (name) DO NOTHING;

-- 2. Planes Comerciales (según los publicados en la web oficial)
-- Nota: price_unconfirmed = true y price = NULL para no asignar importes ficticios como precios oficiales
INSERT INTO plans (name, slug, duration_days, daily_hours_limit, description, price_unconfirmed, price, is_active) VALUES
    ('Cobre', 'cobre', 15, 2, 'Plan de 15 días continuos con límite de 2 horas diarias de entrenamiento. Ideal para temporadas cortas.', true, NULL, true),
    ('Bronce', 'bronce', 90, NULL, 'Plan de 3 meses continuos con acceso ilimitado a áreas de cardio, pesas, sauna y jacuzzi.', true, NULL, true),
    ('Platino', 'platino', 180, NULL, 'Plan de 6 meses continuos con beneficios completos de entrenamiento y bienestar.', true, NULL, true),
    ('Oro', 'oro', 365, NULL, 'Plan anual de 1 año con máxima cobertura, valoración y acceso preferencial.', true, NULL, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    duration_days = EXCLUDED.duration_days,
    daily_hours_limit = EXCLUDED.daily_hours_limit,
    description = EXCLUDED.description;

-- 3. Horarios Oficiales de Atención
-- Lunes (1) a Sábado (6):
-- Turno Mañana: 05:00:00 a 11:00:00
-- Turno Tarde:  15:00:00 a 22:00:00
-- Se eliminan si existieran para evitar duplicaciones en caso de re-ejecución
DELETE FROM opening_hours;

INSERT INTO opening_hours (day_of_week, shift_name, open_time, close_time, is_active) VALUES
    -- Lunes
    (1, 'Mañana', '05:00:00', '11:00:00', true),
    (1, 'Tarde',  '15:00:00', '22:00:00', true),
    -- Martes
    (2, 'Mañana', '05:00:00', '11:00:00', true),
    (2, 'Tarde',  '15:00:00', '22:00:00', true),
    -- Miércoles
    (3, 'Mañana', '05:00:00', '11:00:00', true),
    (3, 'Tarde',  '15:00:00', '22:00:00', true),
    -- Jueves
    (4, 'Mañana', '05:00:00', '11:00:00', true),
    (4, 'Tarde',  '15:00:00', '22:00:00', true),
    -- Viernes
    (5, 'Mañana', '05:00:00', '11:00:00', true),
    (5, 'Tarde',  '15:00:00', '22:00:00', true),
    -- Sábado
    (6, 'Mañana', '05:00:00', '11:00:00', true),
    (6, 'Tarde',  '15:00:00', '22:00:00', true);

-- 4. Catálogo Inicial de Productos Ficticios para Demostración / Pruebas
INSERT INTO products (name, sku, category, description, price, price_unconfirmed, stock_quantity, min_stock_alert, is_active) VALUES
    ('[TEST] Batido de Proteína Vainilla 500ml', 'PROD-TEST-BAT-001', 'batidos', 'Batido recuperador con 25g de proteína (Registro de prueba)', NULL, true, 20, 5, true),
    ('[TEST] Creatina Monohidratada 300g', 'PROD-TEST-CRE-001', 'suplementacion', 'Suplemento de creatina micronizada de alta pureza (Registro de prueba)', NULL, true, 15, 3, true),
    ('[TEST] Caramañola Deportiva Zona Fit 750ml', 'PROD-TEST-ART-001', 'articulos', 'Botella ergonómica libre de BPA con logo Zona Fitness (Registro de prueba)', NULL, true, 30, 8, true)
ON CONFLICT (sku) DO NOTHING;

-- 5. Entrenador Ficticio de Demostración para Pruebas
INSERT INTO trainers (first_name, last_name, email, phone, specialty, bio, is_active) VALUES
    ('Entrenador', 'Demo Prueba', 'entrenador.demo@zonafitness.test', '3000000000', 'Acondicionamiento y pesas', 'Perfil demostrativo para validación del sistema.', true)
ON CONFLICT (email) DO NOTHING;

-- 6. Registro de Auditoría Inicial
INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address) VALUES
    ('migrations', 2, 'INSERT', '{"description": "Datos iniciales de planes, horarios y productos cargados exitosamente"}'::jsonb, NULL, '127.0.0.1');
