const { getAdminPool, getAppPool } = require('../config/db');
const { runMigrations } = require('./migrate');

async function setupDatabase() {
  console.log('====================================================');
  console.log('VERIFICACIÓN Y PROVISIÓN DE BASE DE DATOS: ZONA FITNESS');
  console.log('====================================================');

  const adminPool = getAdminPool();
  let adminClient;

  try {
    adminClient = await adminPool.connect();
    console.log('[CONEXIÓN ADMIN OK] Conectado exitosamente al servidor PostgreSQL 18.');

    const targetDb = process.env.DB_NAME || 'zona_fitness_db';
    const appUser = process.env.DB_USER || 'zona_fitness_user';
    const appPass = process.env.DB_PASSWORD;

    // 1. Verificar si la base de datos ya existe
    const checkDbRes = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDb]
    );

    if (checkDbRes.rows.length === 0) {
      console.log(`[CREANDO] La base de datos "${targetDb}" no existe. Creando con UTF-8...`);
      // PostgreSQL no admite nombres de BD parametrizados con $1 en CREATE DATABASE
      const safeDbName = targetDb.replace(/[^a-zA-Z0-9_]/g, '');
      await adminClient.query(`CREATE DATABASE ${safeDbName} WITH ENCODING = 'UTF8';`);
      console.log(`[EXITO] Base de datos "${targetDb}" creada correctamente.`);
    } else {
      console.log(`[OK] La base de datos "${targetDb}" ya existe. Conservando su estructura y datos.`);
    }

    // 2. Crear usuario de aplicación si se especificó y no existe
    if (appUser && appUser !== 'postgres' && appPass) {
      const checkUserRes = await adminClient.query(
        'SELECT 1 FROM pg_roles WHERE rolname = $1',
        [appUser]
      );

      const safeAppUser = appUser.replace(/[^a-zA-Z0-9_]/g, '');
      const escapedPass = appPass.replace(/'/g, "''");

      if (checkUserRes.rows.length === 0) {
        console.log(`[CREANDO] Creando usuario de aplicación con privilegios restringidos: ${appUser}...`);
        await adminClient.query(`CREATE ROLE ${safeAppUser} WITH LOGIN PASSWORD '${escapedPass}';`);
        console.log(`[EXITO] Usuario de aplicación ${appUser} creado.`);
      } else {
        console.log(`[OK] El usuario de aplicación ${appUser} ya existe.`);
      }

      // Otorgar permisos sobre la base de datos
      await adminClient.query(`GRANT CONNECT ON DATABASE ${targetDb.replace(/[^a-zA-Z0-9_]/g, '')} TO ${safeAppUser};`);
    }

    console.log('[FASE BD COMPLETADA] Base de datos y credenciales verificadas.');
  } catch (error) {
    console.error('[ERROR EN CONFIGURACIÓN INICIAL]:', error.message);
    throw error;
  } finally {
    if (adminClient) adminClient.release();
    await adminPool.end();
  }

  // 3. Ejecutar migraciones en zona_fitness_db
  console.log('\nEjecutando migraciones automáticas en zona_fitness_db...');
  await runMigrations();

  // 4. Configurar permisos de esquema para el usuario de aplicación
  try {
    const appPool = getAppPool();
    const appClient = await appPool.connect();
    const appUser = process.env.DB_USER || 'zona_fitness_user';
    if (appUser && appUser !== 'postgres') {
      const safeAppUser = appUser.replace(/[^a-zA-Z0-9_]/g, '');
      await appClient.query(`GRANT USAGE ON SCHEMA public TO ${safeAppUser};`);
      await appClient.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${safeAppUser};`);
      await appClient.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${safeAppUser};`);
      await appClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${safeAppUser};`);
      await appClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${safeAppUser};`);
      console.log(`[PERMISOS] Permisos mínimos de esquema otorgados al usuario "${appUser}".`);
    }
    appClient.release();
  } catch (permError) {
    console.warn('[AVISO PERMISOS] No se aplicaron permisos de usuario de aplicación:', permError.message);
  }

  console.log('\n====================================================');
  console.log('¡BASE DE DATOS Y ESQUEMA DE ZONA FITNESS LISTOS!');
  console.log('====================================================');
}

if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupDatabase };
