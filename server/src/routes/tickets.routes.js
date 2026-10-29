const express = require('express');
const { getAppPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/tickets - Listar tickets
router.get('/', authenticateToken, async (req, res) => {
  const pool = getAppPool();
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.priority,
        t.status,
        t.created_at,
        u.id as author_id,
        u.name as author_name
      FROM tickets t
      JOIN users u ON t.author_id = u.id
      ORDER BY t.created_at DESC
    `);

    const tickets = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      created_at: row.created_at,
      author: {
        id: row.author_id,
        name: row.author_name,
      },
    }));

    res.json(tickets);
  } catch (err) {
    console.error('Error al listar tickets:', err.message);
    res.status(500).json({ error: 'Error al consultar tickets' });
  }
});

// POST /api/tickets - Crear ticket
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, priority } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Título y descripción son requeridos' });
  }

  const validPriority = ['low', 'medium', 'high'].includes(priority) ? priority : 'medium';
  const pool = getAppPool();

  try {
    const insertRes = await pool.query(
      `INSERT INTO tickets (title, description, priority, author_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, priority, status, created_at`,
      [title.trim(), description.trim(), validPriority, req.user.id]
    );

    const ticket = insertRes.rows[0];
    ticket.author = { id: req.user.id, name: req.user.name };

    res.status(201).json(ticket);
  } catch (err) {
    console.error('Error al crear ticket:', err.message);
    res.status(500).json({ error: 'Error al registrar ticket' });
  }
});

// PATCH /api/tickets/:id - Actualizar estado
router.patch('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['open', 'in_progress', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Debe ser open, in_progress o closed' });
  }

  const pool = getAppPool();
  try {
    const updateRes = await pool.query(
      `UPDATE tickets
       SET status = $1
       WHERE id = $2
       RETURNING id, title, description, priority, status, created_at, author_id`,
      [status, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const row = updateRes.rows[0];
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [row.author_id]);
    row.author = {
      id: row.author_id,
      name: userRes.rows[0]?.name || 'Desconocido',
    };
    delete row.author_id;

    res.json(row);
  } catch (err) {
    console.error('Error al actualizar ticket:', err.message);
    res.status(500).json({ error: 'Error al actualizar ticket' });
  }
});

// DELETE /api/tickets/:id - Eliminar ticket
router.delete('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const pool = getAppPool();

  try {
    const checkRes = await pool.query('SELECT author_id FROM tickets WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Permitir solo al autor o a un administrador
    if (checkRes.rows[0].author_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado para eliminar este ticket' });
    }

    await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar ticket:', err.message);
    res.status(500).json({ error: 'Error al eliminar ticket' });
  }
});

module.exports = router;
