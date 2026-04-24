const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { status, email } = req.query;
  let query = 'SELECT * FROM revendeur_orders';
  const params = [];
  const conditions = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (email)  { conditions.push('revendeur_email = ?'); params.push(email); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY commande_at DESC';

  const rows = db.prepare(query).all(...params).map(r => ({
    ...r,
    produit: JSON.parse(r.produit),
  }));
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM revendeur_orders WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, produit: JSON.parse(row.produit) });
});

router.post('/', (req, res) => {
  const { id, revendeurEmail, commandeAt, status, produit } = req.body;
  const newId = id || Date.now().toString();
  db.prepare(`
    INSERT INTO revendeur_orders (id, revendeur_email, commande_at, status, produit)
    VALUES (?, ?, ?, ?, ?)
  `).run(newId, revendeurEmail, commandeAt || new Date().toISOString(), status || 'en attente', JSON.stringify(produit));
  res.status(201).json({ id: newId });
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE revendeur_orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
