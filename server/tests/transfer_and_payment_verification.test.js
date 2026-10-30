const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const { getAppPool } = require('../src/config/db');
const { JWT_SECRET } = require('../src/middleware/auth');

async function runTransferAndVerificationTests() {
  console.log('========================================================================');
  console.log('PRUEBAS: TRANSFERENCIA BANCARIA, VERIFICACIÓN DE PAGOS Y ACCIONES ADMIN');
  console.log('========================================================================\n');

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
    return { status: res.status, body, headers: res.headers };
  }

  const pool = getAppPool();
  let userA = null;
  let userB = null;
  let userAToken = null;
  let userBToken = null;
  let adminUser = null;
  let adminToken = null;
  let transferPaymentId = null;
  let transferOrderId = null;

  try {
    // 0. Obtener admin existente
    const adminCheck = await pool.query("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1;");
    assert.ok(adminCheck.rows.length > 0, 'Debe existir un usuario administrador');
    adminUser = adminCheck.rows[0];
    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Crear Usuario A
    const emailA = `client_a_${Date.now()}@zonafitness.test`;
    const regARes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cliente Transferencia A',
        email: emailA,
        password: 'Password123!',
        phone: '3011112233',
        birth_date: '1996-03-10',
        accepted_privacy_policy: true,
      }),
    });
    assert.strictEqual(regARes.status, 201);
    userA = regARes.body;

    const loginARes = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'Password123!' }),
    });
    userAToken = loginARes.body.access_token;

    // Crear Usuario B
    const emailB = `client_b_${Date.now()}@zonafitness.test`;
    const regBRes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cliente Transferencia B',
        email: emailB,
        password: 'Password123!',
        phone: '3022223344',
        birth_date: '1994-07-20',
        accepted_privacy_policy: true,
      }),
    });
    assert.strictEqual(regBRes.status, 201);
    userB = regBRes.body;

    const loginBRes = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'Password123!' }),
    });
    userBToken = loginBRes.body.access_token;

    // 1. Una transferencia sin comprobante no puede enviarse
    await test('1. Una transferencia sin comprobante es rechazada (400)', async () => {
      // Agregar ítem al carrito de Usuario A
      await request('/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAToken}`,
        },
        body: JSON.stringify({ item_type: 'plan', item_id: 1, quantity: 1 }), // Cobre
      });

      // Enviar checkout de transferencia sin archivo (FormData vacío)
      const formWithoutFile = new FormData();
      formWithoutFile.append('notes', 'Transferencia sin foto adjunta');

      const res = await request('/orders/checkout-transfer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: formWithoutFile,
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('obligatorio'));
    });

    // 2. Un comprobante con formato o contenido inválido es rechazado
    await test('2. Un comprobante inválido (falso jpg sin magic bytes de imagen) es rechazado (400)', async () => {
      const fakeExecutableBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00FakePEFileContenidoMaliciosoTexto');
      const fakeBlob = new Blob([fakeExecutableBuffer], { type: 'image/jpeg' });

      const formWithFakeFile = new FormData();
      formWithFakeFile.append('notes', 'Archivo disfrazado');
      formWithFakeFile.append('receipt', fakeBlob, 'comprobante_falso.jpg');

      const res = await request('/orders/checkout-transfer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: formWithFakeFile,
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('Formato de archivo inválido'));
    });

    // 3. Envío exitoso de comprobante real en JPG/PNG y registro con pending_verification
    // Creamos un JPEG válido mínimo: FF D8 FF E0 00 10 4A 46 49 46 00 01
    const validJpgHeader = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0xff, 0xd9
    ]);
    const validBlob = new Blob([validJpgHeader], { type: 'image/jpeg' });

    await test('3. Cliente envía comprobante válido; pago queda en pending_verification y pedido en pending_verification', async () => {
      const validForm = new FormData();
      validForm.append('notes', 'Transferencia Bancolombia #942-000123-45');
      validForm.append('receipt', validBlob, 'comprobante_bancolombia.jpg');

      const res = await request('/orders/checkout-transfer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
        body: validForm,
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(
        res.body.message,
        'Tu comprobante fue recibido correctamente. Tu pago está pendiente de verificación por parte del administrador. Tu membresía se activará una vez confirmado el pago.'
      );
      assert.strictEqual(res.body.order.status, 'pending_verification');
      assert.strictEqual(res.body.payment.status, 'pending_verification');
      assert.strictEqual(res.body.payment.payment_method, 'transferencia');

      transferPaymentId = res.body.payment.id;
      transferOrderId = res.body.order.id;

      // El carrito del cliente debe quedar vacío
      const cartCheck = await request('/cart', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert.strictEqual(cartCheck.body.item_count, 0);
    });

    // 4. Regla fundamental: una transferencia pendiente NO activa membresías
    await test('4. Una transferencia pendiente de verificación NO activa membresías para el cliente', async () => {
      const memRes = await request('/memberships/my-active', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert.strictEqual(memRes.status, 200);
      assert.strictEqual(memRes.body.active, false);
      assert.strictEqual(memRes.body.membership, null);
      assert.strictEqual(memRes.body.message, 'AÚN NO TIENES UN PLAN ACTIVO');

      // Comprobar en base de datos directamente
      const dbMemCount = await pool.query('SELECT COUNT(*)::int AS count FROM memberships WHERE user_id = $1;', [userA.id]);
      assert.strictEqual(dbMemCount.rows[0].count, 0, 'No debe existir ninguna membresía insertada');
    });

    // 5. Un cliente normal no puede aprobar su propio pago
    await test('5. Un cliente normal no puede aprobar su propio pago (403 Forbidden)', async () => {
      const res = await request(`/admin/payments/${transferPaymentId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    // 6. Un cliente no puede consultar comprobantes de otros usuarios
    await test('6. Un cliente no puede consultar comprobantes ajenos (403 Forbidden)', async () => {
      const res = await request(`/payments/${transferPaymentId}/receipt`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    // 7. El propietario del pago puede consultar su propio comprobante
    await test('7. El propietario del pago puede consultar su propio comprobante protegido (200 OK)', async () => {
      const res = await request(`/payments/${transferPaymentId}/receipt`, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert.strictEqual(res.status, 200);
    });

    // 8. Un administrador autorizado puede consultar el comprobante para verificarlo
    await test('8. Administrador autorizado puede consultar el comprobante para verificación (200 OK)', async () => {
      const res = await request(`/payments/${transferPaymentId}/receipt`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
    });

    // 9. Administrador consulta lista de pagos pendientes de verificación
    await test('9. GET /api/admin/payments lista pagos pendientes con comprobante y datos de usuario', async () => {
      const res = await request('/admin/payments?status=pending_verification', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      const targetPay = res.body.find((p) => p.id === transferPaymentId);
      assert.ok(targetPay, 'Debe figurar el pago por transferencia en pendientes');
      assert.strictEqual(targetPay.status, 'pending_verification');
      assert.strictEqual(targetPay.user_email, emailA);
      assert.ok(targetPay.receipt_path);
      assert.ok(targetPay.plan_name);
    });

    // 10. Aprobación del pago por transferencia: activa exactamente una membresía
    await test('10. Administrador aprueba pago: estado pasa a approved y activa exactamente una membresía', async () => {
      const approveRes = await request(`/admin/payments/${transferPaymentId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(approveRes.status, 200);
      assert.strictEqual(approveRes.body.success, true);
      assert.strictEqual(approveRes.body.payment.status, 'approved');
      assert.strictEqual(approveRes.body.payment.verified_by, adminUser.id);
      assert.ok(approveRes.body.memberships.length === 1);

      // Ahora el cliente sí tiene membresía activa en Mi Cuenta
      const activeMemRes = await request('/memberships/my-active', {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert.strictEqual(activeMemRes.status, 200);
      assert.strictEqual(activeMemRes.body.active, true);
      assert.strictEqual(activeMemRes.body.membership.status, 'active');
      assert.strictEqual(activeMemRes.body.membership.is_simulated, false);
      assert.ok(activeMemRes.body.membership.days_remaining > 0);
    });

    // 11. Idempotencia y protección transaccional: un pago no puede aprobarse dos veces
    await test('11. Un pago previamente aprobado no puede volver a aprobarse (400)', async () => {
      const repeatRes = await request(`/admin/payments/${transferPaymentId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(repeatRes.status, 400);
      assert.ok(repeatRes.body.error.includes('procesado previamente'));

      // Verificar que no se duplicaron membresías
      const checkMems = await pool.query('SELECT COUNT(*)::int AS count FROM memberships WHERE order_id = $1;', [transferOrderId]);
      assert.strictEqual(checkMems.rows[0].count, 1, 'Debe haber exactamente 1 membresía generada');
    });

    // 12. Rechazo de pago por transferencia: exige motivo y NO activa ninguna membresía
    let rejectedPaymentId = null;
    await test('12. Administrador rechaza pago con motivo: estado pasa a rejected y NO activa membresía', async () => {
      // Cliente B agrega plan y envía comprobante
      await request('/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userBToken}`,
        },
        body: JSON.stringify({ item_type: 'plan', item_id: 2, quantity: 1 }), // Bronce
      });

      const formB = new FormData();
      formB.append('notes', 'Transferencia de prueba para rechazo');
      formB.append('receipt', validBlob, 'comprobante_b.jpg');

      const submitB = await request('/orders/checkout-transfer', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userBToken}` },
        body: formB,
      });
      assert.strictEqual(submitB.status, 201);
      rejectedPaymentId = submitB.body.payment.id;

      // Intentar rechazar sin motivo debe fallar
      const failReject = await request(`/admin/payments/${rejectedPaymentId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reason: '' }),
      });
      assert.strictEqual(failReject.status, 400);

      // Rechazar con motivo válido
      const okReject = await request(`/admin/payments/${rejectedPaymentId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reason: 'Comprobante borroso y sin número de aprobación legible.' }),
      });
      assert.strictEqual(okReject.status, 200);
      assert.strictEqual(okReject.body.payment.status, 'rejected');
      assert.strictEqual(okReject.body.payment.rejection_reason, 'Comprobante borroso y sin número de aprobación legible.');

      // Verificar que el cliente B no tiene membresía
      const memBCheck = await request('/memberships/my-active', {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      assert.strictEqual(memBCheck.body.active, false);
      assert.strictEqual(memBCheck.body.membership, null);
    });

    // 13. Selección múltiple y acciones masivas: activación e inactivación
    await test('13. POST /api/admin/users/bulk-status ejecuta activación e inactivación masiva con reporte', async () => {
      const bulkRes = await request('/admin/users/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          user_ids: [userA.id, userB.id],
          is_active: false,
          reason: 'Inactivación masiva de prueba',
        }),
      });

      assert.strictEqual(bulkRes.status, 200);
      assert.strictEqual(bulkRes.body.success, true);
      assert.strictEqual(bulkRes.body.count, 2);
      assert.ok(bulkRes.body.processed.includes(userA.id));
      assert.ok(bulkRes.body.processed.includes(userB.id));

      // Reactivar
      const reactivateRes = await request('/admin/users/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          user_ids: [userA.id, userB.id],
          is_active: true,
          reason: 'Reactivación masiva de prueba',
        }),
      });
      assert.strictEqual(reactivateRes.status, 200);
      assert.strictEqual(reactivateRes.body.count, 2);
    });

    // 14. Seguridad en acciones masivas: el administrador no puede desactivarse ni eliminarse a sí mismo
    await test('14. Acciones masivas protegen la cuenta del administrador en sesión (se omite de la operación)', async () => {
      const selfProtectRes = await request('/admin/users/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          user_ids: [adminUser.id, userA.id],
          is_active: false,
          reason: 'Intento de auto-desactivación en lote',
        }),
      });

      assert.strictEqual(selfProtectRes.status, 200);
      assert.ok(selfProtectRes.body.omitted.some((o) => o.id === adminUser.id));
      assert.ok(selfProtectRes.body.processed.includes(userA.id));

      // Comprobar que el admin sigue activo
      const checkAdmin = await pool.query('SELECT is_active FROM users WHERE id = $1', [adminUser.id]);
      assert.strictEqual(checkAdmin.rows[0].is_active, true);
    });

    // 15. Eliminación lógica masiva segura: preserva registros de auditoría y pedidos
    await test('15. POST /api/admin/users/bulk-delete aplica baja lógica protegida preservando registros', async () => {
      const bulkDelRes = await request('/admin/users/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          user_ids: [userB.id],
          reason: 'Baja lógica masiva de prueba',
        }),
      });

      assert.strictEqual(bulkDelRes.status, 200);
      assert.strictEqual(bulkDelRes.body.success, true);
      assert.ok(bulkDelRes.body.processed.includes(userB.id));

      // Comprobar en base de datos: deleted_at establecido, pedidos intactos
      const checkUserB = await pool.query('SELECT is_active, deleted_at, deleted_by FROM users WHERE id = $1', [userB.id]);
      assert.strictEqual(checkUserB.rows[0].is_active, false);
      assert.ok(checkUserB.rows[0].deleted_at !== null);
      assert.strictEqual(checkUserB.rows[0].deleted_by, adminUser.id);

      const checkOrdersB = await pool.query('SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1', [userB.id]);
      assert.ok(checkOrdersB.rows[0].count >= 1, 'Los pedidos de usuario B deben preservarse');
    });

    // Limpieza de datos de prueba
    const cleanupIds = [userA?.id, userB?.id].filter(Boolean);
    for (const uid of cleanupIds) {
      await pool.query('DELETE FROM membership_events WHERE membership_id IN (SELECT id FROM memberships WHERE user_id = $1);', [uid]);
      await pool.query('DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);', [uid]);
      await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);', [uid]);
      await pool.query('DELETE FROM memberships WHERE user_id = $1;', [uid]);
      await pool.query('DELETE FROM orders WHERE user_id = $1;', [uid]);
      await pool.query('DELETE FROM cart_items WHERE user_id = $1;', [uid]);
      await pool.query('DELETE FROM audit_logs WHERE performed_by = $1 OR (table_name = $2 AND record_id = $3);', [uid, 'users', uid]);
      await pool.query('DELETE FROM consent_records WHERE user_id = $1;', [uid]);
      await pool.query('DELETE FROM profiles WHERE user_id = $1;', [uid]);
      await pool.query('DELETE FROM members WHERE user_id = $1;', [uid]);
      await pool.query('DELETE FROM users WHERE id = $1;', [uid]);
    }

  } finally {
    server.close();
  }

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL PRUEBAS TRANSFERENCIA Y VERIFICACIÓN: ${passed + failed}`);
  console.log(`PASADAS: ${passed} | FALLIDAS: ${failed}`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTransferAndVerificationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error general en pruebas de transferencia y verificación:', err);
      process.exit(1);
    });
}

module.exports = runTransferAndVerificationTests;
