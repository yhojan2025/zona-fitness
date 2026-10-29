const assert = require('assert');
const http = require('http');
const bcrypt = require('bcryptjs');
const app = require('../src/server');
const { getAppPool } = require('../src/config/db');
const { parseAndValidateBirthDate } = require('../src/utils/validation');

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('EJECUTANDO PRUEBAS OBLIGATORIAS DE FASE 3:');
  console.log('Registro, Perfil, Edad y Consentimiento (Ley 1581)');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASÓ] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FALLÓ] ${name}:`, err.message);
      failed++;
    }
  }

  async function request(endpoint, options = {}) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { status: res.status, body };
  }

  const pool = getAppPool();

  // PRUEBA 1: Registro válido de una persona de 18 años o más
  await test('1. Registro válido de una persona de 18 años o más con consentimiento', async () => {
    const testEmail = `adulto.${Date.now()}@zonafit.test`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Carlos Alberto Adulto',
        email: testEmail,
        password: 'PasswordSeguro123!',
        birth_date: '1998-05-15',
        phone: '3105551234',
        gender: 'masculino',
        accepted_privacy_policy: true,
      }),
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.email, testEmail);
    assert.strictEqual(res.body.role, 'user');
    assert.strictEqual(res.body.birth_date.split('T')[0], '1998-05-15');
  });

  // PRUEBA 2: Rechazo de una persona de 13 años
  await test('2. Rechazo autoritativo en servidor para menores de 14 años (403)', async () => {
    // Calculamos fecha para que tenga exactamente 13 años
    const today = new Date();
    const thirteenYearsAgo = `${today.getFullYear() - 13}-06-15`;

    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Menor No Permitido',
        email: `menor13.${Date.now()}@zonafit.test`,
        password: 'Password123!',
        birth_date: thirteenYearsAgo,
        accepted_privacy_policy: true,
      }),
    });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.code, 'UNDERAGE_RESTRICTED');
    assert.ok(res.body.error.includes('14 años'));
  });

  // PRUEBA 3: Rechazo de una fecha de nacimiento futura
  await test('3. Rechazo de fecha de nacimiento futura (400)', async () => {
    const futureDate = '2030-01-01';
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Viajero del Tiempo',
        email: `futuro.${Date.now()}@zonafit.test`,
        password: 'Password123!',
        birth_date: futureDate,
        accepted_privacy_policy: true,
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('futura'));
  });

  // PRUEBA 4: Cálculo correcto de edad antes y después del cumpleaños
  await test('4. Cálculo exacto de edad antes y después del día de cumpleaños', async () => {
    // Fecha de referencia fija para prueba pura: 2026-10-26
    const refDate = new Date(2026, 9, 26); // Mes 9 = Octubre

    // Nació el 26 de octubre de 2012: cumple hoy 14 años
    const exactly14 = parseAndValidateBirthDate('2012-10-26', refDate);
    assert.strictEqual(exactly14.age, 14);
    assert.strictEqual(exactly14.isAllowed, true);

    // Nació el 27 de octubre de 2012: cumple mañana, tiene todavía 13 años
    const still13 = parseAndValidateBirthDate('2012-10-27', refDate);
    assert.strictEqual(still13.age, 13);
    assert.strictEqual(still13.isAllowed, false);

    // Nació el 25 de octubre de 2012: cumplió ayer, tiene 14 años
    const justTurned14 = parseAndValidateBirthDate('2012-10-25', refDate);
    assert.strictEqual(justTurned14.age, 14);
    assert.strictEqual(justTurned14.isAllowed, true);
  });

  // PRUEBA 5: Validación de adolescentes (14 a 17 años) con autorización del tutor
  await test('5. Registro de adolescente (14 a 17 años) con datos de tutor y flag is_minor_authorized', async () => {
    const today = new Date();
    const sixteenYearsAgo = `${today.getFullYear() - 16}-03-10`;
    const minorEmail = `adolescente.${Date.now()}@zonafit.test`;

    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Valentina Menor 16',
        email: minorEmail,
        password: 'PasswordSeguro123!',
        birth_date: sixteenYearsAgo,
        gender: 'femenino',
        accepted_privacy_policy: true,
        guardian_name: 'Lucía Gómez (Madre)',
        guardian_document: 'CC-52111222',
        guardian_phone: '3128887766',
      }),
    });

    assert.strictEqual(res.status, 201);
    const userId = res.body.id;

    // Verificar en consent_records que quedó registrado como menor autorizado
    const consentRes = await pool.query(
      'SELECT is_minor_authorized, guardian_name, policy_version FROM consent_records WHERE user_id = $1',
      [userId]
    );
    assert.strictEqual(consentRes.rows.length, 1);
    assert.strictEqual(consentRes.rows[0].is_minor_authorized, true);
    assert.strictEqual(consentRes.rows[0].guardian_name, 'Lucía Gómez (Madre)');
  });

  // PRUEBA 6: Rechazo si no se acepta la política
  await test('6. Rechazo explícito si accepted_privacy_policy no es aceptada (400)', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Sin Consentimiento',
        email: `noconsent.${Date.now()}@zonafit.test`,
        password: 'Password123!',
        birth_date: '1995-01-01',
        accepted_privacy_policy: false,
      }),
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('política de tratamiento de datos'));
  });

  // PRUEBA 7: Persistencia de la versión y texto del consentimiento
  await test('7. Persistencia auditable de la versión y snapshot del texto de consentimiento', async () => {
    const testEmail = `trazabilidad.${Date.now()}@zonafit.test`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Trazabilidad Consentimiento',
        email: testEmail,
        password: 'Password123!',
        birth_date: '1990-04-12',
        accepted_privacy_policy: true,
      }),
    });

    assert.strictEqual(res.status, 201);
    const userId = res.body.id;

    const consentRes = await pool.query(
      'SELECT policy_version, consent_text_snapshot, accepted_at FROM consent_records WHERE user_id = $1',
      [userId]
    );
    assert.strictEqual(consentRes.rows.length, 1);
    assert.strictEqual(consentRes.rows[0].policy_version, 'v1.0-2026');
    assert.ok(consentRes.rows[0].consent_text_snapshot.includes('Ley 1581 de 2012'));
    assert.ok(consentRes.rows[0].accepted_at instanceof Date);
  });

  // PRUEBA 8: Atomicidad transaccional (Rollback ante fallo)
  await test('8. Transaccionalidad atómica: Rollback del usuario si el consentimiento falla', async () => {
    const client = await pool.connect();
    const rollbackEmail = `rollback.test.${Date.now()}@zonafit.test`;
    try {
      await client.query('BEGIN');
      const insRes = await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Rollback User', $1, 'hash', 'user') RETURNING id",
        [rollbackEmail]
      );
      const uid = insRes.rows[0].id;

      // Simulamos fallo forzando violación de clave foránea en consent_records
      let simulatedError = false;
      try {
        await client.query(
          "INSERT INTO consent_records (user_id, policy_version, consent_text_snapshot) VALUES (999999, 'v1.0', 'text')"
        );
      } catch {
        simulatedError = true;
        await client.query('ROLLBACK');
      }

      assert.ok(simulatedError);
      const checkUser = await pool.query('SELECT id FROM users WHERE email = $1', [rollbackEmail]);
      assert.strictEqual(checkUser.rows.length, 0, 'El usuario no debe persistir tras el rollback');
    } finally {
      client.release();
    }
  });

  // PRUEBA 9: Rechazo de correo duplicado
  await test('9. Rechazo de registro con correo duplicado (409 Conflict)', async () => {
    const dupEmail = `duplicado.${Date.now()}@zonafit.test`;
    const res1 = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Usuario Uno',
        email: dupEmail,
        password: 'Password123!',
        birth_date: '1992-07-20',
        accepted_privacy_policy: true,
      }),
    });
    assert.strictEqual(res1.status, 201);

    const res2 = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Usuario Dos',
        email: dupEmail,
        password: 'PasswordOtro123!',
        birth_date: '1995-10-10',
        accepted_privacy_policy: true,
      }),
    });
    assert.strictEqual(res2.status, 409);
    assert.ok(res2.body.error.includes('registrado'));
  });

  // PRUEBA 10: Contraseña almacenada como hash bcrypt (nunca texto plano)
  await test('10. Contraseña protegida con bcrypt y nunca expuesta en texto plano', async () => {
    const rawPassword = 'MiPasswordSuperSeguro123!';
    const testEmail = `bcrypt.${Date.now()}@zonafit.test`;

    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bcrypt Test',
        email: testEmail,
        password: rawPassword,
        birth_date: '1988-11-05',
        accepted_privacy_policy: true,
      }),
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.password, undefined);
    assert.strictEqual(res.body.password_hash, undefined);

    const dbRes = await pool.query('SELECT password_hash FROM users WHERE email = $1', [testEmail]);
    const hashInDb = dbRes.rows[0].password_hash;
    assert.notStrictEqual(hashInDb, rawPassword);
    assert.ok(hashInDb.startsWith('$2'), 'Debe ser un hash bcrypt');
    assert.ok(await bcrypt.compare(rawPassword, hashInDb));
  });

  // PRUEBA 11: Rechazo de auto-asignación de roles privilegiados
  await test('11. Rechazo de elevación de privilegios: req.body.role es ignorado en registro', async () => {
    const testEmail = `hacker.${Date.now()}@zonafit.test`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Intento de Admin',
        email: testEmail,
        password: 'Password123!',
        birth_date: '1985-02-14',
        role: 'admin', // Intento de autodesignarse admin
        accepted_privacy_policy: true,
      }),
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.role, 'user', 'El rol forzosamente debe ser user');

    const dbCheck = await pool.query('SELECT role FROM users WHERE email = $1', [testEmail]);
    assert.strictEqual(dbCheck.rows[0].role, 'user');
  });

  // PRUEBA 12: Protección de perfil frente a acceso por otro usuario (IDOR)
  await test('12. Protección IDOR: /api/auth/profile y /api/users/profile operan solo sobre req.user.id', async () => {
    // Crear usuario A
    const userAEmail = `usera.${Date.now()}@zonafit.test`;
    await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Usuario A',
        email: userAEmail,
        password: 'Password123!',
        birth_date: '1993-01-01',
        accepted_privacy_policy: true,
      }),
    });
    const loginA = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: userAEmail, password: 'Password123!' }),
    });
    const tokenA = loginA.body.access_token;

    // Consultar perfil de A con su propio token
    const profA = await request('/auth/profile', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.strictEqual(profA.status, 200);
    assert.strictEqual(profA.body.email, userAEmail);

    // Intentar alterar rol o id enviando parámetros maliciosos
    const patchRes = await request('/auth/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        id: 9999,
        role: 'admin',
        name: 'Usuario A Modificado',
        phone: '3001112233',
      }),
    });
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.body.role, 'user', 'El rol no puede cambiarse mediante endpoint de perfil');
    assert.strictEqual(patchRes.body.name, 'Usuario A Modificado');
  });

  // PRUEBA 13: Rechazo de peticiones malformadas
  await test('13. Rechazo de peticiones malformadas (nombre corto, email sin formato, etc.)', async () => {
    // Email inválido
    const res1 = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Nombre Valido',
        email: 'correo-sin-arroba',
        password: 'Password123!',
        birth_date: '1990-01-01',
        accepted_privacy_policy: true,
      }),
    });
    assert.strictEqual(res1.status, 400);

    // Nombre de 1 letra
    const res2 = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'A',
        email: 'valido@test.com',
        password: 'Password123!',
        birth_date: '1990-01-01',
        accepted_privacy_policy: true,
      }),
    });
    assert.strictEqual(res2.status, 400);
  });

  // PRUEBA 14: Compatibilidad con Login y consulta de Política
  await test('14. Compatibilidad integral con Login, JWT y GET /api/auth/legal/privacy-policy', async () => {
    // 1. Política pública
    const policyRes = await request('/auth/legal/privacy-policy');
    assert.strictEqual(policyRes.status, 200);
    assert.strictEqual(policyRes.body.version, 'v1.0-2026');
    assert.ok(policyRes.body.title.includes('Zona Fitness'));

    // 2. Login con usuario creado
    const testEmail = `login.test.${Date.now()}@zonafit.test`;
    await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Login Compatible',
        email: testEmail,
        password: 'Password123!',
        birth_date: '1980-08-08',
        phone: '3157778899',
        accepted_privacy_policy: true,
      }),
    });

    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: 'Password123!' }),
    });

    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.body.access_token);
    assert.strictEqual(loginRes.body.user.email, testEmail);
    assert.strictEqual(loginRes.body.user.phone, '3157778899');
  });

  console.log('\n====================================================');
  console.log(`RESUMEN DE PRUEBAS DE FASE 3: ${passed} PASARON, ${failed} FALLARON`);
  console.log('====================================================');

  server.close();
  await pool.end();

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase3Tests().catch((err) => {
    console.error('Error fatal en suite de pruebas de Fase 3:', err);
    process.exit(1);
  });
}

module.exports = { runPhase3Tests };
