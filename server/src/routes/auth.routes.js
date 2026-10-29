const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAppPool } = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { parseAndValidateBirthDate, isValidEmail } = require('../utils/validation');
const { CURRENT_POLICY_VERSION, CONSENT_TEXT_SNAPSHOT, FULL_POLICY_DOCUMENT } = require('../config/privacy_policy');

const router = express.Router();

// ====================================================================
// 1. CONSULTA PÚBLICA DE LA POLÍTICA DE PRIVACIDAD
// ====================================================================
router.get('/legal/privacy-policy', (req, res) => {
  res.json(FULL_POLICY_DOCUMENT);
});

// ====================================================================
// 2. REGISTRO DE USUARIOS CON CONSENTIMIENTO Y VALIDACIÓN DE EDAD
// ====================================================================
router.post('/register', async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    birth_date,
    gender,
    accepted_privacy_policy,
    guardian_name,
    guardian_document,
    guardian_phone,
  } = req.body;

  // 1. Validaciones básicas de campos requeridos
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'El nombre completo es obligatorio y debe tener al menos 2 caracteres' });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Debe proporcionar un correo electrónico válido' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  // 2. Validación obligatoria del consentimiento (Ley 1581 de 2012)
  if (accepted_privacy_policy === false || (accepted_privacy_policy !== true && accepted_privacy_policy !== undefined)) {
    return res.status(400).json({ error: 'Debe aceptar la política de tratamiento de datos personales para registrarse' });
  }

  // 3. Validación autoritativa de edad en servidor
  let formattedBirthDate = null;
  let isMinor = false;

  if (birth_date) {
    const ageResult = parseAndValidateBirthDate(birth_date);
    if (!ageResult.valid) {
      return res.status(400).json({ error: ageResult.error });
    }

    if (!ageResult.isAllowed) {
      return res.status(403).json({
        error: 'Zona Fitness requiere una edad mínima de 14 años para registrarse en la plataforma y hacer uso de las instalaciones.',
        code: 'UNDERAGE_RESTRICTED',
      });
    }

    formattedBirthDate = ageResult.formattedDate;
    isMinor = ageResult.isMinor;
  }

  // Validar género permitido si fue enviado
  const validGenders = ['femenino', 'masculino', 'no_binario', 'prefiero_no_decir', 'otro'];
  const normalizedGender = gender && validGenders.includes(gender.toLowerCase()) ? gender.toLowerCase() : (gender || null);

  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 4. Verificar correo duplicado
    const normalizedEmail = email.toLowerCase().trim();
    const existingRes = await client.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El correo electrónico ya se encuentra registrado' });
    }

    // 5. Hash seguro de contraseña con bcrypt (cost 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 6. Asignación de rol seguro: NUNCA permitir auto-asignación de roles privilegiados
    // Todos los registros públicos se crean estrictamente con rol 'user'
    const role = 'user';

    const insertUserRes = await client.query(
      `INSERT INTO users (
        name, email, password_hash, role, is_active, birth_date, phone, gender, force_password_change
      ) VALUES ($1, $2, $3, $4, true, $5, $6, $7, false)
      RETURNING id, name, email, role, is_active, birth_date, phone, gender, created_at`,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        role,
        formattedBirthDate,
        phone ? phone.trim() : null,
        normalizedGender,
      ]
    );

    const newUser = insertUserRes.rows[0];

    // 7. Crear perfil complementario
    await client.query(
      `INSERT INTO profiles (user_id, phone) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
      [newUser.id, phone ? phone.trim() : null]
    );

    // 8. Registro obligatorio de consentimiento en consent_records (Trazabilidad Ley 1581)
    // El consentimiento se registra de forma atómica: si falla, toda la transacción se revierte
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconocido';

    await client.query(
      `INSERT INTO consent_records (
        user_id, policy_version, consent_text_snapshot, is_minor_authorized,
        guardian_name, guardian_document, guardian_phone, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        newUser.id,
        CURRENT_POLICY_VERSION,
        CONSENT_TEXT_SNAPSHOT,
        isMinor,
        guardian_name ? guardian_name.trim() : null,
        guardian_document ? guardian_document.trim() : null,
        guardian_phone ? guardian_phone.trim() : null,
        typeof clientIp === 'string' ? clientIp.split(',')[0].trim() : '127.0.0.1',
        userAgent,
      ]
    );

    // 9. Registro en auditoría
    await client.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        'users',
        newUser.id,
        'INSERT',
        JSON.stringify({ name: newUser.name, email: newUser.email, role: newUser.role, is_minor: isMinor }),
        typeof clientIp === 'string' ? clientIp.split(',')[0].trim() : '127.0.0.1',
      ]
    );

    await client.query('COMMIT');

    res.status(201).json(newUser);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR REGISTRO]:', err.message);
    res.status(500).json({ error: 'Error interno del servidor al procesar el registro' });
  } finally {
    client.release();
  }
});

// ====================================================================
// 3. INICIO DE SESIÓN (LOGIN)
// ====================================================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Debe ingresar correo y contraseña' });
  }

  const pool = getAppPool();
  try {
    const userRes = await pool.query(
      `SELECT id, name, email, password_hash, role, is_active, birth_date, phone, gender, force_password_change
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'La cuenta se encuentra inactiva. Contacte al administrador.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    // Auditoría de login
    await pool.query(
      `INSERT INTO audit_logs (table_name, record_id, action, performed_by, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      ['users', user.id, 'LOGIN', user.id, req.ip || '127.0.0.1']
    );

    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        birth_date: user.birth_date,
        phone: user.phone,
        gender: user.gender,
        force_password_change: user.force_password_change,
      },
    });
  } catch (err) {
    console.error('[ERROR LOGIN]:', err.message);
    res.status(500).json({ error: 'Error interno del servidor al autenticar' });
  }
});

// ====================================================================
// 4. CONSULTA Y ACTUALIZACIÓN DE PERFIL PROPIO (IDOR PROTEGIDO)
// ====================================================================
router.get('/profile', authenticateToken, async (req, res) => {
  const pool = getAppPool();
  try {
    const userRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.birth_date, u.phone, u.gender, u.created_at,
              p.emergency_contact, p.emergency_phone, p.medical_notes
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const consentRes = await pool.query(
      `SELECT policy_version, accepted_at, is_minor_authorized
       FROM consent_records
       WHERE user_id = $1
       ORDER BY accepted_at DESC LIMIT 1`,
      [req.user.id]
    );

    const user = userRes.rows[0];
    user.consent = consentRes.rows[0] || null;

    res.json(user);
  } catch (err) {
    console.error('[ERROR PERFIL]:', err.message);
    res.status(500).json({ error: 'Error al consultar perfil de usuario' });
  }
});

router.patch('/profile', authenticateToken, async (req, res) => {
  const { name, phone, gender, birth_date, emergency_contact, emergency_phone } = req.body;

  // El endpoint opera estrictamente sobre req.user.id (prevención de IDOR)
  const userId = req.user.id;

  const updates = [];
  const values = [];
  let paramIdx = 1;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' });
    }
    updates.push(`name = $${paramIdx++}`);
    values.push(name.trim());
  }

  if (phone !== undefined) {
    updates.push(`phone = $${paramIdx++}`);
    values.push(phone ? String(phone).trim() : null);
  }

  if (gender !== undefined) {
    const validGenders = ['femenino', 'masculino', 'no_binario', 'prefiero_no_decir', 'otro'];
    const g = gender && validGenders.includes(gender.toLowerCase()) ? gender.toLowerCase() : null;
    updates.push(`gender = $${paramIdx++}`);
    values.push(g);
  }

  if (birth_date !== undefined) {
    if (birth_date) {
      const ageRes = parseAndValidateBirthDate(birth_date);
      if (!ageRes.valid) {
        return res.status(400).json({ error: ageRes.error });
      }
      if (!ageRes.isAllowed) {
        return res.status(403).json({
          error: 'Zona Fitness requiere una edad mínima de 14 años.',
          code: 'UNDERAGE_RESTRICTED',
        });
      }
      updates.push(`birth_date = $${paramIdx++}`);
      values.push(ageRes.formattedDate);
    } else {
      updates.push(`birth_date = $${paramIdx++}`);
      values.push(null);
    }
  }

  if (updates.length === 0 && !emergency_contact && !emergency_phone) {
    return res.status(400).json({ error: 'No se enviaron campos válidos para actualizar' });
  }

  const pool = getAppPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let updatedUser = null;
    if (updates.length > 0) {
      values.push(userId);
      const sql = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIdx}
        RETURNING id, name, email, role, is_active, birth_date, phone, gender, updated_at
      `;
      const userRes = await client.query(sql, values);
      updatedUser = userRes.rows[0];
    } else {
      const uRes = await client.query(
        'SELECT id, name, email, role, is_active, birth_date, phone, gender, updated_at FROM users WHERE id = $1',
        [userId]
      );
      updatedUser = uRes.rows[0];
    }

    // Actualizar datos de perfil si aplican
    if (emergency_contact !== undefined || emergency_phone !== undefined) {
      await client.query(
        `UPDATE profiles
         SET emergency_contact = COALESCE($1, emergency_contact),
             emergency_phone = COALESCE($2, emergency_phone)
         WHERE user_id = $3`,
        [emergency_contact || null, emergency_phone || null, userId]
      );
    }

    // Auditoría de actualización de perfil
    await client.query(
      `INSERT INTO audit_logs (table_name, record_id, action, new_data, performed_by, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['users', userId, 'UPDATE', JSON.stringify({ name, phone, gender, birth_date }), userId, req.ip || '127.0.0.1']
    );

    await client.query('COMMIT');
    res.json(updatedUser);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ERROR ACTUALIZAR PERFIL]:', err.message);
    res.status(500).json({ error: 'Error al actualizar información del perfil' });
  } finally {
    client.release();
  }
});

module.exports = router;
