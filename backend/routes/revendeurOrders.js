const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { status, email } = req.query;
    const params = [];
    const conditions = [];
    if (status) conditions.push(`status = $${params.push(status)}`);
    if (email)  conditions.push(`revendeur_email = $${params.push(email)}`);
    let query = 'SELECT * FROM revendeur_orders';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY commande_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows.map(r => ({ ...r, produit: JSON.parse(r.produit) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM revendeur_orders WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ...rows[0], produit: JSON.parse(rows[0].produit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, revendeurEmail, commandeAt, status, produit } = req.body;
    const newId = id || Date.now().toString();
    await pool.query(
      'INSERT INTO revendeur_orders (id, revendeur_email, commande_at, status, produit) VALUES ($1, $2, $3, $4, $5)',
      [newId, revendeurEmail, commandeAt || new Date().toISOString(), status || 'en attente', JSON.stringify(produit)]
    );
    res.status(201).json({ id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    await pool.query('UPDATE revendeur_orders SET status = $1 WHERE id = $2', [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
