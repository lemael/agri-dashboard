const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all orders (with optional filter by status or email)
router.get('/', (req, res) => {
  const { status, email } = req.query;
  let query = 'SELECT * FROM orders';
  const params = [];
  const conditions = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (email)  { conditions.push('grossiste_email = ?'); params.push(email); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY commande_at DESC';

  const rows = db.prepare(query).all(...params).map(r => ({
    ...r,
    produit: JSON.parse(r.produit),
  }));
  res.json(rows);
});

// GET single order
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, produit: JSON.parse(row.produit) });
});

// POST create order
router.post('/', (req, res) => {
  const { id, grossisteEmail, commandeAt, status, produit } = req.body;
  const newId = id || Date.now().toString();
  db.prepare(`
    INSERT INTO orders (id, grossiste_email, commande_at, status, produit)
    VALUES (?, ?, ?, ?, ?)
  `).run(newId, grossisteEmail, commandeAt || new Date().toISOString(), status || 'en attente', JSON.stringify(produit));
  res.status(201).json({ id: newId });
});

// PATCH update status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
