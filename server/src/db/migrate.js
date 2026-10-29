const fs = require('fs');
const path = require('path');
const { getAppPool } = require('../config/db');

async function runMigrations() {
  const pool = getAppPool();
  const client = await pool.connect();

  console.log('----------------------------------------------------');
  console.log('Iniciando proceso de migraciones para ZONA FITNESS...');
  console.log('----------------------------------------------------');

  try {
    // 1. Crear tabla de control de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'applied'
      );
    `);

    // 2. Obtener lista de migraciones ya aplicadas
    const { rows: appliedRows } = await client.query(
      'SELECT name FROM _migrations WHERE status = $1 ORDER BY id ASC',
      ['applied']
    );
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 3. Leer archivos de migración disponibles
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[OK] Migración ya aplicada: ${file}`);
        continue;
      }

      console.log(`[EJECUTANDO] Aplicando migración: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Ejecutar en bloque transaccional atómico
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (name, status) VALUES ($1, $2)',
          [file, 'applied']
        );
        await client.query('COMMIT');
        console.log(`[EXITO] Migración aplicada satisfactoriamente: ${file}`);
        appliedCount++;
      } catch (migrationError) {
        await client.query('ROLLBACK');
        console.error(`[ERROR CRITICO] Falló la migración ${file}:`, migrationError.message);
        throw migrationError;
      }
    }

    console.log('----------------------------------------------------');
    console.log(`Migraciones completadas. Nuevas migraciones aplicadas: ${appliedCount}`);
    console.log('El esquema de ZONA FITNESS se encuentra actualizado y verificado.');
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Error durante la ejecución de migraciones:', err.message);
    process.exitCode = 1;
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigrations };
