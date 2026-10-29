const fs = require('fs');
const path = require('path');
const { getAppPool } = require('../config/db');

async function backupDatabase() {
  const pool = getAppPool();
  const client = await pool.connect();

  const backupDir = path.join(__dirname, '..', '..', '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const backupFile = path.join(backupDir, `zona_fitness_db_checkpoint_${timestamp}.sql`);

  console.log('====================================================');
  console.log('GENERANDO RESPALDO DE SEGURIDAD (CHECKPOINT)');
  console.log(`Base de datos: zona_fitness_db`);
  console.log(`Destino:       ${backupFile}`);
  console.log('====================================================');

  const stream = fs.createWriteStream(backupFile, { encoding: 'utf-8' });

  stream.write(`-- ====================================================\n`);
  stream.write(`-- RESPALDO DE SEGURIDAD - ZONA FITNESS (PostgreSQL 18)\n`);
  stream.write(`-- Fecha: ${new Date().toISOString()}\n`);
  stream.write(`-- Base de datos: zona_fitness_db\n`);
  stream.write(`-- ====================================================\n\n`);
  stream.write(`BEGIN;\n\n`);

  try {
    // 1. Obtener todas las tablas en schema public
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map((r) => r.table_name);
    console.log(`Tablas detectadas (${tables.length}): ${tables.join(', ')}`);

    for (const table of tables) {
      const dataRes = await client.query(`SELECT * FROM ${table};`);
      stream.write(`-- Tabla: ${table} (${dataRes.rows.length} registros)\n`);

      if (dataRes.rows.length > 0) {
        const columns = Object.keys(dataRes.rows[0]);
        for (const row of dataRes.rows) {
          const values = columns.map((col) => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          stream.write(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`
          );
        }
      }
      stream.write('\n');
    }

    stream.write(`COMMIT;\n`);
    stream.end();

    console.log(`[EXITO] Respaldo generado correctamente.`);
    console.log(`Archivo: ${backupFile}`);
    console.log('====================================================');
    return backupFile;
  } catch (err) {
    console.error('[ERROR EN RESPALDO]:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  backupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { backupDatabase };
