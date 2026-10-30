const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getAppPool } = require('../config/db');

function generateSecurePassword(length = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*+-=';
  const all = upper + lower + digits + special;

  // Garantizar al menos un carácter de cada grupo
  const pwdChars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    special[crypto.randomInt(0, special.length)],
  ];

  for (let i = 4; i < length; i++) {
    pwdChars.push(all[crypto.randomInt(0, all.length)]);
  }

  // Barajar
  for (let i = pwdChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]];
  }

  return pwdChars.join('');
}

async function initAdmin() {
  const pool = getAppPool();
  const client = await pool.connect();

  const adminEmail = 'admin@zonafitness.com';
  const desktopFilePath = 'C:\\Users\\PC\\Desktop\\CREDENCIALES_ADMIN_ZONA_FITNESS.txt';

  console.log('----------------------------------------------------');
  console.log('Verificando inicialización segura de Administrador...');
  console.log('----------------------------------------------------');

  try {
    // 1. Comprobar si ya existe el administrador oficial
    const existing = await client.query(
      'SELECT id, name, email, role, is_active FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existing.rows.length > 0) {
      console.log(`[AVISO] El administrador "${adminEmail}" ya existe en la base de datos (ID: ${existing.rows[0].id}).`);
      console.log('No se reemplaza ni sobreescribe la cuenta existente para preservar la seguridad.');
      return;
    }

    // 2. Generar contraseña aleatoria y hash bcrypt
    const rawPassword = generateSecurePassword(16);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    await client.query('BEGIN');

    // 3. Insertar usuario con rol admin
    const insertRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_active, force_password_change)
       VALUES ($1, $2, $3, 'admin', true, true)
       RETURNING id, name, email, role, created_at`,
      ['Administrador ZONA FITNESS', adminEmail, passwordHash]
    );

    const newAdmin = insertRes.rows[0];

    // 4. Crear perfil administrativo
    await client.query(
      `INSERT INTO profiles (user_id, medical_notes)
       VALUES ($1, 'Cuenta principal de administración del sistema')
       ON CONFLICT (user_id) DO NOTHING`,
      [newAdmin.id]
    );

    // 5. Registrar en auditoría
    await client.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, ip_address)
       VALUES ('users', $1, 'INSERT', '{"action": "ADMIN_INITIALIZED", "email": "admin@zonafitness.com"}', '127.0.0.1')`,
      [newAdmin.id]
    );

    await client.query('COMMIT');

    // 6. Escribir archivo de credenciales en el escritorio
    const fileContent = `====================================================================
ZONA FITNESS — CREDENCIALES OFICIALES DE ACCESO ADMINISTRATIVO
====================================================================

Proyecto: ZONA FITNESS
Plataforma: Angular 22 + Node.js / Express + PostgreSQL 18

DETALLES DE LA CUENTA ADMINISTRATIVA:
------------------------------------
Correo Electrónico: ${adminEmail}
Contraseña Inicial: ${rawPassword}
Rol Asignado:       admin (Acceso Total y Privilegiado)
Fecha de Creación:  ${new Date().toISOString()}

ENLACES DE ACCESO AL SISTEMA:
-----------------------------
Acceso Administrativo:
http://localhost:4200/admin/login

Panel de Control (Dashboard):
http://localhost:4200/admin/dashboard

INSTRUCCIONES DE USO:
---------------------
1. Ingrese a la dirección http://localhost:4200/admin/login en su navegador.
2. Ingrese el correo (${adminEmail}) y la contraseña inicial generada arriba.
3. El sistema verificará de forma estricta sus credenciales y su rol 'admin'.
4. Tras autenticarse correctamente, el sistema lo redirigirá automáticamente
   al panel de control administrativo (http://localhost:4200/admin/dashboard).

INSTRUCCIONES PARA CAMBIAR LA CONTRASEÑA:
----------------------------------------
Por seguridad, la cuenta fue creada con la directiva 'force_password_change=true'.
Para cambiar su contraseña:
- Puede actualizarla en cualquier momento desde su panel de perfil administrativo
  en http://localhost:4200/mi-cuenta o mediante el endpoint seguro PATCH /api/auth/profile.
- Ingrese una contraseña de al menos 8 caracteres que combine mayúsculas, minúsculas,
  números y símbolos.

PROCEDIMIENTO SEGURO PARA RECUPERAR EL ACCESO:
----------------------------------------------
En caso de extravío o necesidad de reinicialización de la contraseña administrativa,
ejecute en la terminal del proyecto con permisos locales del sistema:
  node server/src/db/reset_admin_password.js
Nunca comparta este archivo ni exponga estas credenciales en repositorios públicos.
====================================================================
`;

    fs.writeFileSync(desktopFilePath, fileContent, { encoding: 'utf-8', mode: 0o600 });

    console.log('[EXITO] Administrador creado exitosamente en PostgreSQL (ID: ' + newAdmin.id + ').');
    console.log('[SEGURIDAD] Archivo de credenciales generado en: ' + desktopFilePath);
    console.log('[SEGURIDAD] La contraseña NO fue impresa en la terminal ni enviada al frontend.');
    console.log('----------------------------------------------------');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR CRITICO] Error al inicializar administrador:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initAdmin()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initAdmin };
