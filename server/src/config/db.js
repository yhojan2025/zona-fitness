const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno: primero desde server/.env si existe, luego desde raíz .env
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'zona_fitness_db',
  user: process.env.DB_USER || process.env.DB_ADMIN_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_ADMIN_PASSWORD || '',
  ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

let appPool = null;

function getAppPool() {
  if (!appPool) {
    appPool = new Pool(dbConfig);
    appPool.on('error', (err) => {
      console.error('[DATABASE POOL ERROR]', err.message);
    });
  }
  return appPool;
}

function getAdminPool() {
  // Pool especial conectado a la base 'postgres' administrativa para tareas de provisión
  return new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: 'postgres',
    user: process.env.DB_ADMIN_USER || 'postgres',
    password: process.env.DB_ADMIN_PASSWORD || process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false,
    max: 2,
    connectionTimeoutMillis: 5000,
  });
}

module.exports = {
  dbConfig,
  getAppPool,
  getAdminPool,
};
