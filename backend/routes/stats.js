const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const totalOrders     = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const totalRevOrders  = db.prepare('SELECT COUNT(*) as c FROM revendeur_orders').get().c;
  const totalVentes     = db.prepare('SELECT COUNT(*) as c FROM ventes').get().c;
  const totalProducts   = db.prepare('SELECT COUNT(*) as c FROM products').get().c;

  const pendingOrders   = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'en attente'").get().c;
  const pendingRevOrders = db.prepare("SELECT COUNT(*) as c FROM revendeur_orders WHERE status = 'en attente'").get().c;
  const ventesDispos    = db.prepare("SELECT COUNT(*) as c FROM ventes WHERE status = 'disponible'").get().c;

  const caOrders  = db.prepare("SELECT SUM(CAST(json_extract(produit, '$.prix') AS REAL)) as total FROM orders WHERE status != 'annulée'").get().total || 0;
  const caRevOrders = db.prepare("SELECT SUM(CAST(json_extract(produit, '$.prix') AS REAL)) as total FROM revendeur_orders WHERE status != 'annulée'").get().total || 0;

  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY commande_at DESC LIMIT 5').all().map(r => ({
    ...r, produit: JSON.parse(r.produit),
  }));
  const recentRevOrders = db.prepare('SELECT * FROM revendeur_orders ORDER BY commande_at DESC LIMIT 5').all().map(r => ({
    ...r, produit: JSON.parse(r.produit),
  }));

  const ordersByStatus = db.prepare("SELECT status, COUNT(*) as count FROM orders GROUP BY status").all();
  const ventesByStatus = db.prepare("SELECT status, COUNT(*) as count FROM ventes GROUP BY status").all();

  res.json({
    totals: { totalOrders, totalRevOrders, totalVentes, totalProducts },
    pending: { pendingOrders, pendingRevOrders, ventesDispos },
    chiffreAffaires: { orders: caOrders, revendeurOrders: caRevOrders, total: caOrders + caRevOrders },
    recentOrders,
    recentRevOrders,
    ordersByStatus,
    ventesByStatus,
  });
});

module.exports = router;
