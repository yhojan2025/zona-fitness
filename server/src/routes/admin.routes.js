const express = require('express');
const { getAppPool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Todos los endpoints de este enrutador exigen estrictamente autenticación JWT y rol 'admin'
router.use(authenticateToken);
router.use(requireRole('admin'));

// ====================================================================
// 1. GET /api/admin/metrics - Métricas en tiempo real de PostgreSQL
// ====================================================================
router.get('/metrics', async (req, res) => {
  const pool = getAppPool();
  try {
    // Métricas de Usuarios
    const usersMetricsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total_users,
        COUNT(CASE WHEN is_active = true AND deleted_at IS NULL THEN 1 END)::int AS active_users,
        COUNT(CASE WHEN is_active = false OR deleted_at IS NOT NULL THEN 1 END)::int AS inactive_users,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END)::int AS deleted_users,
        COUNT(CASE WHEN role = 'admin' THEN 1 END)::int AS admin_users,
        COUNT(CASE WHEN role = 'user' THEN 1 END)::int AS regular_users
      FROM users;
    `);

    // Métricas de Membresías
    const membershipsMetricsRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total_memberships,
        COUNT(CASE WHEN status = 'active' AND end_date >= CURRENT_DATE THEN 1 END)::int AS active_memberships,
        COUNT(CASE WHEN end_date < CURRENT_DATE OR status = 'expired' THEN 1 END)::int AS expired_memberships,
        COUNT(CASE WHEN status = 'active' AND end_date >= CURRENT_DATE AND end_date <= CURRENT_DATE + INTERVAL '7 days' THEN 1 END)::int AS expiring_soon_memberships
      FROM memberships;
    `);

    // Métricas de Planes disponibles
    const plansMetricsRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total_plans,
        COUNT(CASE WHEN is_active = true THEN 1 END)::int AS available_plans
      FROM plans;
    `);

    // Métricas de Pedidos e Ingresos (Diferenciando compras simuladas de reales)
    const ordersMetricsRes = await pool.query(`
      SELECT
        COUNT(*)::int AS total_orders,
        COUNT(CASE WHEN status = 'approved' THEN 1 END)::int AS approved_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int AS cancelled_orders,
        COALESCE(SUM(CASE WHEN payment_method = 'simulacion' AND status = 'approved' THEN total_amount ELSE 0 END), 0)::numeric(12,2) AS simulated_revenue,
        COALESCE(SUM(CASE WHEN payment_method != 'simulacion' AND status = 'approved' THEN total_amount ELSE 0 END), 0)::numeric(12,2) AS real_revenue
      FROM orders;
    `);

    // Actividad reciente
    const recentOrdersRes = await pool.query(`
      SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_method, o.created_at, u.name AS user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5;
    `);

    const recentMembershipsRes = await pool.query(`
      SELECT m.id, m.start_date, m.end_date, m.status, m.price_paid, m.is_simulated,
             p.name AS plan_name, u.name AS user_name
      FROM memberships m
      JOIN plans p ON m.plan_id = p.id
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
      LIMIT 5;
    `);

    const pendingPaymentsRes = await pool.query(`
      SELECT COUNT(*)::int AS count FROM payments WHERE status = 'pending_verification';
    `);

    const uRow = usersMetricsRes.rows[0];
    const mRow = membershipsMetricsRes.rows[0];
    const pRow = plansMetricsRes.rows[0];
    const oRow = ordersMetricsRes.rows[0];
    const pendingVerificationsCount = pendingPaymentsRes.rows[0]?.count || 0;

    res.json({
      users: {
        total: uRow.total_users,
        active: uRow.active_users,
        inactive: uRow.inactive_users,
        deleted: uRow.deleted_users,
        admin_count: uRow.admin_users,
        regular_count: uRow.regular_users,
        total_users: uRow.total_users,
        active_users: uRow.active_users,
        inactive_users: uRow.inactive_users,
      },
      memberships: {
        total: mRow.total_memberships,
        active: mRow.active_memberships,
        expired: mRow.expired_memberships,
        expiring_soon: mRow.expiring_soon_memberships,
        total_memberships: mRow.total_memberships,
        active_memberships: mRow.active_memberships,
        expired_memberships: mRow.expired_memberships,
        expiring_soon_memberships: mRow.expiring_soon_memberships,
      },
      plans: {
        total: pRow.total_plans,
        available: pRow.available_plans,
      },
      orders: {
        total: oRow.total_orders,
        approved: oRow.approved_orders,
        pending: oRow.pending_orders,
        cancelled: oRow.cancelled_orders,
        total_orders: oRow.total_orders,
        approved_orders: oRow.approved_orders,
        pending_orders: oRow.pending_orders,
      },
      payments: {
        pending_verifications: pendingVerificationsCount,
      },
      revenue: {
        simulated_revenue: parseFloat(oRow.simulated_revenue),
        real_revenue: parseFloat(oRow.real_revenue),
        disclaimer: 'SIMULACIÓN — SIN COBRO REAL. Los ingresos corresponden a transacciones de demostración.',
      },
      recent_activity: {
        orders: recentOrdersRes.rows,
        memberships: recentMembershipsRes.rows,
      },
    });
  } catch (err) {
    console.error('[ERROR GET /api/admin/metrics]:', err.message);
    res.status(500).json({ error: 'Error al calcular las métricas del dashboard administrativo' });
  }
});

// ====================================================================
// 2. GET /api/admin/users - Gestión de Usuarios con Búsqueda y Filtros
// ====================================================================
router.get('/users', async (req, res) => {
  const { search, filter } = req.query;
  const pool = getAppPool();

  try {
    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    // Búsqueda por nombre, email o teléfono
    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(LOWER(u.name) LIKE $${paramIdx} OR LOWER(u.email) LIKE $${paramIdx} OR LOWER(COALESCE(u.phone, '')) LIKE $${paramIdx})`);
      params.push(s);
      paramIdx++;
    }

    // Filtros de estado y membresía
    if (filter === 'active') {
      whereClauses.push(`(u.is_active = true AND u.deleted_at IS NULL)`);
    } else if (filter === 'inactive') {
      whereClauses.push(`(u.is_active = false OR u.deleted_at IS NOT NULL)`);
    } else if (filter === 'with_active_membership') {
      whereClauses.push(`(act_m.id IS NOT NULL AND act_m.status = 'active' AND act_m.end_date >= CURRENT_DATE)`);
    } else if (filter === 'without_membership') {
      whereClauses.push(`(act_m.id IS NULL)`);
    } else if (filter === 'expired_membership') {
      whereClauses.push(`(act_m.id IS NOT NULL AND (act_m.end_date < CURRENT_DATE OR act_m.status = 'expired'))`);
    } else if (filter === 'expiring_soon') {
      whereClauses.push(`(act_m.id IS NOT NULL AND act_m.status = 'active' AND act_m.days_remaining <= 7 AND act_m.end_date >= CURRENT_DATE)`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        u.id, u.name, u.email, u.role, u.is_active, u.birth_date, u.phone, u.gender, u.created_at, u.updated_at, u.deleted_at,
        EXTRACT(YEAR FROM age(CURRENT_DATE, u.birth_date))::int AS age,
        p.emergency_contact, p.emergency_phone, p.medical_notes,
        act_m.plan_name AS active_plan_name,
        act_m.start_date AS active_start_date,
        act_m.end_date AS active_end_date,
        act_m.days_remaining,
        act_m.price_paid AS active_price_paid,
        act_m.is_simulated AS active_is_simulated,
        CASE 
          WHEN u.deleted_at IS NOT NULL THEN 'ELIMINADO'
          WHEN act_m.id IS NULL THEN 'SIN MEMBRESÍA'
          WHEN act_m.days_remaining <= 7 AND act_m.days_remaining > 0 THEN 'PRÓXIMA A VENCER'
          WHEN act_m.days_remaining = 0 OR act_m.end_date < CURRENT_DATE THEN 'VENCIDA'
          WHEN act_m.status = 'active' THEN 'ACTIVA'
          ELSE UPPER(act_m.status)
        END AS membership_status_display
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN LATERAL (
        SELECT m.id, m.start_date, m.end_date, m.status, m.price_paid, m.is_simulated, pl.name AS plan_name,
               GREATEST(0, (m.end_date - CURRENT_DATE))::int AS days_remaining
        FROM memberships m
        JOIN plans pl ON m.plan_id = pl.id
        WHERE m.user_id = u.id AND m.status = 'active' AND m.end_date >= CURRENT_DATE
        ORDER BY m.end_date DESC
        LIMIT 1
      ) act_m ON true
      ${whereSql}
      ORDER BY u.id ASC;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR GET /api/admin/users]:', err.message);
    res.status(500).json({ error: 'Error al consultar la lista de usuarios' });
  }
});

// ====================================================================
// 3. GET /api/admin/users/:id - Detalle completo de un usuario
// ====================================================================
router.get('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const pool = getAppPool();

  try {
    const userRes = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.birth_date, u.phone, u.gender, u.created_at, u.updated_at, u.deleted_at,
             EXTRACT(YEAR FROM age(CURRENT_DATE, u.birth_date))::int AS age,
             p.emergency_contact, p.emergency_phone, p.medical_notes, p.avatar_url
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = $1;
    `, [id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userRes.rows[0];

    // Historial de membresías
    const membershipsRes = await pool.query(`
      SELECT m.id, m.start_date, m.end_date, m.status, m.price_paid, m.is_simulated, m.notes, m.created_at,
             p.name AS plan_name, p.slug AS plan_slug, p.duration_days,
             o.order_number,
             GREATEST(0, (m.end_date - CURRENT_DATE))::int AS days_remaining,
             CASE
               WHEN CURRENT_DATE > m.end_date THEN 'expired'
               ELSE m.status
             END AS computed_status
      FROM memberships m
      JOIN plans p ON m.plan_id = p.id
      LEFT JOIN orders o ON m.order_id = o.id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC;
    `, [id]);

    // Historial de pedidos
    const ordersRes = await pool.query(`
      SELECT o.id, o.order_number, o.status, o.total_amount, o.payment_method, o.created_at,
             (o.payment_method = 'simulacion') AS is_simulated
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC;
    `, [id]);

    const ordersWithItems = [];
    for (const order of ordersRes.rows) {
      const itemsRes = await pool.query(
        `SELECT id, item_type, item_id, item_name, unit_price, quantity, subtotal
         FROM order_items WHERE order_id = $1`,
        [order.id]
      );
      ordersWithItems.push({
        ...order,
        items: itemsRes.rows,
      });
    }

    // Registros de consentimiento (Ley 1581)
    const consentRes = await pool.query(`
      SELECT id, policy_version, is_minor_authorized, accepted_at AS created_at, accepted_at, guardian_name, guardian_document
      FROM consent_records
      WHERE user_id = $1
      ORDER BY accepted_at DESC;
    `, [id]);

    // Membresía activa vigente
    const activeMembership = membershipsRes.rows.find((m) => m.computed_status === 'active' && m.days_remaining > 0) || null;

    res.json({
      user,
      active_membership: activeMembership,
      memberships_history: membershipsRes.rows,
      orders_history: ordersWithItems,
      consents: consentRes.rows,
      consent_records: consentRes.rows,
    });
  } catch (err) {
    console.error('[ERROR GET /api/admin/users/:id]:', err.message);
    res.status(500).json({ error: 'Error al consultar detalle del usuario' });
  }
});

// ====================================================================
// 4. PUT /api/admin/users/:id - Actualización de Datos Personales
// ====================================================================
router.put('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, email, phone, birth_date, gender, emergency_contact, emergency_phone, medical_notes, reason } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre completo es obligatorio (mínimo 2 caracteres)' });
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'El correo electrónico ingresado no es válido' });
  }

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verificar si el usuario existe
    const existingRes = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const oldUser = existingRes.rows[0];

    // Verificar unicidad de correo
    const emailCheck = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
      [email.trim(), id]
    );
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El correo electrónico ya pertenece a otro usuario registrado' });
    }

    // Actualizar users
    const updatedUserRes = await client.query(`
      UPDATE users
      SET name = $1, email = $2, phone = $3, birth_date = $4, gender = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, name, email, role, is_active, birth_date, phone, gender, updated_at;
    `, [name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : null, birth_date || null, gender || null, id]);

    // Actualizar profiles
    await client.query(`
      INSERT INTO profiles (user_id, phone, emergency_contact, emergency_phone, medical_notes, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET
        phone = EXCLUDED.phone,
        emergency_contact = EXCLUDED.emergency_contact,
        emergency_phone = EXCLUDED.emergency_phone,
        medical_notes = EXCLUDED.medical_notes,
        updated_at = CURRENT_TIMESTAMP;
    `, [id, phone ? phone.trim() : null, emergency_contact ? emergency_contact.trim() : null, emergency_phone ? emergency_phone.trim() : null, medical_notes || null]);

    // Registro de auditoría
    await client.query(`
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, performed_by, ip_address, reason)
      VALUES ($1, $2, 'UPDATE', $3, $4, $5, $6, $7);
    `, [
      'users',
      id,
      JSON.stringify({ name: oldUser.name, email: oldUser.email, phone: oldUser.phone, birth_date: oldUser.birth_date, gender: oldUser.gender }),
      JSON.stringify({ name, email, phone, birth_date, gender, emergency_contact, emergency_phone, medical_notes }),
      req.user.id,
      req.ip || '127.0.0.1',
      reason || 'Actualización de datos personales por el administrador'
    ]);

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Datos personales actualizados correctamente',
      user: updatedUserRes.rows[0],
      ...updatedUserRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR PUT /api/admin/users/:id]:', err.message);
    res.status(500).json({ error: 'Error al actualizar datos personales del usuario' });
  } finally {
    client.release();
  }
});

// ====================================================================
// 5. PATCH /api/admin/users/:id/status - Activar o Desactivar
// ====================================================================
router.patch('/users/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { is_active, reason } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'El campo is_active debe ser un booleano (true o false)' });
  }

  // Prevenir auto-desactivación del propio administrador autenticado
  if (req.user.id === id && is_active === false) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta de administrador' });
  }

  const pool = getAppPool();
  try {
    const updateRes = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, is_active, updated_at`,
      [is_active, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Auditoría
    await pool.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address, reason)
       VALUES ('users', $1, 'UPDATE', $2, $3, $4, $5)`,
      [id, JSON.stringify({ is_active }), req.user.id, req.ip || '127.0.0.1', reason || (is_active ? 'Activación de usuario' : 'Inactivación de usuario')]
    );

    res.json({
      success: true,
      message: is_active ? 'Usuario activado exitosamente' : 'Usuario inactivado exitosamente',
      user: updateRes.rows[0],
      ...updateRes.rows[0],
    });
  } catch (err) {
    console.error('[ERROR PATCH /api/admin/users/:id/status]:', err.message);
    res.status(500).json({ error: 'Error al actualizar el estado del usuario' });
  }
});

// ====================================================================
// 6. DELETE /api/admin/users/:id - Eliminación Segura / Lógica
// ====================================================================
router.delete('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { reason } = req.body;

  // Prevenir auto-eliminación
  if (req.user.id === id) {
    return res.status(400).json({ error: 'No es posible eliminar la propia cuenta de administrador en sesión.' });
  }

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const user = userRes.rows[0];

    // Verificar relaciones existentes para integridad contable y legal
    const ordersCountRes = await client.query('SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1', [id]);
    const membershipsCountRes = await client.query('SELECT COUNT(*)::int AS count FROM memberships WHERE user_id = $1', [id]);
    const paymentsCountRes = await client.query('SELECT COUNT(*)::int AS count FROM payments WHERE member_id IN (SELECT id FROM members WHERE user_id = $1)', [id]);

    const ordersCount = ordersCountRes.rows[0].count;
    const membershipsCount = membershipsCountRes.rows[0].count;
    const paymentsCount = paymentsCountRes.rows[0].count;

    // Aplicar eliminación lógica segura (Soft Delete)
    await client.query(`
      UPDATE users
      SET is_active = false, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [req.user.id, id]);

    // Registro obligatorio de auditoría
    await client.query(`
      INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address, reason)
      VALUES ($1, $2, 'DELETE', $3, $4, $5, $6);
    `, [
      'users',
      id,
      JSON.stringify({
        deletion_mode: 'logical_safe_delete',
        retained_records: { orders: ordersCount, memberships: membershipsCount, payments: paymentsCount },
        user_name: user.name,
        user_email: user.email,
      }),
      req.user.id,
      req.ip || '127.0.0.1',
      reason || 'Eliminación lógica administrativa solicitada. Registros financieros preservados por integridad legal.'
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      mode: 'logical_deletion',
      message: 'Usuario inactivado y dado de baja de forma lógica. Por razones de auditoría, trazabilidad y cumplimiento legal (Ley 1581 / Estatuto Tributario), se conservan sus pedidos, pagos y membresías históricas asociadas.',
      user_id: id,
      retained_records: {
        orders: ordersCount,
        memberships: membershipsCount,
        payments: paymentsCount,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR DELETE /api/admin/users/:id]:', err.message);
    res.status(500).json({ error: 'Error al procesar la eliminación segura del usuario' });
  } finally {
    client.release();
  }
});

// ====================================================================
// 7. GET /api/admin/memberships - Consulta y Control de Membresías
// ====================================================================
router.get('/memberships', async (req, res) => {
  const { search, status } = req.query;
  const pool = getAppPool();

  try {
    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(LOWER(u.name) LIKE $${paramIdx} OR LOWER(u.email) LIKE $${paramIdx} OR LOWER(p.name) LIKE $${paramIdx} OR LOWER(COALESCE(o.order_number, '')) LIKE $${paramIdx})`);
      params.push(s);
      paramIdx++;
    }

    if (status === 'active') {
      whereClauses.push(`(m.status = 'active' AND m.end_date >= CURRENT_DATE)`);
    } else if (status === 'expiring_soon') {
      whereClauses.push(`(m.status = 'active' AND m.end_date >= CURRENT_DATE AND m.end_date <= CURRENT_DATE + INTERVAL '7 days')`);
    } else if (status === 'expired') {
      whereClauses.push(`(m.end_date < CURRENT_DATE OR m.status = 'expired')`);
    } else if (status === 'cancelled') {
      whereClauses.push(`(m.status = 'cancelled')`);
    } else if (status === 'suspended') {
      whereClauses.push(`(m.status = 'suspended')`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT m.id, m.user_id, m.member_id, m.plan_id, m.order_id, m.start_date, m.end_date, m.status,
             m.price_paid, m.is_simulated, m.notes, m.created_at,
             p.name AS plan_name, p.slug AS plan_slug, p.duration_days,
             u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
             o.order_number,
             GREATEST(0, (m.end_date - CURRENT_DATE))::int AS days_remaining,
             CASE
               WHEN m.status = 'active' AND (m.end_date - CURRENT_DATE) <= 7 AND m.end_date >= CURRENT_DATE THEN 'PRÓXIMA A VENCER'
               WHEN m.status = 'active' AND m.end_date >= CURRENT_DATE THEN 'ACTIVA'
               WHEN m.end_date < CURRENT_DATE OR m.status = 'expired' THEN 'VENCIDA'
               WHEN m.status = 'cancelled' THEN 'CANCELADA'
               WHEN m.status = 'suspended' THEN 'SUSPENDIDA'
               ELSE UPPER(m.status)
             END AS computed_status
      FROM memberships m
      JOIN plans p ON m.plan_id = p.id
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN orders o ON m.order_id = o.id
      ${whereSql}
      ORDER BY m.created_at DESC;
    `;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR GET /api/admin/memberships]:', err.message);
    res.status(500).json({ error: 'Error al consultar membresías' });
  }
});

// ====================================================================
// 8. PATCH /api/admin/memberships/:id - Modificar Membresía con Motivo
// ====================================================================
router.patch('/memberships/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { end_date, status, notes, reason } = req.body;

  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Es obligatorio registrar un motivo claro (mínimo 5 caracteres) para cualquier modificación de membresía.' });
  }

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const memCheck = await client.query('SELECT * FROM memberships WHERE id = $1', [id]);
    if (memCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Membresía no encontrada' });
    }
    const oldMem = memCheck.rows[0];

    const newEndDate = end_date || oldMem.end_date;
    const newStatus = status || oldMem.status;
    const newNotes = notes !== undefined ? notes : oldMem.notes;

    const updateRes = await client.query(`
      UPDATE memberships
      SET end_date = $1, status = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *;
    `, [newEndDate, newStatus, newNotes, id]);

    let eventType = 'reactivated';
    if (newStatus === 'suspended') eventType = 'suspended';
    else if (newStatus === 'cancelled') eventType = 'cancelled';
    else if (newStatus === 'expired') eventType = 'expired';
    else if (newEndDate !== oldMem.end_date) eventType = 'renewed';
    else if (newStatus === 'active') eventType = 'reactivated';

    // Registrar en ciclo de vida
    await client.query(`
      INSERT INTO membership_events (membership_id, event_type, new_status, reason, actor_id)
      VALUES ($1, $2, $3, $4, $5);
    `, [id, eventType, newStatus, reason.trim(), req.user.id]);

    // Registrar en auditoría
    await client.query(`
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, performed_by, ip_address, reason)
      VALUES ($1, $2, 'UPDATE', $3, $4, $5, $6, $7);
    `, [
      'memberships',
      id,
      JSON.stringify({ end_date: oldMem.end_date, status: oldMem.status, notes: oldMem.notes }),
      JSON.stringify({ end_date: newEndDate, status: newStatus, notes: newNotes }),
      req.user.id,
      req.ip || '127.0.0.1',
      reason.trim()
    ]);

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Membresía actualizada correctamente',
      membership: updateRes.rows[0],
      ...updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR PATCH /api/admin/memberships/:id]:', err.message);
    res.status(500).json({ error: 'Error al modificar membresía' });
  } finally {
    client.release();
  }
});

// ====================================================================
// 9. GET /api/admin/plans - Listado Administrativo de Planes
// ====================================================================
router.get('/plans', async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(`
      SELECT id, name, slug, duration_days, daily_hours_limit, description, price, price_unconfirmed, is_active, created_at, updated_at,
             (SELECT COUNT(*) FROM memberships m WHERE m.plan_id = plans.id)::int AS total_sold_count
      FROM plans
      ORDER BY id ASC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR GET /api/admin/plans]:', err.message);
    res.status(500).json({ error: 'Error al consultar planes' });
  }
});

// ====================================================================
// 10. GET /api/admin/plans/:id/history - Historial de Precios y Duración
// ====================================================================
router.get('/plans/:id/history', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const pool = getAppPool();

  try {
    const result = await pool.query(`
      SELECT h.id, h.plan_id, h.old_price, h.new_price, h.old_duration_days, h.new_duration_days,
             h.reason, h.created_at, u.name AS changed_by_name, u.email AS changed_by_email
      FROM plan_price_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.plan_id = $1
      ORDER BY h.created_at DESC;
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR GET /api/admin/plans/:id/history]:', err.message);
    res.status(500).json({ error: 'Error al consultar historial del plan' });
  }
});

// ====================================================================
// 11. PUT /api/admin/plans/:id - Modificar Precio, Duración y Condiciones
// ====================================================================
router.put('/plans/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, price, duration_days, description, is_active, reason } = req.body;

  const parsedPrice = parseFloat(price);
  const parsedDuration = parseInt(duration_days, 10);

  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'El precio debe ser un número válido mayor a cero.' });
  }

  if (isNaN(parsedDuration) || parsedDuration <= 0 || parsedDuration > 3650) {
    return res.status(400).json({ error: 'La duración en días debe ser un número entero positivo razonable (1 a 3650 días).' });
  }

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const planRes = await client.query('SELECT * FROM plans WHERE id = $1', [id]);
    if (planRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    const oldPlan = planRes.rows[0];

    // Registrar en historial si hubo cambio en precio o duración
    const priceChanged = parseFloat(oldPlan.price) !== parsedPrice;
    const durationChanged = oldPlan.duration_days !== parsedDuration;

    if (priceChanged || durationChanged) {
      await client.query(`
        INSERT INTO plan_price_history (
          plan_id, old_price, new_price, old_duration_days, new_duration_days, changed_by, reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [
        id,
        oldPlan.price,
        parsedPrice,
        oldPlan.duration_days,
        parsedDuration,
        req.user.id,
        reason || 'Actualización administrativa de precio/duración'
      ]);
    }

    // Actualizar plan en PostgreSQL
    const updateRes = await client.query(`
      UPDATE plans
      SET name = COALESCE($1, name),
          price = $2,
          duration_days = $3,
          description = COALESCE($4, description),
          is_active = COALESCE($5, is_active),
          price_unconfirmed = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *;
    `, [name ? name.trim() : null, parsedPrice, parsedDuration, description || null, is_active !== undefined ? is_active : oldPlan.is_active, id]);

    // Auditoría
    await client.query(`
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, performed_by, ip_address, reason)
      VALUES ($1, $2, 'UPDATE', $3, $4, $5, $6, $7);
    `, [
      'plans',
      id,
      JSON.stringify({ name: oldPlan.name, price: oldPlan.price, duration_days: oldPlan.duration_days, is_active: oldPlan.is_active }),
      JSON.stringify({ name: updateRes.rows[0].name, price: parsedPrice, duration_days: parsedDuration, is_active: updateRes.rows[0].is_active }),
      req.user.id,
      req.ip || '127.0.0.1',
      reason || 'Modificación de parámetros del plan por administrador'
    ]);

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Plan actualizado correctamente',
      plan: updateRes.rows[0],
      ...updateRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR PUT /api/admin/plans/:id]:', err.message);
    res.status(500).json({ error: 'Error al actualizar las condiciones del plan' });
  } finally {
    client.release();
  }
});

// ====================================================================
// 12. PATCH /api/admin/plans/:id/status - Activar o Desactivar Plan
// ====================================================================
router.patch('/plans/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'El campo is_active debe ser booleano' });
  }

  const pool = getAppPool();
  try {
    const updateRes = await pool.query(
      `UPDATE plans SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, slug, is_active, price`,
      [is_active, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    await pool.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address, reason)
       VALUES ('plans', $1, 'UPDATE', $2, $3, $4, $5)`,
      [id, JSON.stringify({ is_active }), req.user.id, req.ip || '127.0.0.1', is_active ? 'Activación de plan' : 'Desactivación de plan']
    );

    res.json({
      success: true,
      message: is_active ? 'Plan activado en el catálogo' : 'Plan ocultado del catálogo',
      plan: updateRes.rows[0],
      ...updateRes.rows[0],
    });
  } catch (err) {
    console.error('[ERROR PATCH /api/admin/plans/:id/status]:', err.message);
    res.status(500).json({ error: 'Error al actualizar el estado del plan' });
  }
});

// ====================================================================
// 13. GET /api/admin/orders - Consulta de Pedidos
// ====================================================================
router.get('/orders', async (req, res) => {
  const pool = getAppPool();
  try {
    const query = `
      SELECT o.id, o.order_number, o.user_id, o.status, o.total_amount, o.payment_method, o.notes, o.created_at,
             u.name AS user_name, u.email AS user_email,
             (o.payment_method = 'simulacion') AS is_simulated
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC;
    `;
    const ordersRes = await pool.query(query);

    const ordersWithItems = [];
    for (const order of ordersRes.rows) {
      const itemsRes = await pool.query(
        `SELECT id, item_type, item_id, item_name, unit_price, quantity, subtotal
         FROM order_items WHERE order_id = $1`,
        [order.id]
      );
      ordersWithItems.push({
        ...order,
        items: itemsRes.rows,
      });
    }

    res.json(ordersWithItems);
  } catch (err) {
    console.error('[ERROR GET /api/admin/orders]:', err.message);
    res.status(500).json({ error: 'Error al consultar pedidos' });
  }
});

// ====================================================================
// 14. GET /api/admin/audit-logs - Trazabilidad y Seguridad
// ====================================================================
router.get('/audit-logs', async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(`
      SELECT a.id, a.table_name, a.record_id, a.action, a.old_data, a.new_data, a.performed_by, a.ip_address, a.reason, a.created_at,
             u.name AS performer_name, u.email AS performer_email
      FROM audit_logs a
      LEFT JOIN users u ON a.performed_by = u.id
      ORDER BY a.created_at DESC
      LIMIT 150;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR GET /api/admin/audit-logs]:', err.message);
    res.status(500).json({ error: 'Error al consultar logs de auditoría' });
  }
});

// ====================================================================
// 15. GET /api/admin/config - Información y Políticas del Sistema
// ====================================================================
router.get('/config', async (req, res) => {
  const pool = getAppPool();
  try {
    const dbInfo = await pool.query('SELECT current_database(), current_user, version()');
    res.json({
      application: 'ZONA FITNESS Core API',
      version: '2.0.0-PRO',
      environment: process.env.NODE_ENV || 'development',
      database: {
        engine: 'PostgreSQL 18',
        connected_db: dbInfo.rows[0].current_database,
        connected_user: dbInfo.rows[0].current_user,
        server_version: dbInfo.rows[0].version,
      },
      security_policies: {
        rbac_enabled: true,
        audit_logging: 'ACTIVE',
        data_protection_law: 'Ley 1581 de 2012 / Decreto 1377 de 2013 (Colombia)',
        payment_mode: 'SIMULACIÓN — SIN COBRO REAL',
        password_hashing: 'Bcrypt (cost 10)',
        jwt_expiration: '24h',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar configuración' });
  }
});

// ====================================================================
// 16. GET /api/admin/payments - Listado de Pagos y Comprobantes
// ====================================================================
router.get('/payments', async (req, res) => {
  const { status, search } = req.query;
  const pool = getAppPool();

  try {
    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    if (status && status !== 'all') {
      whereClauses.push(`p.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(LOWER(u.name) LIKE $${paramIdx} OR LOWER(u.email) LIKE $${paramIdx} OR LOWER(COALESCE(u.phone, '')) LIKE $${paramIdx} OR LOWER(COALESCE(o.order_number, '')) LIKE $${paramIdx})`);
      params.push(s);
      paramIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT p.id, p.member_id, p.order_id, p.amount, p.payment_date, p.payment_method,
             p.reference_number, p.status, p.verified_by, p.verified_at, p.notes,
             p.receipt_path, p.receipt_original_name, p.receipt_mime_type, p.receipt_size_bytes, p.rejection_reason, p.created_at,
             u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
             o.order_number,
             (SELECT pl.name FROM order_items oi JOIN plans pl ON oi.item_id = pl.id WHERE oi.order_id = o.id AND oi.item_type = 'plan' LIMIT 1) AS plan_name,
             (SELECT pl.duration_days FROM order_items oi JOIN plans pl ON oi.item_id = pl.id WHERE oi.order_id = o.id AND oi.item_type = 'plan' LIMIT 1) AS plan_duration_days,
             admin_u.name AS verified_by_name
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN users admin_u ON p.verified_by = admin_u.id
      ${whereSql}
      ORDER BY p.created_at DESC;
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[ERROR GET /api/admin/payments]:', err.message);
    res.status(500).json({ error: 'Error al consultar pagos' });
  }
});

// ====================================================================
// 17. POST /api/admin/payments/:id/approve - Aprobación y Activación Atómica
// ====================================================================
router.post('/payments/:id/approve', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Bloquear registro con FOR UPDATE para prevenir aprobaciones concurrentes
    const payRes = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [id]);
    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const payment = payRes.rows[0];

    // Control estricto de idempotencia: solo aprobar si está pendiente
    if (payment.status !== 'pending_verification' && payment.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `El pago ya fue procesado previamente con estado "${payment.status}". No puede ser aprobado nuevamente.`,
      });
    }

    // Actualizar estado del pago
    const updatePayRes = await client.query(
      `UPDATE payments
       SET status = 'approved', verified_by = $1, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    // Actualizar pedido
    if (payment.order_id) {
      await client.query(
        `UPDATE orders SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [payment.order_id]
      );
    }

    // Obtener información del usuario propietario del pedido
    let targetUserId = null;
    if (payment.order_id) {
      const orderOwnerRes = await client.query('SELECT user_id FROM orders WHERE id = $1', [payment.order_id]);
      if (orderOwnerRes.rows.length > 0) {
        targetUserId = orderOwnerRes.rows[0].user_id;
      }
    }

    if (!targetUserId && payment.member_id) {
      const memberUserRes = await client.query('SELECT user_id FROM members WHERE id = $1', [payment.member_id]);
      if (memberUserRes.rows.length > 0) {
        targetUserId = memberUserRes.rows[0].user_id;
      }
    }

    // Consultar planes comprados en order_items
    const itemsRes = await client.query(
      `SELECT oi.item_id, oi.unit_price, oi.quantity, p.id AS plan_id, p.name AS plan_name, p.duration_days
       FROM order_items oi
       JOIN plans p ON oi.item_id = p.id
       WHERE oi.order_id = $1 AND oi.item_type = 'plan'`,
      [payment.order_id]
    );

    const activatedMemberships = [];

    for (const item of itemsRes.rows) {
      const durationDays = item.duration_days || 30;

      // Crear membresía activa vinculada al pedido y pago
      const memRes = await client.query(
        `INSERT INTO memberships (
           user_id, member_id, plan_id, order_id, start_date, end_date, status, price_paid, is_simulated, notes
         ) VALUES (
           $1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + ($5 || ' days')::interval, 'active', $6, false, 'Membresía activada tras verificar comprobante de transferencia'
         ) RETURNING id, user_id, plan_id, start_date, end_date, status, price_paid, created_at`,
        [targetUserId, payment.member_id, item.plan_id, payment.order_id, durationDays, item.unit_price]
      );

      const mem = memRes.rows[0];
      mem.plan_name = item.plan_name;
      activatedMemberships.push(mem);

      // Evento de ciclo de vida
      await client.query(
        `INSERT INTO membership_events (membership_id, event_type, new_status, reason, actor_id)
         VALUES ($1, 'activated', 'active', 'Aprobación de transferencia bancaria por administración', $2)`,
        [mem.id, req.user.id]
      );
    }

    // Auditoría
    await client.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address, reason)
       VALUES ($1, $2, 'UPDATE', $3, $4, $5, $6)`,
      [
        'payments',
        id,
        JSON.stringify({
          action_type: 'APPROVE_PAYMENT',
          payment_id: id,
          order_id: payment.order_id,
          amount: payment.amount,
          status: 'approved',
          memberships_created: activatedMemberships.length,
        }),
        req.user.id,
        req.ip || '127.0.0.1',
        'Administrador verificó y aprobó el comprobante de transferencia bancaria.',
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Comprobante verificado. Pago aprobado y membresía activada exitosamente.',
      payment: updatePayRes.rows[0],
      memberships: activatedMemberships,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR POST /api/admin/payments/:id/approve]:', err.message);
    res.status(500).json({ error: 'Error al aprobar el pago' });
  } finally {
    client.release();
  }
});

// ====================================================================
// 18. POST /api/admin/payments/:id/reject - Rechazo de Pago con Motivo
// ====================================================================
router.post('/payments/:id/reject', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { reason } = req.body;

  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: 'Es obligatorio ingresar un motivo claro del rechazo (mínimo 5 caracteres).' });
  }

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const payRes = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [id]);
    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const payment = payRes.rows[0];

    if (payment.status === 'approved' || payment.status === 'verified') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No es posible rechazar un pago que ya ha sido previamente aprobado.' });
    }

    // Actualizar estado a 'rejected'
    const updatePayRes = await client.query(
      `UPDATE payments
       SET status = 'rejected', verified_by = $1, verified_at = CURRENT_TIMESTAMP, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [req.user.id, reason.trim(), id]
    );

    // Actualizar pedido a 'rejected'
    if (payment.order_id) {
      await client.query(
        `UPDATE orders SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [payment.order_id]
      );
    }

    // Auditoría
    await client.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address, reason)
       VALUES ($1, $2, 'UPDATE', $3, $4, $5, $6)`,
      [
        'payments',
        id,
        JSON.stringify({
          action_type: 'REJECT_PAYMENT',
          payment_id: id,
          order_id: payment.order_id,
          amount: payment.amount,
          status: 'rejected',
          rejection_reason: reason.trim(),
        }),
        req.user.id,
        req.ip || '127.0.0.1',
        reason.trim(),
      ]
    );

    // ¡REGLA FUNDAMENTAL: NINGUNA MEMBRESÍA SE CREA NI SE ACTIVA!
    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'El pago ha sido rechazado correctamente. El cliente podrá ver el motivo en Mi Cuenta.',
      payment: updatePayRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR POST /api/admin/payments/:id/reject]:', err.message);
    res.status(500).json({ error: 'Error al rechazar el pago' });
  } finally {
    client.release();
  }
});

// ====================================================================
// 19. POST /api/admin/users/bulk-status - Activación / Inactivación Masiva
// ====================================================================
router.post('/users/bulk-status', async (req, res) => {
  const { user_ids, is_active, reason } = req.body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar una lista no vacía de identificadores de usuario (user_ids).' });
  }

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'El campo is_active debe ser booleano (true o false).' });
  }

  const pool = getAppPool();
  const processed = [];
  const omitted = [];

  for (const rawId of user_ids) {
    const id = parseInt(rawId, 10);
    if (isNaN(id) || id <= 0) {
      omitted.push({ id: rawId, reason: 'ID de usuario no numérico o inválido' });
      continue;
    }

    // Regla de seguridad: el admin no puede auto-desactivarse
    if (id === req.user.id && is_active === false) {
      omitted.push({ id, reason: 'No puedes desactivar tu propia cuenta de administrador en sesión' });
      continue;
    }

    try {
      const updateRes = await pool.query(
        `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL RETURNING id, name, email`,
        [is_active, id]
      );

      if (updateRes.rows.length === 0) {
        omitted.push({ id, reason: 'Usuario no encontrado o ya eliminado lógicamente' });
        continue;
      }

      processed.push(id);
    } catch (err) {
      omitted.push({ id, reason: err.message });
    }
  }

  // Registrar auditoría de la acción masiva
  if (processed.length > 0) {
    await pool.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address, reason)
       VALUES ('users', $1, 'UPDATE', $2, $3, $4, $5)`,
      [
        processed[0],
        JSON.stringify({ action_type: 'BULK_UPDATE_STATUS', affected_count: processed.length, user_ids: processed, new_is_active: is_active }),
        req.user.id,
        req.ip || '127.0.0.1',
        reason || `Acción masiva: ${is_active ? 'Activación' : 'Inactivación'} de ${processed.length} usuarios`,
      ]
    );
  }

  res.json({
    success: true,
    processed,
    omitted,
    count: processed.length,
    message: `Operación masiva completada: ${processed.length} usuarios modificados, ${omitted.length} omitidos.`,
  });
});

// ====================================================================
// 20. POST /api/admin/users/bulk-delete - Eliminación Lógica Masiva Segura
// ====================================================================
router.post('/users/bulk-delete', async (req, res) => {
  const { user_ids, reason } = req.body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar una lista no vacía de identificadores de usuario (user_ids).' });
  }

  const pool = getAppPool();
  const processed = [];
  const omitted = [];

  for (const rawId of user_ids) {
    const id = parseInt(rawId, 10);
    if (isNaN(id) || id <= 0) {
      omitted.push({ id: rawId, reason: 'ID de usuario inválido' });
      continue;
    }

    // Regla de seguridad: el admin no puede auto-eliminarse
    if (id === req.user.id) {
      omitted.push({ id, reason: 'No puedes eliminar tu propia cuenta de administrador en sesión' });
      continue;
    }

    try {
      const updateRes = await pool.query(
        `UPDATE users
         SET is_active = false, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND deleted_at IS NULL
         RETURNING id, name, email`,
        [req.user.id, id]
      );

      if (updateRes.rows.length === 0) {
        omitted.push({ id, reason: 'Usuario no encontrado o ya eliminado previamente' });
        continue;
      }

      processed.push(id);
    } catch (err) {
      omitted.push({ id, reason: err.message });
    }
  }

  // Registrar auditoría de la baja lógica masiva
  if (processed.length > 0) {
    await pool.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address, reason)
       VALUES ('users', $1, 'DELETE', $2, $3, $4, $5)`,
      [
        processed[0],
        JSON.stringify({ action_type: 'BULK_SOFT_DELETE', affected_count: processed.length, user_ids: processed }),
        req.user.id,
        req.ip || '127.0.0.1',
        reason || `Baja lógica masiva de ${processed.length} usuarios. Registros contables preservados.`,
      ]
    );
  }

  res.json({
    success: true,
    processed,
    omitted,
    count: processed.length,
    message: `Baja lógica masiva completada: ${processed.length} usuarios dados de baja, ${omitted.length} omitidos.`,
  });
});

module.exports = router;
