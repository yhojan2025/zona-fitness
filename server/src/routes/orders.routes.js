const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { getAppPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const STORAGE_DIR = path.resolve(__dirname, '..', '..', 'storage', 'receipts');

// Detector de tipos MIME reales mediante inspección de magic bytes
function detectImageMime(buffer) {
  if (!buffer || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return 'image/png';
  }
  // WEBP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB máximo
  },
});

// Middleware auxiliar para captura limpia de errores de Multer (ej. archivo mayor a 5MB)
function handleReceiptUpload(req, res, next) {
  upload.single('receipt')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'El archivo excede el tamaño máximo permitido de 5 MB' });
      }
      return res.status(400).json({ error: `Error en la carga de archivo: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// GET /api/orders - Historial de pedidos del usuario autenticado
router.get('/', authenticateToken, async (req, res) => {
  const pool = getAppPool();
  try {
    const ordersRes = await pool.query(
      `SELECT o.id, o.order_number, o.user_id, o.status, o.total_amount, o.payment_method, o.notes, o.created_at, o.updated_at,
              p.id AS payment_id, p.status AS payment_status, p.receipt_path, p.rejection_reason
       FROM orders o
       LEFT JOIN payments p ON p.order_id = o.id
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
      `SELECT o.id, o.order_number, o.user_id, o.status, o.total_amount, o.payment_method, o.notes, o.created_at, o.updated_at,
              p.id AS payment_id, p.status AS payment_status, p.receipt_path, p.rejection_reason
       FROM orders o
       LEFT JOIN payments p ON p.order_id = o.id
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

// POST /api/orders/checkout-simulated - Compra simulada transaccional e inmediata activación de membresía
router.post('/checkout-simulated', authenticateToken, async (req, res) => {
  const { notes, idempotency_key } = req.body;
  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Idempotencia: Si ya existe un pedido con esa clave, retornar el existente
    if (idempotency_key) {
      const existingRes = await client.query(
        'SELECT * FROM orders WHERE idempotency_key = $1 AND user_id = $2',
        [idempotency_key, req.user.id]
      );
      if (existingRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.json({
          success: true,
          idempotent: true,
          order: existingRes.rows[0],
          message: 'Pedido simulado previamente procesado.',
        });
      }
    }

    // 2. Obtener artículos actuales del carrito del usuario autenticado
    const cartRes = await client.query(
      'SELECT id, item_type, item_id, quantity FROM cart_items WHERE user_id = $1',
      [req.user.id]
    );

    if (cartRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El carrito está vacío. Agregue un plan antes de confirmar la compra.' });
    }

    // 3. Validar disponibilidad y consultar precios oficiales en PostgreSQL (nunca confiar en el cliente)
    const orderItemsToInsert = [];
    const plansToActivate = [];
    let calculatedTotal = 0;

    for (const item of cartRes.rows) {
      if (item.item_type === 'plan') {
        const planRes = await client.query(
          'SELECT id, name, slug, duration_days, price, price_unconfirmed, is_active FROM plans WHERE id = $1',
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
            error: `El plan "${plan.name}" tiene precio por confirmar. No es posible procesar compras sin precio oficial configurado.`,
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

        plansToActivate.push({
          plan,
          quantity: item.quantity,
          unitPrice,
        });
      } else if (item.item_type === 'product') {
        const prodRes = await client.query(
          'SELECT id, name, price, price_unconfirmed, is_active FROM products WHERE id = $1',
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
            error: `El producto "${prod.name}" tiene precio por confirmar.`,
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

    // 4. Asegurar que exista un registro de socio (members) vinculado al usuario
    let memberRes = await client.query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
    let memberId;

    if (memberRes.rows.length === 0) {
      const userRes = await client.query('SELECT name, email, phone, birth_date FROM users WHERE id = $1', [req.user.id]);
      const user = userRes.rows[0];
      const nameParts = (user?.name || 'Socio ZF').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Socio';
      const lastName = nameParts.slice(1).join(' ') || 'ZonaFitness';
      const docNum = `CC-${req.user.id}-${Date.now().toString().slice(-5)}`;

      const newMemberRes = await client.query(
        `INSERT INTO members (user_id, first_name, last_name, document_type, document_number, email, phone, birth_date, is_active)
         VALUES ($1, $2, $3, 'CC', $4, $5, $6, $7, true)
         RETURNING id`,
        [req.user.id, firstName, lastName, docNum, user?.email || `user${req.user.id}@zonafitness.test`, user?.phone || null, user?.birth_date || null]
      );
      memberId = newMemberRes.rows[0].id;
    } else {
      memberId = memberRes.rows[0].id;
    }

    // 5. Generar número de pedido único
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ZF-ORD-${dateStr}-${randomSuffix}`;

    // 6. Insertar pedido en estado 'approved' para compra simulada
    const orderInsertRes = await client.query(
      `INSERT INTO orders (order_number, user_id, status, total_amount, payment_method, idempotency_key, notes)
       VALUES ($1, $2, 'approved', $3, 'simulacion', $4, $5)
       RETURNING *`,
      [orderNumber, req.user.id, calculatedTotal, idempotency_key || null, notes || 'SIMULACIÓN — SIN COBRO REAL']
    );

    const createdOrder = orderInsertRes.rows[0];

    // 7. Insertar order_items
    for (const oi of orderItemsToInsert) {
      await client.query(
        `INSERT INTO order_items (order_id, item_type, item_id, item_name, unit_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [createdOrder.id, oi.item_type, oi.item_id, oi.item_name, oi.unit_price, oi.quantity, oi.subtotal]
      );
    }

    // 8. Registrar pago simulado verificado
    await client.query(
      `INSERT INTO payments (member_id, order_id, amount, payment_method, status, notes)
       VALUES ($1, $2, $3, 'simulacion', 'verified', 'SIMULACIÓN — SIN COBRO REAL')`,
      [memberId, createdOrder.id, calculatedTotal]
    );

    // 9. Crear y activar membresía(s) en PostgreSQL
    const activatedMemberships = [];
    for (const p of plansToActivate) {
      const durationDays = p.plan.duration_days;
      const memRes = await client.query(
        `INSERT INTO memberships (
          user_id, member_id, plan_id, order_id, start_date, end_date, status, price_paid, is_simulated, notes
        ) VALUES (
          $1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + ($5 || ' days')::interval, 'active', $6, true, 'SIMULACIÓN — SIN COBRO REAL'
        ) RETURNING id, user_id, member_id, plan_id, start_date, end_date, status, price_paid, is_simulated, created_at`,
        [req.user.id, memberId, p.plan.id, createdOrder.id, durationDays, p.unitPrice]
      );

      const mem = memRes.rows[0];
      mem.plan_name = p.plan.name;
      mem.duration_days = durationDays;
      activatedMemberships.push(mem);

      // Registrar evento en historial de ciclo de vida
      await client.query(
        `INSERT INTO membership_events (membership_id, event_type, new_status, reason, actor_id)
         VALUES ($1, 'activated', 'active', 'Activación por compra simulada exitosa', $2)`,
        [mem.id, req.user.id]
      );
    }

    // 10. Vaciar carrito del usuario tras éxito
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);

    // 11. Auditoría
    await client.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address)
       VALUES ($1, $2, 'INSERT', $3, $4, $5)`,
      [
        'orders',
        createdOrder.id,
        JSON.stringify({
          action: 'SIMULATED_PURCHASE_CONFIRMED',
          order_number: createdOrder.order_number,
          total: calculatedTotal,
          memberships_created: activatedMemberships.length,
        }),
        req.user.id,
        req.ip || '127.0.0.1',
      ]
    );

    await client.query('COMMIT');

    createdOrder.items = orderItemsToInsert;
    res.status(201).json({
      success: true,
      order: createdOrder,
      memberships: activatedMemberships,
      payment_type: 'SIMULACIÓN — SIN COBRO REAL',
      message: '¡Compra simulada completada con éxito! Tu membresía ya se encuentra activa en tu perfil.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR POST /api/orders/checkout-simulated]:', err.message);
    res.status(500).json({ error: 'Error interno al procesar la compra simulada' });
  } finally {
    client.release();
  }
});

// POST /api/orders/checkout-transfer - Proceso de pago por transferencia con comprobante obligatorio
router.post('/checkout-transfer', authenticateToken, handleReceiptUpload, async (req, res) => {
  const { notes, idempotency_key } = req.body;

  // 1. Verificación obligatoria de comprobante adjunto
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      error: 'Es obligatorio adjuntar una fotografía o captura legible del comprobante de transferencia bancaria.',
    });
  }

  // 2. Validación de contenido mediante inspección de bytes mágicos (magic bytes)
  const detectedMime = detectImageMime(req.file.buffer);
  if (!detectedMime) {
    return res.status(400).json({
      error: 'Formato de archivo inválido. Solo se admiten imágenes JPG, JPEG, PNG y WEBP reales.',
    });
  }

  // 3. Generación de nombre seguro aleatorio y guardado en almacenamiento privado
  const ext = detectedMime === 'image/jpeg' ? '.jpg' : detectedMime === 'image/png' ? '.png' : '.webp';
  const safeFilename = `receipt_${Date.now()}_${crypto.randomUUID()}${ext}`;
  const targetPath = path.resolve(STORAGE_DIR, safeFilename);

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    // Guardar archivo físico en disco
    await fs.promises.writeFile(targetPath, req.file.buffer);

    await client.query('BEGIN');

    // 4. Idempotencia
    if (idempotency_key) {
      const existingRes = await client.query(
        'SELECT * FROM orders WHERE idempotency_key = $1 AND user_id = $2',
        [idempotency_key, req.user.id]
      );
      if (existingRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.json({
          success: true,
          idempotent: true,
          order: existingRes.rows[0],
          message: 'Tu comprobante fue recibido correctamente. Tu pago está pendiente de verificación por parte del administrador. Tu membresía se activará una vez confirmado el pago.',
        });
      }
    }

    // 5. Validar carrito
    const cartRes = await client.query(
      'SELECT id, item_type, item_id, quantity FROM cart_items WHERE user_id = $1',
      [req.user.id]
    );

    if (cartRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El carrito está vacío. Agregue un plan antes de procesar el pago.' });
    }

    // 6. Validar planes y calcular total
    const orderItemsToInsert = [];
    let calculatedTotal = 0;

    for (const item of cartRes.rows) {
      if (item.item_type === 'plan') {
        const planRes = await client.query(
          'SELECT id, name, slug, duration_days, price, price_unconfirmed, is_active FROM plans WHERE id = $1',
          [item.item_id]
        );
        if (planRes.rows.length === 0 || !planRes.rows[0].is_active) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `El plan solicitado (ID ${item.item_id}) no está disponible.` });
        }
        const plan = planRes.rows[0];
        if (plan.price_unconfirmed || plan.price === null) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `El plan "${plan.name}" tiene precio por confirmar.` });
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
          'SELECT id, name, price, price_unconfirmed, is_active FROM products WHERE id = $1',
          [item.item_id]
        );
        if (prodRes.rows.length === 0 || !prodRes.rows[0].is_active) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `El producto solicitado no está disponible.` });
        }
        const prod = prodRes.rows[0];
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

    // 7. Registro de socio (members)
    let memberRes = await client.query('SELECT id FROM members WHERE user_id = $1', [req.user.id]);
    let memberId;

    if (memberRes.rows.length === 0) {
      const userRes = await client.query('SELECT name, email, phone, birth_date FROM users WHERE id = $1', [req.user.id]);
      const user = userRes.rows[0];
      const nameParts = (user?.name || 'Socio ZF').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Socio';
      const lastName = nameParts.slice(1).join(' ') || 'ZonaFitness';
      const docNum = `CC-${req.user.id}-${Date.now().toString().slice(-5)}`;

      const newMemberRes = await client.query(
        `INSERT INTO members (user_id, first_name, last_name, document_type, document_number, email, phone, birth_date, is_active)
         VALUES ($1, $2, $3, 'CC', $4, $5, $6, $7, true)
         RETURNING id`,
        [req.user.id, firstName, lastName, docNum, user?.email || `user${req.user.id}@zonafitness.test`, user?.phone || null, user?.birth_date || null]
      );
      memberId = newMemberRes.rows[0].id;
    } else {
      memberId = memberRes.rows[0].id;
    }

    // 8. Crear pedido en estado 'pending_verification'
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ZF-ORD-${dateStr}-${randomSuffix}`;

    const orderInsertRes = await client.query(
      `INSERT INTO orders (order_number, user_id, status, total_amount, payment_method, idempotency_key, notes)
       VALUES ($1, $2, 'pending_verification', $3, 'transferencia', $4, $5)
       RETURNING *`,
      [orderNumber, req.user.id, calculatedTotal, idempotency_key || null, notes || 'Transferencia bancaria pendiente de verificación']
    );

    const createdOrder = orderInsertRes.rows[0];

    // 9. Artículos del pedido
    for (const oi of orderItemsToInsert) {
      await client.query(
        `INSERT INTO order_items (order_id, item_type, item_id, item_name, unit_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [createdOrder.id, oi.item_type, oi.item_id, oi.item_name, oi.unit_price, oi.quantity, oi.subtotal]
      );
    }

    // 10. Registrar pago en estado 'pending_verification' con metadata del comprobante
    const paymentInsertRes = await client.query(
      `INSERT INTO payments (
         member_id, order_id, amount, payment_method, status,
         receipt_path, receipt_original_name, receipt_mime_type, receipt_size_bytes, notes
       ) VALUES ($1, $2, $3, 'transferencia', 'pending_verification', $4, $5, $6, $7, $8)
       RETURNING id, status, payment_method, created_at`,
      [
        memberId,
        createdOrder.id,
        calculatedTotal,
        safeFilename,
        req.file.originalname,
        detectedMime,
        req.file.size,
        notes || 'Comprobante de transferencia enviado para verificación administrativa',
      ]
    );

    const payment = paymentInsertRes.rows[0];

    // 11. Vaciar carrito
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);

    // 12. Auditoría
    await client.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address, reason)
       VALUES ($1, $2, 'INSERT', $3, $4, $5, $6)`,
      [
        'payments',
        payment.id,
        JSON.stringify({
          order_id: createdOrder.id,
          order_number: createdOrder.order_number,
          amount: calculatedTotal,
          receipt_file: safeFilename,
          status: 'pending_verification',
        }),
        req.user.id,
        req.ip || '127.0.0.1',
        'Cliente envió comprobante de pago por transferencia bancaria para verificación administrativa.',
      ]
    );

    // ¡REGLA FUNDAMENTAL: NUNCA ACTIVAR MEMBRESÍA AUTOMÁTICAMENTE PARA TRANSFERENCIAS!
    await client.query('COMMIT');

    createdOrder.items = orderItemsToInsert;
    res.status(201).json({
      success: true,
      message: 'Tu comprobante fue recibido correctamente. Tu pago está pendiente de verificación por parte del administrador. Tu membresía se activará una vez confirmado el pago.',
      order: createdOrder,
      payment: {
        id: payment.id,
        status: payment.status,
        payment_method: payment.payment_method,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    // Si falló y se había escrito el archivo, limpiarlo para no dejar huérfanos
    if (fs.existsSync(targetPath)) {
      try { await fs.promises.unlink(targetPath); } catch (_) {}
    }
    console.error('[ERROR POST /api/orders/checkout-transfer]:', err.message);
    res.status(500).json({ error: 'Error interno al procesar el comprobante de transferencia' });
  } finally {
    client.release();
  }
});

module.exports = router;
