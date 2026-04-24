const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`✅ Agri Dashboard API running on http://localhost:${PORT}`);
});
