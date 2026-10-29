const assert = require('assert');
const { getAppPool } = require('../src/config/db');

async function runDatabaseTests() {
  console.log('====================================================');
  console.log('EJECUTANDO SUITE DE PRUEBAS DE BASE DE DATOS');
  console.log('====================================================\n');

  const pool = getAppPool();
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASÓ] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FALLÓ] ${name}:`, err.message);
      failed++;
    }
  }

  // PRUEBA 1: Conexión activa a PostgreSQL 18
  await test('1. Conexión activa a PostgreSQL 18 y base de datos correcta', async () => {
    const res = await pool.query('SELECT current_database() as db, version() as ver;');
    assert.strictEqual(res.rows.length, 1);
    assert.strictEqual(res.rows[0].db, 'zona_fitness_db');
    assert.ok(res.rows[0].ver.includes('PostgreSQL 18'), 'La versión debe ser PostgreSQL 18');
  });

  // PRUEBA 2: Existencia de todas las tablas requeridas (incluyendo las nuevas de Fase 2)
  await test('2. Existencia de todas las tablas relacionales (22 tablas en total)', async () => {
    const requiredTables = [
      'roles',
      'users',
      'profiles',
      'members',
      'plans',
      'memberships',
      'payments',
      'attendance',
      'opening_hours',
      'trainers',
      'products',
      'inventory_movements',
      'audit_logs',
      'tickets',
      '_migrations',
      'consent_records',
      'orders',
      'order_items',
      'cart_items',
      'payment_events',
      'membership_events',
      'notification_logs',
    ];

    const res = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const existing = new Set(res.rows.map((r) => r.table_name));

    for (const tbl of requiredTables) {
      assert.ok(existing.has(tbl), `La tabla "${tbl}" debe existir en public`);
    }
  });

  // PRUEBA 3: Verificación de planes oficiales
  await test('3. Verificación de los 4 planes oficiales precargados', async () => {
    const res = await pool.query('SELECT name, slug, duration_days, daily_hours_limit FROM plans ORDER BY duration_days ASC;');
    const names = res.rows.map((r) => r.name);
    assert.ok(names.includes('Cobre'), 'Debe incluir plan Cobre');
    assert.ok(names.includes('Bronce'), 'Debe incluir plan Bronce');
    assert.ok(names.includes('Platino'), 'Debe incluir plan Platino');
    assert.ok(names.includes('Oro'), 'Debe incluir plan Oro');

    const cobre = res.rows.find((r) => r.slug === 'cobre');
    assert.strictEqual(cobre.duration_days, 15, 'Cobre debe durar 15 días');
    assert.strictEqual(cobre.daily_hours_limit, 2, 'Cobre debe tener límite de 2 horas');
  });

  // PRUEBA 4: Verificación de horarios de atención
  await test('4. Verificación de horarios oficiales (Lunes a Sábado, mañana y tarde)', async () => {
    const res = await pool.query('SELECT COUNT(*) as count FROM opening_hours;');
    const count = parseInt(res.rows[0].count, 10);
    assert.strictEqual(count, 12, 'Deben existir exactamente 12 franjas horarias (6 días x 2 turnos)');
  });

  // PRUEBA 5: Integridad referencial de clave foránea (FK)
  await test('5. Integridad referencial FK: Rechazar membresía con member_id inexistente', async () => {
    let errorCaught = false;
    try {
      await pool.query(`
        INSERT INTO memberships (member_id, plan_id, start_date, end_date)
        VALUES (999999, 1, '2026-01-01', '2026-02-01');
      `);
    } catch (err) {
      errorCaught = true;
      assert.ok(err.code === '23503', `Debe lanzar violación de foreign key (23503). Recibido: ${err.code}`);
    }
    assert.ok(errorCaught, 'Debe haber fallado al insertar FK inválida');
  });

  // PRUEBA 6: Validación de restricciones CHECK
  await test('6. Restricciones CHECK: Rechazar duración negativa de plan', async () => {
    let errorCaught = false;
    try {
      await pool.query(`
        INSERT INTO plans (name, slug, duration_days)
        VALUES ('Plan Invalido', 'plan-invalido', -5);
      `);
    } catch (err) {
      errorCaught = true;
      assert.ok(err.code === '23514', `Debe lanzar violación de CHECK constraint (23514). Recibido: ${err.code}`);
    }
    assert.ok(errorCaught, 'Debe haber fallado por CHECK constraint');
  });

  await test('7. Restricciones CHECK: Rechazar método de pago inválido', async () => {
    let errorCaught = false;
    try {
      await pool.query(`
        INSERT INTO payments (member_id, amount, payment_method)
        VALUES (1, 50000, 'bitcoin_no_soportado');
      `);
    } catch (err) {
      errorCaught = true;
      assert.ok(['23514', '23503'].includes(err.code));
    }
    assert.ok(errorCaught, 'Debe fallar al intentar usar método no permitido');
  });

  // PRUEBA 8: Inserción y consulta en transacción limpia
  await test('8. Transaccionalidad e inserción de miembro de prueba y rollback', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const insRes = await client.query(`
        INSERT INTO members (first_name, last_name, document_number, email)
        VALUES ('Prueba', 'Transaccional', 'DOC-TEST-999999', 'transaccional.test@zonafit.test')
        RETURNING id, first_name, email;
      `);
      assert.strictEqual(insRes.rows[0].first_name, 'Prueba');

      const checkRes = await client.query('SELECT id FROM members WHERE document_number = $1', ['DOC-TEST-999999']);
      assert.strictEqual(checkRes.rows.length, 1);

      await client.query('ROLLBACK');

      const postRollback = await pool.query('SELECT id FROM members WHERE document_number = $1', ['DOC-TEST-999999']);
      assert.strictEqual(postRollback.rows.length, 0);
    } finally {
      client.release();
    }
  });

  // PRUEBA 9: Verificación de migraciones aplicadas
  await test('9. Verificación de registro de migraciones aplicadas (001, 002, 003)', async () => {
    const res = await pool.query('SELECT name, status FROM _migrations ORDER BY id ASC;');
    assert.ok(res.rows.length >= 3, 'Deben existir al menos 3 migraciones registradas');
    assert.strictEqual(res.rows[0].name, '001_initial_schema.sql');
    assert.strictEqual(res.rows[1].name, '002_initial_data.sql');
    assert.strictEqual(res.rows[2].name, '003_extended_features.sql');
    assert.strictEqual(res.rows[2].status, 'applied');
  });

  // PRUEBA 10: Verificación de columnas extendidas en users
  await test('10. Columnas extendidas en users (birth_date, phone, gender, force_password_change)', async () => {
    const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users';
    `);
    const cols = new Set(res.rows.map((r) => r.column_name));
    assert.ok(cols.has('birth_date'), 'users.birth_date debe existir');
    assert.ok(cols.has('phone'), 'users.phone debe existir');
    assert.ok(cols.has('gender'), 'users.gender debe existir');
    assert.ok(cols.has('force_password_change'), 'users.force_password_change debe existir');
  });

  // PRUEBA 11: Estado 'pending_payment' en memberships
  await test("11. memberships.status admite el estado 'pending_payment'", async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const testUser = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Test Status', 'test.status@test.com', 'hash', 'member') RETURNING id"
      );
      const testMember = await client.query(
        "INSERT INTO members (user_id, first_name, last_name, document_number, email) VALUES ($1, 'Test', 'Status', 'DOC-STAT-1', 'test.member.stat@test.com') RETURNING id",
        [testUser.rows[0].id]
      );
      const testMem = await client.query(
        "INSERT INTO memberships (member_id, plan_id, start_date, end_date, status) VALUES ($1, 1, '2026-01-01', '2026-01-16', 'pending_payment') RETURNING id, status",
        [testMember.rows[0].id]
      );
      assert.strictEqual(testMem.rows[0].status, 'pending_payment');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  // PRUEBA 12: Unicidad en cart_items (user_id, item_type, item_id)
  await test('12. Restricción UNIQUE en cart_items previene ítems duplicados del mismo usuario', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userRes = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Cart Test', 'cart.test@test.com', 'hash', 'user') RETURNING id"
      );
      const uid = userRes.rows[0].id;
      await client.query("INSERT INTO cart_items (user_id, item_type, item_id, quantity) VALUES ($1, 'plan', 1, 1)", [uid]);

      let duplicateCaught = false;
      try {
        await client.query("INSERT INTO cart_items (user_id, item_type, item_id, quantity) VALUES ($1, 'plan', 1, 1)", [uid]);
      } catch (err) {
        duplicateCaught = true;
        assert.strictEqual(err.code, '23505', 'Debe lanzar violación de unicidad 23505');
      }
      assert.ok(duplicateCaught, 'Debe haber bloqueado ítem duplicado en el carrito');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  // PRUEBA 13: Integridad de orders y order_items
  await test('13. Integridad de orders y cascada de eliminación de order_items', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userRes = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Order Test', 'order.test@test.com', 'hash', 'user') RETURNING id"
      );
      const uid = userRes.rows[0].id;

      const orderRes = await client.query(
        "INSERT INTO orders (order_number, user_id, total_amount, status) VALUES ('ORD-TEST-001', $1, 150000, 'pending') RETURNING id",
        [uid]
      );
      const oid = orderRes.rows[0].id;

      await client.query(
        "INSERT INTO order_items (order_id, item_type, item_id, item_name, unit_price, quantity, subtotal) VALUES ($1, 'plan', 1, 'Plan Cobre', 150000, 1, 150000)",
        [oid]
      );

      const itemsBefore = await client.query('SELECT id FROM order_items WHERE order_id = $1', [oid]);
      assert.strictEqual(itemsBefore.rows.length, 1);

      await client.query('DELETE FROM orders WHERE id = $1', [oid]);
      const itemsAfter = await client.query('SELECT id FROM order_items WHERE order_id = $1', [oid]);
      assert.strictEqual(itemsAfter.rows.length, 0, 'order_items deben eliminarse en cascada al borrar order');

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  // PRUEBA 14: Restricción UNIQUE de idempotency_key en notification_logs
  await test('14. notification_logs exige idempotency_key único para evitar notificaciones duplicadas', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const uRes = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Notif Test', 'notif.test@test.com', 'hash', 'member') RETURNING id"
      );
      const mRes = await client.query(
        "INSERT INTO members (user_id, first_name, last_name, document_number, email) VALUES ($1, 'Notif', 'User', 'DOC-NOTIF-1', 'notif.test@test.com') RETURNING id",
        [uRes.rows[0].id]
      );
      const memRes = await client.query(
        "INSERT INTO memberships (member_id, plan_id, start_date, end_date, status) VALUES ($1, 1, '2026-01-01', '2026-01-16', 'active') RETURNING id",
        [mRes.rows[0].id]
      );
      const mid = memRes.rows[0].id;

      await client.query(
        "INSERT INTO notification_logs (membership_id, notification_type, recipient_email, scheduled_for, idempotency_key) VALUES ($1, '7_days_before', 'notif.test@test.com', '2026-01-09', 'IDEMP-NOTIF-001')",
        [mid]
      );

      let notifDupCaught = false;
      try {
        await client.query(
          "INSERT INTO notification_logs (membership_id, notification_type, recipient_email, scheduled_for, idempotency_key) VALUES ($1, '7_days_before', 'notif.test@test.com', '2026-01-09', 'IDEMP-NOTIF-001')",
          [mid]
        );
      } catch (err) {
        notifDupCaught = true;
        assert.strictEqual(err.code, '23505', 'Debe rechazar idempotency_key duplicada');
      }
      assert.ok(notifDupCaught, 'Debe prevenir duplicación de alerta de notificación');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  console.log('\n====================================================');
  console.log(`RESUMEN DE PRUEBAS: ${passed} PASARON, ${failed} FALLARON`);
  console.log('====================================================');

  await pool.end();

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runDatabaseTests().catch((err) => {
    console.error('Error fatal ejecutando pruebas:', err);
    process.exit(1);
  });
}

module.exports = { runDatabaseTests };
