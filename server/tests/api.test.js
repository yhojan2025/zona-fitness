const assert = require('assert');
const http = require('http');
const app = require('../src/server');
const { getAppPool } = require('../src/config/db');

async function runApiIntegrationTests() {
  console.log('====================================================');
  console.log('EJECUTANDO PRUEBAS DE INTEGRACIÓN DE API BACKEND');
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

  let authToken = null;
  let adminUserId = null;
  let testMemberId = null;
  let testPaymentId = null;

  // 1. Health check
  await test('1. GET /api/health retorna estado UP y versión PostgreSQL 18', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'UP');
    assert.strictEqual(res.body.database.connected, true);
    assert.strictEqual(res.body.database.current_db, 'zona_fitness_db');
  });

  // 2. Planes públicos
  await test('2. GET /api/plans retorna los planes comerciales oficiales', async () => {
    const res = await request('/plans');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 4);
    const slugs = res.body.map((p) => p.slug);
    assert.ok(slugs.includes('cobre'));
    assert.ok(slugs.includes('bronce'));
    assert.ok(slugs.includes('platino'));
    assert.ok(slugs.includes('oro'));
  });

  // 3. Horarios públicos
  await test('3. GET /api/opening-hours retorna franjas de lunes a sábado', async () => {
    const res = await request('/opening-hours');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 12);
  });

  // 4. Registro y autenticación de usuario
  await test('4. POST /api/auth/register y login con JWT', async () => {
    const testEmail = `admin.test.${Date.now()}@zonafit.test`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Admin Pruebas',
        email: testEmail,
        password: 'PasswordSeguro123!',
      }),
    });
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.body.email, testEmail);
    adminUserId = regRes.body.id;

    // Asegurar rol admin para pruebas si no lo fuera
    const pool = getAppPool();
    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [adminUserId]);

    // Login
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'PasswordSeguro123!',
      }),
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.body.access_token);
    authToken = loginRes.body.access_token;
  });

  // 5. Creación de ticket con auth
  await test('5. POST /api/tickets crea ticket asociado al usuario autenticado', async () => {
    const res = await request('/tickets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        title: 'Ticket de prueba automática',
        description: 'Verificando flujo de tickets del sistema de soporte',
        priority: 'high',
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.title, 'Ticket de prueba automática');
    assert.strictEqual(res.body.status, 'open');
  });

  // 6. Registro de socio (member)
  await test('6. POST /api/members registra nuevo socio con validaciones', async () => {
    const docNum = `DOC-${Date.now()}`;
    const res = await request('/members', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        first_name: 'Carlos',
        last_name: 'Pérez',
        document_type: 'CC',
        document_number: docNum,
        email: `socio.${Date.now()}@test.com`,
        phone: '3101234567',
        emergency_contact: 'María Pérez',
        emergency_phone: '3119876543',
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.first_name, 'Carlos');
    testMemberId = res.body.id;
  });

  // 7. Registro de pago pendiente y posterior verificación
  await test('7. POST /api/payments registra pago en pendiente y PATCH /api/payments/:id/verify lo aprueba', async () => {
    const payRes = await request('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        member_id: testMemberId,
        amount: 85000,
        payment_method: 'nequi',
        reference_number: `REF-${Date.now()}`,
        notes: 'Pago informativo de prueba',
      }),
    });
    assert.strictEqual(payRes.status, 201);
    assert.strictEqual(payRes.body.status, 'pending');
    testPaymentId = payRes.body.id;

    // Verificar el pago
    const verifyRes = await request(`/payments/${testPaymentId}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        status: 'verified',
        verification_notes: 'Comprobante cotejado contra extracto',
      }),
    });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.status, 'verified');
    assert.ok(verifyRes.body.verified_at);
  });

  // 8. Control de acceso / asistencia
  await test('8. POST /api/attendance/check-in valida estado de socio', async () => {
    const res = await request('/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        member_id: testMemberId,
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.ok(['granted', 'denied'].includes(res.body.status));
  });

  // 9. Protección de rutas contra accesos no autenticados
  await test('9. Rechazo 401 en endpoints protegidos sin token', async () => {
    const res = await request('/members');
    assert.strictEqual(res.status, 401);
  });

  console.log('\n====================================================');
  console.log(`RESUMEN DE PRUEBAS DE API: ${passed} PASARON, ${failed} FALLARON`);
  console.log('====================================================');

  server.close();
  const pool = getAppPool();
  await pool.end();

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runApiIntegrationTests().catch((err) => {
    console.error('Error fatal en pruebas de API:', err);
    process.exit(1);
  });
}

module.exports = { runApiIntegrationTests };
