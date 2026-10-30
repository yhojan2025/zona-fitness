const express = require('express');
const path = require('path');
const fs = require('fs');
const { getAppPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const STORAGE_DIR = path.resolve(__dirname, '..', '..', 'storage', 'receipts');

// GET /api/payments/:id/receipt - Descarga/visualización protegida del comprobante
router.get('/:id/receipt', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Identificador de pago inválido' });
  }

  const pool = getAppPool();
  try {
    const payRes = await pool.query(
      `SELECT p.id, p.receipt_path, p.receipt_mime_type, p.receipt_original_name, p.status, o.user_id
       FROM payments p
       LEFT JOIN orders o ON p.order_id = o.id
       WHERE p.id = $1`,
      [id]
    );

    if (payRes.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de pago no encontrado' });
    }

    const payment = payRes.rows[0];

    // Control de acceso: solo el propietario del pago o un administrador autorizado
    if (req.user.role !== 'admin' && req.user.id !== payment.user_id) {
      return res.status(403).json({ error: 'Acceso no autorizado: No tienes permiso para consultar este comprobante' });
    }

    if (!payment.receipt_path) {
      return res.status(404).json({ error: 'Este pago no tiene comprobante adjunto' });
    }

    // Prevención de directory traversal
    const safeFilename = path.basename(payment.receipt_path);
    const fullPath = path.resolve(STORAGE_DIR, safeFilename);

    if (!fullPath.startsWith(STORAGE_DIR)) {
      return res.status(403).json({ error: 'Ruta de archivo no permitida' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'El archivo físico del comprobante no fue encontrado en el servidor' });
    }

    // Cabeceras de seguridad
    res.setHeader('Content-Type', payment.receipt_mime_type || 'image/jpeg');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'private, max-age=3600');

    res.sendFile(fullPath);
  } catch (err) {
    console.error('[ERROR GET /api/payments/:id/receipt]:', err.message);
    res.status(500).json({ error: 'Error al consultar el comprobante' });
  }
});

module.exports = router;
