const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { email, status } = req.query;
    const params = [];
    const conditions = [];
    if (email)  conditions.push(`producer_email = $${params.push(email)}`);
    if (status) conditions.push(`status = $${params.push(status)}`);
    let query = 'SELECT * FROM products';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows.map(r => ({ ...r, photos: r.photos ? JSON.parse(r.photos) : [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    res.json({ ...r, photos: r.photos ? JSON.parse(r.photos) : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
