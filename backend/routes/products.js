const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { email, status } = req.query;
  let query = 'SELECT * FROM products';
  const params = [];
  const conditions = [];

  if (email)  { conditions.push('producer_email = ?'); params.push(email); }
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params).map(r => ({
    ...r,
    sold_out: r.sold_out === 1,
    photos: r.photos ? JSON.parse(r.photos) : [],
  }));
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, sold_out: row.sold_out === 1, photos: row.photos ? JSON.parse(row.photos) : [] });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
