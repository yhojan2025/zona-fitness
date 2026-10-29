const assert = require('assert');
const http = require('http');
const bcrypt = require('bcryptjs');
const app = require('../src/server');
const { getAppPool } = require('../src/config/db');

async function runRbacTests() {
  console.log('====================================================');
  console.log('EJECUTANDO PRUEBAS DE CONTROL DE ACCESO (RBAC)');
  console.log('Separación estricta de permisos entre admin y user');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

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

  async function request(endpoint, options = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body };
  }

  const pool = getAppPool();

  const userEmail = `user.rbac.${Date.now()}@zonafit.test`;
  const adminEmail = `admin.rbac.${Date.now()}@zonafit.test`;

  let userToken = null;
  let adminToken = null;
  let userId = null;
  let adminId = null;

  // 1. Registro público ignora intento de inyección de role='admin'
  await test('1. Registro público ignora payload role:admin e isAdmin:true (asigna rol user)', async () => {
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Usuario Prueba RBAC',
        email: userEmail,
        password: 'Password123!',
        role: 'admin', // Intento de escalamiento malicioso
        isAdmin: true,  // Intento de bypass
        birth_date: '1998-04-12',
        accepted_privacy_policy: true,
      }),
    });

    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.body.role, 'user', 'El backend debió forzar rol user');
    userId = regRes.body.id;

    // Verificar en la base de datos real
    const dbCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    assert.strictEqual(dbCheck.rows[0].role, 'user');
  });

  // Login del usuario normal
  const userLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: userEmail, password: 'Password123!' }),
  });
  assert.strictEqual(userLogin.status, 200);
  userToken = userLogin.body.access_token;
  assert.strictEqual(userLogin.body.user.role, 'user');

  // Crear usuario administrador para pruebas
  const adminReg = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Admin Autorizado',
      email: adminEmail,
      password: 'Password123!',
      birth_date: '1990-01-01',
      accepted_privacy_policy: true,
    }),
  });
  assert.strictEqual(adminReg.status, 201);
  adminId = adminReg.body.id;

  // Promover a admin directamente en base de datos autorizada
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [adminId]);

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: adminEmail, password: 'Password123!' }),
  });
  assert.strictEqual(adminLogin.status, 200);
  adminToken = adminLogin.body.access_token;
  assert.strictEqual(adminLogin.body.user.role, 'admin');

  // 2. PATCH /api/auth/profile rechaza/ignora modificación de rol
  await test('2. PATCH /api/auth/profile no permite que un usuario modifique su propio rol', async () => {
    const patchRes = await request('/auth/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        name: 'Usuario Nombre Actualizado',
        role: 'admin', // Intento de escalamiento
        isAdmin: true,
      }),
    });

    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.body.role, 'user');

    // Confirmar en PostgreSQL
    const checkDb = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    assert.strictEqual(checkDb.rows[0].role, 'user');
  });

  // 3. Usuario normal recibe 403 Forbidden en GET /api/users
  await test('3. GET /api/users bloquea a usuario normal con 403 Forbidden', async () => {
    const res = await request('/users', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error.includes('Acceso restringido'));
  });

  // 4. Usuario normal recibe 403 Forbidden en PATCH /api/users/:id
  await test('4. PATCH /api/users/:id bloquea intento de cambio de rol por usuario normal (403)', async () => {
    const res = await request(`/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ role: 'admin' }),
    });
    assert.strictEqual(res.status, 403);
  });

  // 5. Usuario normal recibe 403 Forbidden en POST /api/plans
  await test('5. POST /api/plans bloquea creación de planes por usuario normal (403)', async () => {
    const res = await request('/plans', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        name: 'Plan Hacker',
        slug: 'plan-hacker',
        duration_days: 365,
      }),
    });
    assert.strictEqual(res.status, 403);
  });

  // 6. Usuario normal recibe 403 Forbidden en POST /api/inventory-movements
  await test('6. POST /api/inventory-movements bloquea inventario a usuario normal (403)', async () => {
    const res = await request('/inventory-movements', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({
        product_id: 1,
        movement_type: 'in',
        quantity: 10,
        reason: 'Ajuste no autorizado',
      }),
    });
    assert.strictEqual(res.status, 403);
  });

  // 7. Usuario normal recibe 403 Forbidden en GET /api/audit-logs
  await test('7. GET /api/audit-logs bloquea consulta de auditoría a usuario normal (403)', async () => {
    const res = await request('/audit-logs', {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  // 8. Usuario normal recibe 403 Forbidden en verificación de pagos
  await test('8. PATCH /api/payments/:id/verify bloquea verificación a usuario normal (403)', async () => {
    const res = await request('/payments/1/verify', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userToken}` },
      body: JSON.stringify({ status: 'verified' }),
    });
    assert.strictEqual(res.status, 403);
  });

  // 9. Administrador autorizado sí puede acceder a GET /api/users
  await test('9. Administrador autorizado accede exitosamente a GET /api/users (200 OK)', async () => {
    const res = await request('/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  // 10. Administrador autorizado puede cambiar estado de usuario
  await test('10. Administrador autorizado puede modificar roles y estados (200 OK)', async () => {
    const res = await request(`/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ is_active: true }),
    });
    assert.strictEqual(res.status, 200);
  });

  // Limpieza de datos de prueba
  try {
    await pool.query('DELETE FROM consent_records WHERE user_id IN ($1, $2)', [userId, adminId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, adminId]);
  } catch (cleanErr) {
    console.error('Error en limpieza RBAC:', cleanErr.message);
  }

  await new Promise((resolve) => server.close(resolve));
  await pool.end();

  console.log('\n====================================================');
  console.log(`RESUMEN RBAC: ${passed} pasadas, ${failed} fallidas`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRbacTests().catch((err) => {
  console.error('Error no capturado en pruebas RBAC:', err);
  process.exit(1);
});
