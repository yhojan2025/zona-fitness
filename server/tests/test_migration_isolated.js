const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { getAdminPool, dbConfig } = require('../src/config/db');

async function testMigrationIsolated() {
  console.log('====================================================');
  console.log('VERIFICACIÓN AISLADA DE MIGRACIÓN 003 EN BASE DE PRUEBA');
  console.log('====================================================\n');

  const adminPool = getAdminPool();
  const testDbName = 'zona_fitness_db_test_migration';
  let testPool = null;

  try {
    const adminClient = await adminPool.connect();

    // 1. Verificar que fastgo_db_new no se toque
    console.log('[COMPROBACIÓN] Verificando aislamiento y protección de fastgo_db_new...');
    const dbsRes = await adminClient.query('SELECT datname FROM pg_database WHERE datname = $1', ['fastgo_db_new']);
    if (dbsRes.rows.length > 0) {
      console.log('[PROTEGIDA] Base de datos fastgo_db_new detectada y excluida terminantemente.');
    }

    // 2. Crear base de datos aislada
    console.log(`[CREANDO] Creando base de datos aislada "${testDbName}"...`);
    await adminClient.query(`DROP DATABASE IF EXISTS ${testDbName};`);
    await adminClient.query(`CREATE DATABASE ${testDbName} WITH ENCODING 'UTF8';`);
    console.log(`[EXITO] Base de datos de prueba "${testDbName}" creada.`);
    adminClient.release();

    // 3. Conectar a la base aislada
    testPool = new Pool({
      ...dbConfig,
      database: testDbName,
    });

    const testClient = await testPool.connect();

    // 4. Aplicar 001_initial_schema.sql y 002_initial_data.sql
    console.log('[MIGRANDO] Aplicando 001_initial_schema.sql...');
    const sql001 = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'migrations', '001_initial_schema.sql'), 'utf-8');
    await testClient.query(sql001);

    console.log('[MIGRANDO] Aplicando 002_initial_data.sql...');
    const sql002 = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'migrations', '002_initial_data.sql'), 'utf-8');
    await testClient.query(sql002);

    // 5. Aplicar nueva migración 003_extended_features.sql
    console.log('[MIGRANDO] Aplicando 003_extended_features.sql...');
    const sql003 = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'migrations', '003_extended_features.sql'), 'utf-8');
    await testClient.query(sql003);
    console.log('[EXITO] 003_extended_features.sql aplicada.');

    // 6. Prueba de IDEMPOTENCIA: re-ejecutar 003_extended_features.sql para verificar que no falla ni duplica
    console.log('[IDEMPOTENCIA] Re-ejecutando 003_extended_features.sql para validar idempotencia...');
    await testClient.query(sql003);
    console.log('[EXITO] Idempotencia confirmada: 003_extended_features.sql se puede re-ejecutar sin errores.');

    // 7. Verificación de existencia de las 6 nuevas tablas y columnas
    console.log('[VALIDACIÓN] Verificando existencia de nuevas tablas y restricciones...');
    const expectedNewTables = [
      'consent_records',
      'orders',
      'order_items',
      'cart_items',
      'payment_events',
      'membership_events',
      'notification_logs',
    ];

    const tablesRes = await testClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const existing = new Set(tablesRes.rows.map((r) => r.table_name));

    for (const t of expectedNewTables) {
      assert.ok(existing.has(t), `La tabla "${t}" debe existir.`);
      console.log(`  ✓ Tabla "${t}" verificada.`);
    }

    // 8. Verificar nuevas columnas en users
    const usersCols = await testClient.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
    `);
    const userColNames = new Set(usersCols.rows.map((r) => r.column_name));
    assert.ok(userColNames.has('birth_date'), 'users.birth_date debe existir');
    assert.ok(userColNames.has('phone'), 'users.phone debe existir');
    assert.ok(userColNames.has('gender'), 'users.gender debe existir');
    assert.ok(userColNames.has('force_password_change'), 'users.force_password_change debe existir');
    console.log('  ✓ Columnas extendidas en users verificadas.');

    // 9. Verificar estado 'pending_payment' en memberships
    const statusChkRes = await testClient.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'memberships'::regclass AND contype = 'c';
    `);
    const checkDefs = statusChkRes.rows.map((r) => r.def).join(' ');
    assert.ok(checkDefs.includes('pending_payment'), "memberships debe permitir 'pending_payment'");
    console.log("  ✓ Restricción CHECK de memberships incluye 'pending_payment'.");

    // 10. Verificar integridad de datos previos
    const plansCount = await testClient.query('SELECT COUNT(*) FROM plans');
    assert.strictEqual(parseInt(plansCount.rows[0].count, 10), 4, 'Deben conservarse los 4 planes');
    const hoursCount = await testClient.query('SELECT COUNT(*) FROM opening_hours');
    assert.strictEqual(parseInt(hoursCount.rows[0].count, 10), 12, 'Deben conservarse los 12 horarios');
    console.log('  ✓ Datos existentes de planes y horarios preservados al 100%.');

    // 11. Limpieza de base de prueba aislada
    testClient.release();
    await testPool.end();

    const cleanClient = await adminPool.connect();
    await cleanClient.query(`DROP DATABASE IF EXISTS ${testDbName};`);
    cleanClient.release();
    console.log(`[LIMPIEZA] Base de datos aislada "${testDbName}" removida exitosamente.`);

    console.log('\n====================================================');
    console.log('¡TODAS LAS PRUEBAS EN ENTORNO AISLADO PASARON!');
    console.log('====================================================');
  } catch (err) {
    console.error('[FALLÓ PRUEBA AISLADA]:', err.message);
    throw err;
  } finally {
    await adminPool.end();
  }
}

if (require.main === module) {
  testMigrationIsolated()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { testMigrationIsolated };
