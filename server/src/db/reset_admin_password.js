const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getAppPool } = require('../config/db');

function generateSecurePassword(length = 16) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*+-=';
  const all = upper + lower + digits + special;

  const pwdChars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    special[crypto.randomInt(0, special.length)],
  ];

  for (let i = 4; i < length; i++) {
    pwdChars.push(all[crypto.randomInt(0, all.length)]);
  }

  for (let i = pwdChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]];
  }

  return pwdChars.join('');
}

async function resetAdminPassword() {
  const pool = getAppPool();
  const client = await pool.connect();
  const adminEmail = 'admin@zonafitness.com';
  const desktopFilePath = 'C:\\Users\\PC\\Desktop\\CREDENCIALES_ADMIN_ZONA_FITNESS.txt';

  try {
    const checkRes = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (checkRes.rows.length === 0) {
      console.log('El usuario administrador no existe. Ejecute server/src/db/init_admin.js');
      return;
    }

    const newRawPassword = generateSecurePassword(16);
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newRawPassword, salt);

    await client.query('UPDATE users SET password_hash = $1, force_password_change = true WHERE email = $2', [newHash, adminEmail]);

    const fileContent = `====================================================================
ZONA FITNESS — CREDENCIALES RESTABLECIDAS DE ACCESO ADMINISTRATIVO
====================================================================

Proyecto: ZONA FITNESS
Correo Electrónico: ${adminEmail}
Nueva Contraseña:   ${newRawPassword}
Fecha de Reset:     ${new Date().toISOString()}

ENLACES DE ACCESO AL SISTEMA:
-----------------------------
Acceso Administrativo:
http://localhost:4200/admin/login

Panel de Control (Dashboard):
http://localhost:4200/admin/dashboard
====================================================================
`;
    fs.writeFileSync(desktopFilePath, fileContent, { encoding: 'utf-8', mode: 0o600 });
    console.log('[RESET EXITOSO] Se actualizó la contraseña en PostgreSQL y se renovó el archivo en el escritorio.');
  } catch (err) {
    console.error('Error al resetear contraseña:', err.message);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  resetAdminPassword().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { resetAdminPassword };
