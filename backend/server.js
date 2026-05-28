const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/orders', require('./routes/orders'));
app.use('/api/revendeur-orders', require('./routes/revendeurOrders'));
app.use('/api/ventes', require('./routes/ventes'));
app.use('/api/products', require('./routes/products'));
app.use('/api/producteurs', require('./routes/producteurs'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/import', require('./routes/importData'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/depenses', require('./routes/depenses'));
app.use('/api/dashboard-users', require('./routes/dashboardUsers'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve built frontend in production
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Agri Dashboard API running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ DB init failed:', err);
    process.exit(1);
  });
