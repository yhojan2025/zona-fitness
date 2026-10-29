const express = require('express');
const { getAppPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/orders - Historial de pedidos del usuario autenticado
router.get('/', authenticateToken, async (req, res) => {
  const pool = getAppPool();
  try {
    const ordersRes = await pool.query(
      `SELECT o.id, o.order_number, o.user_id, o.status, o.total_amount, o.payment_method, o.notes, o.created_at, o.updated_at
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    // Obtener los artículos de cada pedido
    const ordersWithItems = [];
    for (const order of ordersRes.rows) {
      const itemsRes = await pool.query(
        `SELECT id, item_type, item_id, item_name, unit_price, quantity, subtotal
         FROM order_items
         WHERE order_id = $1`,
        [order.id]
      );
      ordersWithItems.push({
        ...order,
        items: itemsRes.rows,
      });
    }

    res.json(ordersWithItems);
  } catch (err) {
    console.error('[ERROR GET /api/orders]:', err.message);
    res.status(500).json({ error: 'Error al consultar el historial de pedidos' });
  }
});

// GET /api/orders/:id - Detalle de un pedido específico
router.get('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const pool = getAppPool();

  try {
    const orderRes = await pool.query(
      `SELECT o.id, o.order_number, o.user_id, o.status, o.total_amount, o.payment_method, o.notes, o.created_at, o.updated_at
       FROM orders o
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.user.id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const order = orderRes.rows[0];
    const itemsRes = await pool.query(
      `SELECT id, item_type, item_id, item_name, unit_price, quantity, subtotal
       FROM order_items
       WHERE order_id = $1`,
      [order.id]
    );

    order.items = itemsRes.rows;
    res.json(order);
  } catch (err) {
    console.error('[ERROR GET /api/orders/:id]:', err.message);
    res.status(500).json({ error: 'Error al consultar el pedido' });
  }
});

// POST /api/orders - Crear pedido pendiente a partir del carrito (Operación Atómica)
router.post('/', authenticateToken, async (req, res) => {
  const { payment_method = 'nequi', notes, idempotency_key } = req.body;
  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Verificar idempotencia si se envía clave
    if (idempotency_key) {
      const existingOrder = await client.query('SELECT * FROM orders WHERE idempotency_key = $1', [idempotency_key]);
      if (existingOrder.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.json(existingOrder.rows[0]);
      }
    }

    // 2. Obtener artículos actuales del carrito del usuario
    const cartRes = await client.query(
      'SELECT id, item_type, item_id, quantity FROM cart_items WHERE user_id = $1',
      [req.user.id]
    );

    if (cartRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El carrito está vacío. Agregue artículos antes de procesar el pedido.' });
    }

    // 3. Validar cada ítem, disponibilidad y precios vigentes en el servidor
    const orderItemsToInsert = [];
    let calculatedTotal = 0;

    for (const item of cartRes.rows) {
      if (item.item_type === 'plan') {
        const planRes = await client.query(
          'SELECT id, name, price, price_unconfirmed, is_active FROM plans WHERE id = $1',
          [item.item_id]
        );
        if (planRes.rows.length === 0 || !planRes.rows[0].is_active) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `El plan solicitado (ID ${item.item_id}) no está disponible.` });
        }
        const plan = planRes.rows[0];
        if (plan.price_unconfirmed || plan.price === null) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `El plan "${plan.name}" tiene precio por confirmar. No es posible generar pedidos con artículos sin precio oficial.`,
          });
        }
        const unitPrice = parseFloat(plan.price);
        const subtotal = unitPrice * item.quantity;
        calculatedTotal += subtotal;
        orderItemsToInsert.push({
          item_type: 'plan',
          item_id: plan.id,
          item_name: `Plan ${plan.name}`,
          unit_price: unitPrice,
          quantity: item.quantity,
          subtotal,
        });
      } else if (item.item_type === 'product') {
        const prodRes = await client.query(
          'SELECT id, name, price, price_unconfirmed, is_active, stock_quantity FROM products WHERE id = $1',
          [item.item_id]
        );
        if (prodRes.rows.length === 0 || !prodRes.rows[0].is_active) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `El producto solicitado (ID ${item.item_id}) no está disponible.` });
        }
        const prod = prodRes.rows[0];
        if (prod.price_unconfirmed || prod.price === null) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: `El producto "${prod.name}" tiene precio por confirmar. No es posible generar pedidos con artículos sin precio oficial.`,
          });
        }
        const unitPrice = parseFloat(prod.price);
        const subtotal = unitPrice * item.quantity;
        calculatedTotal += subtotal;
        orderItemsToInsert.push({
          item_type: 'product',
          item_id: prod.id,
          item_name: prod.name,
          unit_price: unitPrice,
          quantity: item.quantity,
          subtotal,
        });
      }
    }

    // 4. Generar número de pedido único con timestamp
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ZF-ORD-${dateStr}-${randomSuffix}`;

    // 5. Insertar pedido en estado 'pending' (NUNCA pagado sin confirmación real)
    const orderInsertRes = await client.query(
      `INSERT INTO orders (order_number, user_id, status, total_amount, payment_method, idempotency_key, notes)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6)
       RETURNING *`,
      [orderNumber, req.user.id, calculatedTotal, payment_method, idempotency_key || null, notes || null]
    );

    const createdOrder = orderInsertRes.rows[0];

    // 6. Insertar los artículos del pedido
    for (const oi of orderItemsToInsert) {
      await client.query(
        `INSERT INTO order_items (order_id, item_type, item_id, item_name, unit_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [createdOrder.id, oi.item_type, oi.item_id, oi.item_name, oi.unit_price, oi.quantity, oi.subtotal]
      );
    }

    // 7. Vaciar el carrito del usuario tras crear el pedido exitosamente
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);

    // 8. Registrar en auditoría
    await client.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address)
       VALUES ($1, $2, 'INSERT', $3, $4, $5)`,
      ['orders', createdOrder.id, JSON.stringify({ order_number: createdOrder.order_number, total: calculatedTotal, status: 'pending' }), req.user.id, req.ip || '127.0.0.1']
    );

    await client.query('COMMIT');

    createdOrder.items = orderItemsToInsert;
    res.status(201).json(createdOrder);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR POST /api/orders]:', err.message);
    res.status(500).json({ error: 'Error al generar el pedido' });
  } finally {
    client.release();
  }
});

module.exports = router;
