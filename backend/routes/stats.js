const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const [
      { rows: [{ c: totalOrders }] },
      { rows: [{ c: totalRevOrders }] },
      { rows: [{ c: totalVentes }] },
      { rows: [{ c: totalProducts }] },
      { rows: [{ c: pendingOrders }] },
      { rows: [{ c: pendingRevOrders }] },
      { rows: [{ c: ventesDispos }] },
      { rows: [{ total: caOrders }] },
      { rows: [{ total: caRevOrders }] },
      { rows: recentOrders },
      { rows: recentRevOrders },
      { rows: ordersByStatus },
      { rows: ventesByStatus },
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as c FROM orders'),
      pool.query('SELECT COUNT(*) as c FROM revendeur_orders'),
      pool.query('SELECT COUNT(*) as c FROM ventes'),
      pool.query('SELECT COUNT(*) as c FROM products'),
      pool.query("SELECT COUNT(*) as c FROM orders WHERE status = 'en attente'"),
      pool.query("SELECT COUNT(*) as c FROM revendeur_orders WHERE status = 'en attente'"),
      pool.query("SELECT COUNT(*) as c FROM ventes WHERE status = 'disponible'"),
      pool.query("SELECT COALESCE(SUM((produit::json->>'prix')::numeric), 0) as total FROM orders WHERE status != 'annulée'"),
      pool.query("SELECT COALESCE(SUM((produit::json->>'prix')::numeric), 0) as total FROM revendeur_orders WHERE status != 'annulée'"),
      pool.query('SELECT * FROM orders ORDER BY commande_at DESC LIMIT 5'),
      pool.query('SELECT * FROM revendeur_orders ORDER BY commande_at DESC LIMIT 5'),
      pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status'),
      pool.query('SELECT status, COUNT(*) as count FROM ventes GROUP BY status'),
    ]);

    const ca0 = parseFloat(caOrders) || 0;
    const ca1 = parseFloat(caRevOrders) || 0;

    res.json({
      totals: {
        totalOrders: parseInt(totalOrders),
        totalRevOrders: parseInt(totalRevOrders),
        totalVentes: parseInt(totalVentes),
        totalProducts: parseInt(totalProducts),
      },
      pending: {
        pendingOrders: parseInt(pendingOrders),
        pendingRevOrders: parseInt(pendingRevOrders),
        ventesDispos: parseInt(ventesDispos),
      },
      chiffreAffaires: { orders: ca0, revendeurOrders: ca1, total: ca0 + ca1 },
      recentOrders: recentOrders.map(r => ({ ...r, produit: JSON.parse(r.produit) })),
      recentRevOrders: recentRevOrders.map(r => ({ ...r, produit: JSON.parse(r.produit) })),
      ordersByStatus,
      ventesByStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
