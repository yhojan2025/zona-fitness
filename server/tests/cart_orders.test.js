const assert = require('assert');
const http = require('http');
const bcrypt = require('bcryptjs');
const app = require('../src/server');
const { getAppPool } = require('../src/config/db');

async function runCartAndOrdersTests() {
  console.log('====================================================');
  console.log('EJECUTANDO PRUEBAS DE CARRITO Y PEDIDOS (BACKEND)');
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

  // Helper para crear usuarios de prueba
  async function createTestUser(email, password = 'Password123!', role = 'user') {
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Cart User',
        email,
        password,
        birth_date: '1995-05-15',
        accepted_privacy_policy: true,
      }),
    });
    assert.strictEqual(regRes.status, 201, `Error en registro: ${JSON.stringify(regRes.body)}`);

    if (role !== 'user') {
      await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, regRes.body.id]);
    }

    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    assert.strictEqual(loginRes.status, 200, `Error en login: ${JSON.stringify(loginRes.body)}`);

    return {
      id: regRes.body.id,
      email,
      token: loginRes.body.access_token,
    };
  }

  const userA = await createTestUser(`cart.userA.${Date.now()}@zonafit.test`);
  const userB = await createTestUser(`cart.userB.${Date.now()}@zonafit.test`);

  // Obtener planes y productos existentes
  const plansRes = await request('/plans');
  assert.strictEqual(plansRes.status, 200);
  const testPlan = plansRes.body[0];
  assert.ok(testPlan, 'Debe existir al menos un plan');

  const productsRes = await request('/products');
  assert.strictEqual(productsRes.status, 200);
  const testProduct = productsRes.body[0];

  let cartItemId = null;

  // 1. GET /api/cart sin autenticación rechaza con 401
  await test('1. GET /api/cart sin token retorna 401 Unauthorized', async () => {
    const res = await request('/cart');
    assert.strictEqual(res.status, 401);
  });

  // 2. GET /api/cart con autenticación retorna estructura vacía
  await test('2. GET /api/cart para usuario nuevo retorna carrito vacío', async () => {
    const res = await request('/cart', {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.item_count, 0);
    assert.strictEqual(res.body.subtotal, 0);
    assert.deepStrictEqual(res.body.items, []);
  });

  // 3. POST /api/cart valida item_type inválido
  await test('3. POST /api/cart con tipo inválido retorna 400', async () => {
    const res = await request('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ item_type: 'invalid', item_id: 1, quantity: 1 }),
    });
    assert.strictEqual(res.status, 400);
  });

  // 4. POST /api/cart agrega un plan exitosamente
  await test('4. POST /api/cart agrega un plan comercial', async () => {
    const res = await request('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ item_type: 'plan', item_id: testPlan.id, quantity: 1 }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.item_type, 'plan');
    assert.strictEqual(res.body.item_id, testPlan.id);
    assert.strictEqual(res.body.quantity, 1);
    cartItemId = res.body.id;
  });

  // 5. GET /api/cart refleja el ítem agregado y calcula totales en servidor
  await test('5. GET /api/cart calcula subtotales y estado de precios en el servidor', async () => {
    const res = await request('/cart', {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.item_count, 1);
    assert.strictEqual(res.body.items.length, 1);
    const item = res.body.items[0];
    assert.strictEqual(item.item_id, testPlan.id);
    if (testPlan.price_unconfirmed) {
      assert.strictEqual(res.body.has_unconfirmed_prices, true);
      assert.strictEqual(res.body.can_checkout, false);
      assert.strictEqual(item.price_unconfirmed, true);
    }
  });

  // 6. PATCH /api/cart/:id actualiza cantidad
  await test('6. PATCH /api/cart/:id actualiza la cantidad correctamente', async () => {
    const res = await request(`/cart/${cartItemId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ quantity: 2 }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.quantity, 2);
  });

  // 7. Aislamiento e IDOR: Usuario B no puede modificar el carrito de Usuario A
  await test('7. IDOR: Usuario B no puede modificar ítems del carrito de Usuario A', async () => {
    const res = await request(`/cart/${cartItemId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({ quantity: 5 }),
    });
    assert.strictEqual(res.status, 404);
  });

  // 8. IDOR: Usuario B ve su carrito vacío independientemente de Usuario A
  await test('8. Carrito de Usuario B permanece independiente y vacío', async () => {
    const res = await request('/cart', {
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.item_count, 0);
  });

  // 9. Si el ítem tiene precio no confirmado, POST /api/orders lo rechaza con 400
  await test('9. POST /api/orders rechaza pedidos si hay artículos con precio por confirmar', async () => {
    if (testPlan.price_unconfirmed) {
      const res = await request('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${userA.token}` },
        body: JSON.stringify({ payment_method: 'nequi' }),
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error.includes('precio por confirmar'));
    } else {
      console.log('   (Plan tiene precio confirmado; validación no aplicable para este caso)');
    }
  });

  // 10. DELETE /api/cart/:id elimina un artículo específico
  await test('10. DELETE /api/cart/:id elimina el artículo del carrito', async () => {
    const res = await request(`/cart/${cartItemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.strictEqual(res.status, 200);

    const check = await request('/cart', {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.strictEqual(check.body.item_count, 0);
  });

  // 11. DELETE /api/cart vacía el carrito
  await test('11. DELETE /api/cart vacía completamente el carrito', async () => {
    // Agregar un ítem primero
    await request('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ item_type: 'plan', item_id: testPlan.id, quantity: 1 }),
    });
    const res = await request('/cart', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.strictEqual(res.status, 200);

    const check = await request('/cart', {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.strictEqual(check.body.item_count, 0);
  });

  // 12. GET /api/orders retorna lista de pedidos del usuario
  await test('12. GET /api/orders retorna lista para usuario autenticado', async () => {
    const res = await request('/orders', {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  // Limpieza de usuarios de prueba
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id IN ($1, $2)', [userA.id, userB.id]);
    await pool.query('DELETE FROM orders WHERE user_id IN ($1, $2)', [userA.id, userB.id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userA.id, userB.id]);
  } catch (cleanErr) {
    console.error('Error en limpieza:', cleanErr.message);
  }

  await new Promise((resolve) => server.close(resolve));
  await pool.end();

  console.log('\n====================================================');
  console.log(`RESUMEN: ${passed} pasadas, ${failed} fallidas`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCartAndOrdersTests().catch((err) => {
  console.error('Error no capturado en pruebas de carrito/pedidos:', err);
  process.exit(1);
});
