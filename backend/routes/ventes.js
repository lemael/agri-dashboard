const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { status, email } = req.query;
  let query = 'SELECT * FROM ventes';
  const params = [];
  const conditions = [];

  if (status) { conditions.push('status = ?'); params.push(status); }
  if (email)  { conditions.push('grossiste_email = ?'); params.push(email); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY created_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ventes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { id, grossisteEmail, type, variete, quantite, prix, etat, producerEmail, nomEntreprise, lieu, dateRecolte } = req.body;
  const newId = id || Date.now().toString();
  db.prepare(`
    INSERT INTO ventes (id, grossiste_email, created_at, status, type, variete, quantite, prix, etat, producer_email, nom_entreprise, lieu, date_recolte)
    VALUES (?, ?, ?, 'disponible', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(newId, grossisteEmail, new Date().toISOString(), type, variete, quantite, prix, etat, producerEmail, nomEntreprise, lieu, dateRecolte);
  res.status(201).json({ id: newId });
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE ventes SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ventes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
