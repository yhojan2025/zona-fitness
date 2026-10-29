const express = require('express');
const { getAppPool } = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - Solo administradores
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(`
      SELECT id, name, email, role, is_active, created_at, updated_at
      FROM users
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar usuarios:', err.message);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

// PATCH /api/users/:id - Actualizar rol o estado (Solo administradores)
router.patch('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role, is_active } = req.body;

  const updates = [];
  const values = [];
  let paramIdx = 1;

  if (role !== undefined) {
    const validRoles = ['admin', 'agent', 'trainer', 'member', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Rol no válido. Permitidos: ${validRoles.join(', ')}` });
    }
    updates.push(`role = $${paramIdx++}`);
    values.push(role);
  }

  if (is_active !== undefined) {
    updates.push(`is_active = $${paramIdx++}`);
    values.push(Boolean(is_active));
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar' });
  }

  values.push(id);
  const sql = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${paramIdx}
    RETURNING id, name, email, role, is_active, updated_at
  `;

  const pool = getAppPool();
  try {
    const result = await pool.query(sql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Auditoría de cambio de usuario
    await pool.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['users', id, 'UPDATE', JSON.stringify({ role, is_active }), req.user.id, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar usuario:', err.message);
    res.status(500).json({ error: 'Error interno al actualizar usuario' });
  }
});

module.exports = router;
