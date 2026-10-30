const express = require('express');
const { getAppPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/memberships/my-active - Consulta de la membresía activa del usuario autenticado
router.get('/my-active', authenticateToken, async (req, res) => {
  const pool = getAppPool();
  try {
    const query = `
      SELECT m.id, m.user_id, m.member_id, m.plan_id, m.order_id,
             m.start_date, m.end_date, m.status, m.price_paid, m.is_simulated, m.notes, m.created_at,
             p.name AS plan_name, p.slug AS plan_slug, p.duration_days, p.description AS plan_description,
             o.order_number, o.total_amount,
             GREATEST(0, (m.end_date - CURRENT_DATE)) AS days_remaining,
             CASE
               WHEN CURRENT_DATE > m.end_date THEN 'expired'
               ELSE m.status
             END AS computed_status
      FROM memberships m
      JOIN plans p ON m.plan_id = p.id
      LEFT JOIN orders o ON m.order_id = o.id
      WHERE (m.user_id = $1 OR m.member_id IN (SELECT id FROM members WHERE user_id = $1))
        AND m.status = 'active'
        AND m.end_date >= CURRENT_DATE
      ORDER BY m.end_date DESC
      LIMIT 1;
    `;

    const result = await pool.query(query, [req.user.id]);

    if (result.rows.length === 0) {
      return res.json({
        active: false,
        membership: null,
        message: 'AÚN NO TIENES UN PLAN ACTIVO',
      });
    }

    const row = result.rows[0];
    const durationLabel = row.duration_days >= 365
      ? '1 año'
      : row.duration_days >= 180
        ? '6 meses'
        : row.duration_days >= 90
          ? '3 meses'
          : `${row.duration_days} días`;

    res.json({
      active: true,
      membership: {
        id: row.id,
        plan_name: `Plan ${row.plan_name}`,
        raw_plan_name: row.plan_name,
        slug: row.plan_slug,
        status: row.computed_status,
        start_date: row.start_date,
        end_date: row.end_date,
        duration_days: row.duration_days,
        duration: durationLabel,
        price_registered: parseFloat(row.price_paid || row.total_amount || 0),
        order_number: row.order_number || 'PENDIENTE',
        payment_status: row.is_simulated ? 'SIMULADO — SIN COBRO REAL' : 'PAGADO',
        days_remaining: parseInt(row.days_remaining, 10),
        is_simulated: row.is_simulated,
        notes: row.notes,
      },
    });
  } catch (err) {
    console.error('[ERROR GET /api/memberships/my-active]:', err.message);
    res.status(500).json({ error: 'Error al consultar membresía activa' });
  }
});

// GET /api/memberships/my-history - Historial de todas las membresías del usuario
router.get('/my-history', authenticateToken, async (req, res) => {
  const pool = getAppPool();
  try {
    const query = `
      SELECT m.id, m.start_date, m.end_date, m.status, m.price_paid, m.is_simulated, m.notes, m.created_at,
             p.name AS plan_name, p.slug AS plan_slug, p.duration_days,
             o.order_number,
             GREATEST(0, (m.end_date - CURRENT_DATE)) AS days_remaining,
             CASE
               WHEN CURRENT_DATE > m.end_date THEN 'expired'
               ELSE m.status
             END AS computed_status
      FROM memberships m
      JOIN plans p ON m.plan_id = p.id
      LEFT JOIN orders o ON m.order_id = o.id
      WHERE (m.user_id = $1 OR m.member_id IN (SELECT id FROM members WHERE user_id = $1))
      ORDER BY m.created_at DESC;
    `;

    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR GET /api/memberships/my-history]:', err.message);
    res.status(500).json({ error: 'Error al consultar historial de membresías' });
  }
});

module.exports = router;
