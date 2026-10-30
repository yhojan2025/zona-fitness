const assert = require('assert');
const http = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const { getAppPool } = require('../src/config/db');
const { JWT_SECRET } = require('../src/middleware/auth');

async function runAdminAndSimulatedPurchaseTests() {
  console.log('========================================================================');
  console.log('PRUEBAS: COMPRA SIMULADA, MEMBRESÍAS ACTIVAS Y CONSOLA ADMINISTRATIVA');
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
  let userId = null;
  let secondaryUserId = null;
  let testMembershipId = null;

  try {
    // Asegurar que todos los planes oficiales estén activos antes de iniciar
    await pool.query('UPDATE plans SET is_active = true WHERE is_active = false;');

    // 1. Verificación de Precios Oficiales de los Planes
    await test('Los 4 planes oficiales tienen precios exactos y confirmados (Migration 004)', async () => {
      const res = await request('/plans');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 4);

      const planMap = {};
      res.body.forEach((p) => {
        planMap[p.slug] = p;
      });

      assert.strictEqual(parseFloat(planMap['cobre'].price), 45000.00);
      assert.strictEqual(planMap['cobre'].price_unconfirmed, false);

      assert.strictEqual(parseFloat(planMap['bronce'].price), 260000.00);
      assert.strictEqual(planMap['bronce'].price_unconfirmed, false);

      assert.strictEqual(parseFloat(planMap['platino'].price), 500000.00);
      assert.strictEqual(planMap['platino'].price_unconfirmed, false);

      assert.strictEqual(parseFloat(planMap['oro'].price), 900000.00);
      assert.strictEqual(planMap['oro'].price_unconfirmed, false);
    });

    // 2. Crear usuario regular de prueba
    const testEmail = `sim_user_${Date.now()}@zonafitness.test`;
    const password = 'PasswordSim123!';
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Usuario Simulado Principal',
        email: testEmail,
        password,
        phone: '3001234567',
        birth_date: '1995-05-15',
        accepted_privacy_policy: true,
      }),
    });
    assert.strictEqual(regRes.status, 201);
    userId = regRes.body.id;

    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password }),
    });
    assert.strictEqual(loginRes.status, 200);
    const userToken = loginRes.body.access_token;

    // 3. Usuario sin membresía activa
    await test('GET /api/memberships/my-active retorna mensaje claro cuando el usuario no tiene plan activo', async () => {
      const res = await request('/memberships/my-active', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.active, false);
      assert.strictEqual(res.body.membership, null);
      assert.strictEqual(res.body.message, 'AÚN NO TIENES UN PLAN ACTIVO');
    });

    // 4. Agregar Plan Platino al carrito y realizar Checkout Simulado
    await test('POST /api/orders/checkout-simulated ejecuta compra atómica con pedido, pago y activación de membresía', async () => {
      // Agregar al carrito
      const addRes = await request('/cart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ item_type: 'plan', item_id: 3, quantity: 1 }), // Platino
      });
      assert.strictEqual(addRes.status, 201);

      // Checkout simulado
      const checkoutRes = await request('/orders/checkout-simulated', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ notes: 'Compra simulada de prueba' }),
      });

      assert.strictEqual(checkoutRes.status, 201);
      assert.strictEqual(checkoutRes.body.success, true);
      assert.strictEqual(checkoutRes.body.order.status, 'approved');
      assert.strictEqual(checkoutRes.body.order.payment_method, 'simulacion');
      assert.strictEqual(parseFloat(checkoutRes.body.order.total_amount), 500000.00);
      assert.ok(checkoutRes.body.memberships.length > 0);
      testMembershipId = checkoutRes.body.memberships[0].id;

      // Verificar que el carrito quedó vacío
      const cartRes = await request('/cart', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.strictEqual(cartRes.status, 200);
      assert.strictEqual(cartRes.body.item_count, 0);
    });

    // 5. Consultar membresía activa tras la compra
    await test('GET /api/memberships/my-active retorna la membresía Platino activa con todos los campos requeridos', async () => {
      const res = await request('/memberships/my-active', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.active, true);
      const m = res.body.membership;
      assert.ok(m);
      assert.strictEqual(m.plan_name, 'Plan Platino');
      assert.strictEqual(m.status, 'active');
      assert.strictEqual(m.duration_days, 180);
      assert.strictEqual(m.duration, '6 meses');
      assert.strictEqual(m.price_registered, 500000);
      assert.strictEqual(m.payment_status, 'SIMULADO — SIN COBRO REAL');
      assert.strictEqual(m.is_simulated, true);
      assert.ok(m.days_remaining > 0);
      assert.ok(m.order_number);
    });

    // 6. Consultar historial de membresías
    await test('GET /api/memberships/my-history retorna el historial con la membresía adquirida', async () => {
      const res = await request('/memberships/my-history', {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.length >= 1);
      assert.strictEqual(res.body[0].plan_name, 'Platino');
      assert.strictEqual(res.body[0].is_simulated, true);
    });

    // 7. Seguridad: Usuario regular no puede acceder a las rutas de admin
    await test('Rutas /api/admin/* devuelven 403 Forbidden para usuarios regulares', async () => {
      const endpoints = [
        '/admin/metrics',
        '/admin/users',
        '/admin/plans',
        '/admin/memberships',
        '/admin/orders',
        '/admin/audit-logs',
        '/admin/config',
      ];

      for (const ep of endpoints) {
        const res = await request(ep, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        assert.strictEqual(res.status, 403, `Esperaba 403 en ${ep}`);
      }
    });

    // 8. Seguridad: Peticiones anónimas a /api/admin/* devuelven 401 Unauthorized
    await test('Rutas /api/admin/* devuelven 401 Unauthorized sin token', async () => {
      const res = await request('/admin/metrics');
      assert.strictEqual(res.status, 401);
    });

    // 9. Configuración del Token de Administrador
    const adminCheck = await pool.query("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1;");
    assert.ok(adminCheck.rows.length > 0, 'Debe existir un usuario administrador');
    const adminUser = adminCheck.rows[0];

    const adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 10. Métricas del Administrador
    await test('Administrador accede a /api/admin/metrics con datos reales y leyenda de simulación', async () => {
      const res = await request('/admin/metrics', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.users);
      assert.ok(res.body.users.total >= 1);
      assert.ok(res.body.memberships);
      assert.ok(res.body.memberships.active >= 1);
      assert.ok(res.body.orders);
      assert.ok(res.body.orders.approved >= 1);
      assert.ok(res.body.revenue);
      assert.ok(res.body.revenue.simulated_revenue >= 500000);
    });

    // 11. Búsqueda y filtrado de usuarios en Consola Administrativa
    await test('GET /api/admin/users filtra por texto de búsqueda y por estado de membresía', async () => {
      // Búsqueda por nombre
      const searchRes = await request(`/admin/users?q=Simulado`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(searchRes.status, 200);
      assert.ok(Array.isArray(searchRes.body));
      const found = searchRes.body.find((u) => u.id === userId);
      assert.ok(found, 'Debe encontrar al usuario por su nombre');
      assert.strictEqual(found.active_plan_name, 'Platino');
      assert.ok(found.days_remaining > 0);
      assert.strictEqual(found.membership_status_display, 'ACTIVA');

      // Filtro con membresía activa
      const activeFilterRes = await request(`/admin/users?filter=with_active_membership`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(activeFilterRes.status, 200);
      const foundActive = activeFilterRes.body.find((u) => u.id === userId);
      assert.ok(foundActive, 'Debe aparecer en el filtro de usuarios con membresía activa');

      // Filtro sin membresía
      const noMemFilterRes = await request(`/admin/users?filter=without_membership`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(noMemFilterRes.status, 200);
      const foundNoMem = noMemFilterRes.body.find((u) => u.id === userId);
      assert.strictEqual(foundNoMem, undefined, 'No debe aparecer en filtro sin membresía');
    });

    // 12. Detalle completo de usuario
    await test('GET /api/admin/users/:id retorna información integral, plan activo e historiales', async () => {
      const res = await request(`/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.user.id, userId);
      assert.strictEqual(res.body.user.email, testEmail);
      assert.ok(res.body.active_membership);
      assert.strictEqual(res.body.active_membership.plan_name, 'Platino');
      assert.ok(res.body.active_membership.days_remaining > 0);
      assert.ok(Array.isArray(res.body.memberships_history));
      assert.ok(Array.isArray(res.body.orders_history));
      assert.ok(Array.isArray(res.body.consents));
    });

    // 13. Actualización de datos personales con validación de unicidad y auditoría
    await test('PUT /api/admin/users/:id actualiza perfil con motivo y previene duplicidad de email', async () => {
      const updateRes = await request(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Usuario Simulado Modificado',
          email: testEmail,
          phone: '3119876543',
          birth_date: '1995-05-15',
          gender: 'masculino',
          emergency_contact: 'Hermano',
          emergency_phone: '3200000000',
          medical_notes: 'Sin alergias',
          reason: 'Actualización de teléfono por ventanilla',
        }),
      });

      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.body.success, true);
      assert.strictEqual(updateRes.body.user.name, 'Usuario Simulado Modificado');
      assert.strictEqual(updateRes.body.user.phone, '3119876543');

      // Intentar duplicar email existente debe fallar con 400 o 409
      const dupRes = await request(`/admin/users/${userId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Usuario Simulado Modificado',
          email: adminUser.email, // email ya en uso
          reason: 'Intento de duplicación',
        }),
      });
      assert.ok([400, 409].includes(dupRes.status), `Esperaba 400 o 409, obtuvo ${dupRes.status}`);
      assert.ok(dupRes.body.error.includes('en uso') || dupRes.body.error.includes('pertenece a otro usuario'));
    });

    // 14. Activar e Inactivar usuario con prevención de auto-desactivación
    await test('PATCH /api/admin/users/:id/status alterna estado de usuario y bloquea auto-inactivación de admin', async () => {
      // Inactivar usuario
      const deactRes = await request(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ is_active: false }),
      });
      assert.strictEqual(deactRes.status, 200);
      assert.strictEqual(deactRes.body.user.is_active, false);

      // Reactivar usuario
      const actRes = await request(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ is_active: true }),
      });
      assert.strictEqual(actRes.status, 200);
      assert.strictEqual(actRes.body.user.is_active, true);

      // Auto-inactivación del administrador debe fallar
      const selfRes = await request(`/admin/users/${adminUser.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ is_active: false }),
      });
      assert.strictEqual(selfRes.status, 400);
      assert.ok(selfRes.body.error.includes('No puedes'));
    });

    // 15. Eliminación lógica segura y preservación de pedidos/pagos
    await test('DELETE /api/admin/users/:id ejecuta baja lógica, preservando registros de pedidos', async () => {
      // Crear un usuario secundario con compra para probar soft delete
      const secEmail = `sec_user_${Date.now()}@zonafitness.test`;
      const secReg = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Usuario Para Baja Logica',
          email: secEmail,
          password: 'PasswordSec123!',
          phone: '3009998877',
          birth_date: '1998-08-20',
          accepted_privacy_policy: true,
        }),
      });
      secondaryUserId = secReg.body.id;

      const secLogin = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: secEmail, password: 'PasswordSec123!' }),
      });
      const secToken = secLogin.body.access_token;

      // Realizar compra
      await request('/cart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secToken}` },
        body: JSON.stringify({ item_type: 'plan', item_id: 1, quantity: 1 }), // Cobre
      });
      await request('/orders/checkout-simulated', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secToken}` },
        body: JSON.stringify({ notes: 'Compra para prueba de baja lógica' }),
      });

      // Admin ejecuta baja lógica
      const delRes = await request(`/admin/users/${secondaryUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason: 'Solicitud formal de derecho de supresión de cuenta' }),
      });

      assert.strictEqual(delRes.status, 200);
      assert.strictEqual(delRes.body.success, true);
      assert.ok(delRes.body.message.includes('baja de forma lógica'));

      // Verificar en base de datos que deleted_at está establecido e is_active es false
      const checkUser = await pool.query('SELECT is_active, deleted_at, deleted_by FROM users WHERE id = $1;', [secondaryUserId]);
      assert.strictEqual(checkUser.rows[0].is_active, false);
      assert.ok(checkUser.rows[0].deleted_at !== null);
      assert.strictEqual(checkUser.rows[0].deleted_by, adminUser.id);

      // Verificar que los pedidos y pagos siguen existiendo intactos
      const checkOrders = await pool.query('SELECT count(*) FROM orders WHERE user_id = $1;', [secondaryUserId]);
      assert.ok(parseInt(checkOrders.rows[0].count) >= 1, 'Los pedidos deben preservarse');

      // Auto-eliminación del administrador debe fallar
      const selfDel = await request(`/admin/users/${adminUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason: 'Intento auto-eliminación' }),
      });
      assert.strictEqual(selfDel.status, 400);
    });

    // 16. Gestión de Membresías y modificación con motivo obligatorio
    await test('PATCH /api/admin/memberships/:id modifica fecha/estado exigiendo motivo obligatorio y registra evento', async () => {
      // Modificar sin motivo debe fallar
      const failRes = await request(`/admin/memberships/${testMembershipId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          end_date: '2027-01-01',
          status: 'active',
          reason: '', // vacío
        }),
      });
      assert.strictEqual(failRes.status, 400);

      // Modificar con motivo válido
      const okRes = await request(`/admin/memberships/${testMembershipId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          end_date: '2027-01-15',
          status: 'active',
          notes: 'Extensión autorizada de 15 días adicionales',
          reason: 'Compensación por mantenimiento de instalaciones',
        }),
      });

      assert.strictEqual(okRes.status, 200);
      assert.strictEqual(okRes.body.success, true);

      // Verificar registro en membership_events
      const eventCheck = await pool.query(
        'SELECT * FROM membership_events WHERE membership_id = $1 ORDER BY id DESC LIMIT 1;',
        [testMembershipId]
      );
      assert.ok(eventCheck.rows.length > 0);
      assert.ok(
        ['renewed', 'reactivated', 'status_change', 'ADMIN_UPDATE'].includes(eventCheck.rows[0].event_type),
        `Tipo de evento registrado: ${eventCheck.rows[0].event_type}`
      );
    });

    // 17. Gestión de Planes: Modificar precio y duración con registro en plan_price_history
    await test('PUT /api/admin/plans/:id registra cambios en plan_price_history sin alterar compras pasadas', async () => {
      const planRes = await request('/admin/plans', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const cobre = planRes.body.find((p) => p.slug === 'cobre');
      assert.ok(cobre);
      const originalPrice = parseFloat(cobre.price);

      // Actualizar plan Cobre a 50.000 COP y 20 días
      const updatePlanRes = await request(`/admin/plans/${cobre.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Cobre Renovado',
          price: 50000,
          duration_days: 20,
          description: 'Plan Cobre con nueva tarifa y duración',
          reason: 'Ajuste anual de tarifas de prueba',
        }),
      });

      assert.strictEqual(updatePlanRes.status, 200);
      assert.strictEqual(updatePlanRes.body.success, true);
      assert.strictEqual(parseFloat(updatePlanRes.body.plan.price), 50000);
      assert.strictEqual(updatePlanRes.body.plan.duration_days, 20);

      // Consultar historial del plan
      const historyRes = await request(`/admin/plans/${cobre.id}/history`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(historyRes.status, 200);
      assert.ok(Array.isArray(historyRes.body));
      assert.ok(historyRes.body.length >= 1);
      assert.strictEqual(parseFloat(historyRes.body[0].new_price), 50000);
      assert.strictEqual(historyRes.body[0].new_duration_days, 20);

      // Restaurar plan Cobre a sus valores oficiales (45.000 COP y 15 días)
      await request(`/admin/plans/${cobre.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Cobre',
          price: 45000,
          duration_days: 15,
          description: 'Plan de 15 días',
          reason: 'Restauración de tarifa oficial',
        }),
      });
    });

    // 18. Plan inactivo no se puede comprar ni agregar al carrito
    await test('Plan desactivado no puede ser adquirido en el catálogo ni agregado al carrito', async () => {
      const planRes = await request('/admin/plans', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const bronce = planRes.body.find((p) => p.slug === 'bronce');

      // Desactivar plan Bronce
      const toggleRes = await request(`/admin/plans/${bronce.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ is_active: false }),
      });
      assert.strictEqual(toggleRes.status, 200);
      assert.strictEqual(toggleRes.body.plan.is_active, false);

      // Intentar agregar al carrito como cliente debe fallar
      const cartFail = await request('/cart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ item_type: 'plan', item_id: bronce.id, quantity: 1 }),
      });
      assert.ok([400, 404].includes(cartFail.status), `Esperaba 400 o 404, obtuvo ${cartFail.status}`);
      assert.ok(
        cartFail.body.error.includes('disponible') || cartFail.body.error.includes('no existe'),
        `Error recibido: ${cartFail.body.error}`
      );

      // Reactivar plan Bronce
      await request(`/admin/plans/${bronce.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ is_active: true }),
      });
    });

    // 19. Consulta de Configuración del Sistema
    await test('GET /api/admin/config retorna información del motor PostgreSQL 18 y políticas de seguridad', async () => {
      const res = await request('/admin/config', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.application, 'ZONA FITNESS Core API');
      assert.ok(res.body.database);
      assert.strictEqual(res.body.database.connected_db, 'zona_fitness_db');
      assert.strictEqual(res.body.security_policies.payment_mode, 'SIMULACIÓN — SIN COBRO REAL');
    });

    // Limpieza de datos de prueba
    if (secondaryUserId) {
      await pool.query('DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);', [secondaryUserId]);
      await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);', [secondaryUserId]);
      await pool.query('DELETE FROM memberships WHERE user_id = $1;', [secondaryUserId]);
      await pool.query('DELETE FROM orders WHERE user_id = $1;', [secondaryUserId]);
      await pool.query('DELETE FROM cart_items WHERE user_id = $1;', [secondaryUserId]);
      await pool.query('DELETE FROM audit_logs WHERE performed_by = $1;', [secondaryUserId]);
      await pool.query('DELETE FROM consent_records WHERE user_id = $1;', [secondaryUserId]);
      await pool.query('DELETE FROM profiles WHERE user_id = $1;', [secondaryUserId]);
      await pool.query('DELETE FROM users WHERE id = $1;', [secondaryUserId]);
    }

    if (userId) {
      await pool.query('DELETE FROM membership_events WHERE membership_id = $1;', [testMembershipId]);
      await pool.query('DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);', [userId]);
      await pool.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1);', [userId]);
      await pool.query('DELETE FROM memberships WHERE user_id = $1;', [userId]);
      await pool.query('DELETE FROM orders WHERE user_id = $1;', [userId]);
      await pool.query('DELETE FROM cart_items WHERE user_id = $1;', [userId]);
      await pool.query('DELETE FROM audit_logs WHERE performed_by = $1 OR (table_name = $2 AND record_id = $3);', [userId, 'users', userId]);
      await pool.query('DELETE FROM consent_records WHERE user_id = $1;', [userId]);
      await pool.query('DELETE FROM profiles WHERE user_id = $1;', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1;', [userId]);
    }

    // Asegurar que todos los planes oficiales queden activos
    await pool.query('UPDATE plans SET is_active = true WHERE is_active = false;');

  } finally {
    server.close();
  }

  console.log('\n----------------------------------------------------');
  console.log(`TOTAL PRUEBAS: ${passed + failed} | PASADAS: ${passed} | FALLIDAS: ${failed}`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAdminAndSimulatedPurchaseTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error general en pruebas:', err);
      process.exit(1);
    });
}

module.exports = runAdminAndSimulatedPurchaseTests;
