const express = require('express');
const cors = require('cors');
const { getAppPool } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const ticketsRoutes = require('./routes/tickets.routes');
const usersRoutes = require('./routes/users.routes');
const gymRoutes = require('./routes/gym.routes');
const cartRoutes = require('./routes/cart.routes');
const ordersRoutes = require('./routes/orders.routes');
const membershipsRoutes = require('./routes/memberships.routes');
const adminRoutes = require('./routes/admin.routes');
const paymentsRoutes = require('./routes/payments.routes');

const app = express();
const PORT = process.env.PORT || 8000;

// Configuración de Middlewares
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// Verificación de Estado y Conexión (Health Check)
app.get('/api/health', async (req, res) => {
  try {
    const pool = getAppPool();
    const dbRes = await pool.query('SELECT version(), current_database(), current_user;');
    res.json({
      status: 'UP',
      app: 'ZONA FITNESS Backend API',
      database: {
        connected: true,
        current_db: dbRes.rows[0].current_database,
        current_user: dbRes.rows[0].current_user,
        server_version: dbRes.rows[0].version,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'DEGRADED',
      app: 'ZONA FITNESS Backend API',
      database: {
        connected: false,
        error: err.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api', gymRoutes);

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.url}` });
});

// Manejador central de errores
app.use((err, req, res, next) => {
  console.error('[ERROR NO CONTROLADO]:', err.stack);
  res.status(500).json({ error: 'Ocurrió un error interno en el servidor' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`ZONA FITNESS API Servidor iniciado en puerto ${PORT}`);
    console.log(`URL de API: http://localhost:${PORT}/api`);
    console.log(`Salud:      http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

module.exports = app;
