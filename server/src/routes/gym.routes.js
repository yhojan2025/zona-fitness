const express = require('express');
const { getAppPool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// ====================================================================
// 1. PLANES COMERCIALES (Públicos para lectura, admin para escritura)
// ====================================================================
router.get('/plans', async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(
      'SELECT id, name, slug, duration_days, daily_hours_limit, description, price_unconfirmed, price, is_active FROM plans WHERE is_active = true ORDER BY duration_days ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar planes:', err.message);
    res.status(500).json({ error: 'Error al consultar planes comerciales' });
  }
});

router.post('/plans', authenticateToken, requireRole('admin'), async (req, res) => {
  const { name, slug, duration_days, daily_hours_limit, description, price, price_unconfirmed } = req.body;
  if (!name || !slug || !duration_days) {
    return res.status(400).json({ error: 'Nombre, slug y duración en días son requeridos' });
  }

  const pool = getAppPool();
  try {
    const result = await pool.query(
      `INSERT INTO plans (name, slug, duration_days, daily_hours_limit, description, price, price_unconfirmed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, slug, duration_days, daily_hours_limit || null, description || null, price || null, price_unconfirmed ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// 2. HORARIOS DE ATENCIÓN (Públicos para lectura)
// ====================================================================
router.get('/opening-hours', async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(
      'SELECT id, day_of_week, shift_name, open_time, close_time, is_active FROM opening_hours WHERE is_active = true ORDER BY day_of_week, open_time ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar horarios:', err.message);
    res.status(500).json({ error: 'Error al consultar horarios' });
  }
});

// ====================================================================
// 3. SOCIOS / CLIENTES (MEMBERS)
// ====================================================================
router.get('/members', authenticateToken, requireRole('admin', 'agent'), async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(`
      SELECT m.*, u.email as user_email
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar miembros' });
  }
});

router.post('/members', authenticateToken, requireRole('admin', 'agent'), async (req, res) => {
  const {
    first_name,
    last_name,
    document_type,
    document_number,
    email,
    phone,
    birth_date,
    address,
    emergency_contact,
    emergency_phone,
    medical_conditions,
  } = req.body;

  if (!first_name || !last_name || !document_number || !email) {
    return res.status(400).json({ error: 'Nombres, apellidos, número de documento y correo son requeridos' });
  }

  const pool = getAppPool();
  try {
    const result = await pool.query(
      `INSERT INTO members (
        first_name, last_name, document_type, document_number, email, phone,
        birth_date, address, emergency_contact, emergency_phone, medical_conditions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        first_name.trim(),
        last_name.trim(),
        document_type || 'CC',
        document_number.trim(),
        email.toLowerCase().trim(),
        phone || null,
        birth_date || null,
        address || null,
        emergency_contact || null,
        emergency_phone || null,
        medical_conditions || null,
      ]
    );

    // Auditoría
    await pool.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['members', result.rows[0].id, 'INSERT', JSON.stringify(result.rows[0]), req.user.id, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El documento o el correo ya se encuentra registrado' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// 4. MEMBRESÍAS CONTRATADAS
// ====================================================================
router.get('/memberships', authenticateToken, requireRole('admin', 'agent'), async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(`
      SELECT
        ms.*,
        m.first_name, m.last_name, m.document_number,
        p.name as plan_name, p.duration_days, p.daily_hours_limit
      FROM memberships ms
      JOIN members m ON ms.member_id = m.id
      JOIN plans p ON ms.plan_id = p.id
      ORDER BY ms.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar membresías' });
  }
});

router.post('/memberships', authenticateToken, requireRole('admin', 'agent'), async (req, res) => {
  const { member_id, plan_id, start_date, notes } = req.body;
  if (!member_id || !plan_id || !start_date) {
    return res.status(400).json({ error: 'member_id, plan_id y start_date son requeridos' });
  }

  const pool = getAppPool();
  try {
    // Consultar duración del plan para calcular end_date
    const planRes = await pool.query('SELECT duration_days FROM plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    const duration = planRes.rows[0].duration_days;
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + duration);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO memberships (member_id, plan_id, start_date, end_date, status, notes)
       VALUES ($1, $2, $3, $4, 'active', $5)
       RETURNING *`,
      [member_id, plan_id, start_date, endDateStr, notes || null]
    );

    // Auditoría
    await pool.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['memberships', result.rows[0].id, 'INSERT', JSON.stringify(result.rows[0]), req.user.id, req.ip]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// 5. PAGOS (Verificación estricta: nunca confirmar sin verificación)
// ====================================================================
router.get('/payments', authenticateToken, requireRole('admin', 'agent'), async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(`
      SELECT
        pay.*,
        m.first_name, m.last_name, m.document_number,
        u.name as verifier_name
      FROM payments pay
      JOIN members m ON pay.member_id = m.id
      LEFT JOIN users u ON pay.verified_by = u.id
      ORDER BY pay.payment_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar pagos' });
  }
});

router.post('/payments', authenticateToken, requireRole('admin', 'agent'), async (req, res) => {
  const { member_id, membership_id, amount, payment_method, reference_number, notes } = req.body;
  if (!member_id || !amount || !payment_method) {
    return res.status(400).json({ error: 'member_id, amount y payment_method son requeridos' });
  }

  const validMethods = ['nequi', 'bancolombia', 'efectivo', 'tarjeta', 'transferencia', 'otro'];
  if (!validMethods.includes(payment_method)) {
    return res.status(400).json({ error: `Método de pago no válido. Permitidos: ${validMethods.join(', ')}` });
  }

  // Nota de seguridad: No se almacenan números de tarjeta de crédito
  const pool = getAppPool();
  try {
    const result = await pool.query(
      `INSERT INTO payments (member_id, membership_id, amount, payment_method, reference_number, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
      [member_id, membership_id || null, parseFloat(amount), payment_method, reference_number || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verificación de pago (requiere autorización explícita)
router.patch('/payments/:id/verify', authenticateToken, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, verification_notes } = req.body; // 'verified' o 'rejected'

  if (!['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'El estado debe ser verified o rejected' });
  }

  const pool = getAppPool();
  try {
    const checkRes = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const currentPayment = checkRes.rows[0];

    const result = await pool.query(
      `UPDATE payments
       SET status = $1, verified_by = $2, verified_at = CURRENT_TIMESTAMP,
           notes = COALESCE(notes, '') || CASE WHEN $3::text IS NOT NULL THEN ' | Verificación: ' || $3::text ELSE '' END
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, verification_notes || null, id]
    );

    // Auditoría estricta de verificación de pago
    await pool.query(
      `INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, performed_by, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['payments', id, 'UPDATE', JSON.stringify(currentPayment), JSON.stringify(result.rows[0]), req.user.id, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// 6. ASISTENCIAS (Control de acceso)
// ====================================================================
router.get('/attendance', authenticateToken, requireRole('admin', 'agent', 'trainer'), async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(`
      SELECT a.*, m.first_name, m.last_name, m.document_number
      FROM attendance a
      JOIN members m ON a.member_id = m.id
      ORDER BY a.check_in DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar asistencias' });
  }
});

router.post('/attendance/check-in', authenticateToken, requireRole('admin', 'agent'), async (req, res) => {
  const { member_id, notes } = req.body;
  if (!member_id) {
    return res.status(400).json({ error: 'member_id es requerido' });
  }

  const pool = getAppPool();
  try {
    // Validar si el miembro tiene membresía activa
    const activeMemRes = await pool.query(
      `SELECT ms.id, p.name as plan_name, p.daily_hours_limit
       FROM memberships ms
       JOIN plans p ON ms.plan_id = p.id
       WHERE ms.member_id = $1 AND ms.status = 'active' AND CURRENT_DATE BETWEEN ms.start_date AND ms.end_date`,
      [member_id]
    );

    const hasActivePlan = activeMemRes.rows.length > 0;
    const status = hasActivePlan ? 'granted' : 'denied';
    const accessNote = hasActivePlan
      ? `Acceso permitido. Plan: ${activeMemRes.rows[0].plan_name}`
      : 'Acceso denegado: No tiene membresía activa en la fecha actual.';

    const result = await pool.query(
      `INSERT INTO attendance (member_id, status, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [member_id, status, notes ? `${accessNote} | ${notes}` : accessNote]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================================
// 7. ENTRENADORES
// ====================================================================
router.get('/trainers', async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, specialty, bio, is_active FROM trainers WHERE is_active = true ORDER BY first_name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar entrenadores' });
  }
});

// ====================================================================
// 8. PRODUCTOS E INVENTARIO
// ====================================================================
router.get('/products', async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(
      'SELECT id, name, sku, category, description, price, price_unconfirmed, stock_quantity, is_active FROM products WHERE is_active = true ORDER BY category, name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar catálogo de productos' });
  }
});

router.post('/inventory-movements', authenticateToken, requireRole('admin'), async (req, res) => {
  const { product_id, movement_type, quantity, reason, reference_id } = req.body;
  if (!product_id || !movement_type || !quantity || !reason) {
    return res.status(400).json({ error: 'product_id, movement_type, quantity y reason son requeridos' });
  }

  const pool = getAppPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Registrar movimiento
    const movRes = await client.query(
      `INSERT INTO inventory_movements (product_id, movement_type, quantity, reason, created_by, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [product_id, movement_type, quantity, reason, req.user.id, reference_id || null]
    );

    // Ajustar stock en la tabla de productos
    const delta = movement_type === 'in' ? Math.abs(quantity) : -Math.abs(quantity);
    await client.query(
      `UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2`,
      [delta, product_id]
    );

    await client.query('COMMIT');
    res.status(201).json(movRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ====================================================================
// 9. AUDITORÍA ADMINISTRATIVA (Solo admin)
// ====================================================================
router.get('/audit-logs', authenticateToken, requireRole('admin'), async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(`
      SELECT a.*, u.name as performed_by_name, u.email as performed_by_email
      FROM audit_logs a
      LEFT JOIN users u ON a.performed_by = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar bitácora de auditoría' });
  }
});

module.exports = router;
