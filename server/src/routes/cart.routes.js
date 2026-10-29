const express = require('express');
const { getAppPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/cart - Listar contenido del carrito con cálculos realizados en el servidor
router.get('/', authenticateToken, async (req, res) => {
  const pool = getAppPool();
  try {
    const cartRes = await pool.query(
      `SELECT c.id, c.item_type, c.item_id, c.quantity, c.created_at, c.updated_at
       FROM cart_items c
       WHERE c.user_id = $1
       ORDER BY c.created_at ASC`,
      [req.user.id]
    );

    const items = [];
    let overallSubtotal = 0;
    let hasUnconfirmedPrice = false;
    let unconfirmedCount = 0;

    for (const item of cartRes.rows) {
      if (item.item_type === 'plan') {
        const planRes = await pool.query(
          'SELECT id, name, slug, duration_days, description, price, price_unconfirmed, is_active FROM plans WHERE id = $1',
          [item.item_id]
        );
        if (planRes.rows.length > 0) {
          const plan = planRes.rows[0];
          const isUnconfirmed = plan.price_unconfirmed || plan.price === null;
          const unitPrice = isUnconfirmed ? 0 : parseFloat(plan.price);
          const subtotal = isUnconfirmed ? 0 : unitPrice * item.quantity;
          if (isUnconfirmed) {
            hasUnconfirmedPrice = true;
            unconfirmedCount++;
          } else {
            overallSubtotal += subtotal;
          }

          items.push({
            id: item.id,
            item_type: 'plan',
            item_id: plan.id,
            name: `Plan ${plan.name}`,
            detail: `${plan.duration_days} días`,
            description: plan.description,
            unit_price: isUnconfirmed ? null : unitPrice,
            price_unconfirmed: isUnconfirmed,
            quantity: item.quantity,
            subtotal: isUnconfirmed ? null : subtotal,
            is_active: plan.is_active,
          });
        }
      } else if (item.item_type === 'product') {
        const prodRes = await pool.query(
          'SELECT id, name, sku, category, description, price, price_unconfirmed, stock_quantity, is_active FROM products WHERE id = $1',
          [item.item_id]
        );
        if (prodRes.rows.length > 0) {
          const prod = prodRes.rows[0];
          const isUnconfirmed = prod.price_unconfirmed || prod.price === null;
          const unitPrice = isUnconfirmed ? 0 : parseFloat(prod.price);
          const subtotal = isUnconfirmed ? 0 : unitPrice * item.quantity;
          if (isUnconfirmed) {
            hasUnconfirmedPrice = true;
            unconfirmedCount++;
          } else {
            overallSubtotal += subtotal;
          }

          items.push({
            id: item.id,
            item_type: 'product',
            item_id: prod.id,
            name: prod.name,
            detail: `Categoría: ${prod.category}`,
            description: prod.description,
            unit_price: isUnconfirmed ? null : unitPrice,
            price_unconfirmed: isUnconfirmed,
            quantity: item.quantity,
            subtotal: isUnconfirmed ? null : subtotal,
            stock_quantity: prod.stock_quantity,
            is_active: prod.is_active,
          });
        }
      }
    }

    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

    res.json({
      items,
      item_count: totalCount,
      subtotal: overallSubtotal,
      total_amount: overallSubtotal,
      has_unconfirmed_prices: hasUnconfirmedPrice,
      unconfirmed_items_count: unconfirmedCount,
      can_checkout: items.length > 0 && !hasUnconfirmedPrice,
    });
  } catch (err) {
    console.error('[ERROR GET /api/cart]:', err.message);
    res.status(500).json({ error: 'Error al consultar el carrito de compras' });
  }
});

// POST /api/cart - Agregar ítem al carrito (valida existencia e integridad)
router.post('/', authenticateToken, async (req, res) => {
  const { item_type, item_id, quantity = 1 } = req.body;

  if (!['plan', 'product'].includes(item_type)) {
    return res.status(400).json({ error: 'item_type debe ser "plan" o "product"' });
  }

  const parsedItemId = parseInt(item_id, 10);
  const parsedQty = parseInt(quantity, 10);

  if (isNaN(parsedItemId) || parsedItemId <= 0) {
    return res.status(400).json({ error: 'item_id inválido' });
  }

  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: 'quantity debe ser un entero positivo mayor a cero' });
  }

  const pool = getAppPool();
  try {
    // Validar existencia y estado activo del ítem en PostgreSQL
    if (item_type === 'plan') {
      const planCheck = await pool.query('SELECT id, is_active FROM plans WHERE id = $1', [parsedItemId]);
      if (planCheck.rows.length === 0 || !planCheck.rows[0].is_active) {
        return res.status(404).json({ error: 'El plan solicitado no existe o no está disponible' });
      }
    } else {
      const prodCheck = await pool.query('SELECT id, is_active, stock_quantity FROM products WHERE id = $1', [parsedItemId]);
      if (prodCheck.rows.length === 0 || !prodCheck.rows[0].is_active) {
        return res.status(404).json({ error: 'El producto solicitado no existe o no está disponible' });
      }
    }

    // Insertar o actualizar cantidad de forma atómica e idempotente
    const upsertRes = await pool.query(
      `INSERT INTO cart_items (user_id, item_type, item_id, quantity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, item_type, item_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP
       RETURNING id, user_id, item_type, item_id, quantity, updated_at`,
      [req.user.id, item_type, parsedItemId, parsedQty]
    );

    res.status(201).json(upsertRes.rows[0]);
  } catch (err) {
    console.error('[ERROR POST /api/cart]:', err.message);
    res.status(500).json({ error: 'Error al agregar ítem al carrito' });
  }
});

// PATCH /api/cart/:id - Actualizar cantidad de un artículo
router.patch('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { quantity } = req.body;
  const parsedQty = parseInt(quantity, 10);

  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un número entero mayor a 0' });
  }

  const pool = getAppPool();
  try {
    const updateRes = await pool.query(
      `UPDATE cart_items
       SET quantity = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, item_type, item_id, quantity, updated_at`,
      [parsedQty, id, req.user.id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado en tu carrito' });
    }

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error('[ERROR PATCH /api/cart/:id]:', err.message);
    res.status(500).json({ error: 'Error al actualizar artículo del carrito' });
  }
});

// DELETE /api/cart/:id - Eliminar un artículo específico
router.delete('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const pool = getAppPool();

  try {
    const delRes = await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado en tu carrito' });
    }

    res.json({ message: 'Artículo eliminado del carrito exitosamente', id });
  } catch (err) {
    console.error('[ERROR DELETE /api/cart/:id]:', err.message);
    res.status(500).json({ error: 'Error al eliminar artículo del carrito' });
  }
});

// DELETE /api/cart - Vaciar todo el carrito del usuario
router.delete('/', authenticateToken, async (req, res) => {
  const pool = getAppPool();
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'El carrito ha sido vaciado exitosamente' });
  } catch (err) {
    console.error('[ERROR DELETE /api/cart]:', err.message);
    res.status(500).json({ error: 'Error al vaciar el carrito' });
  }
});

module.exports = router;
