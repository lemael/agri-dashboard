const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  try {
    const { status, email } = req.query;
    const params = [];
    const conditions = [];
    if (status) conditions.push(`status = $${params.push(status)}`);
    if (email)  conditions.push(`grossiste_email = $${params.push(email)}`);
    let query = 'SELECT * FROM ventes';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ventes WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, grossisteEmail, type, variete, quantite, prix, etat, producerEmail, nomEntreprise, lieu, dateRecolte } = req.body;
    const newId = id || Date.now().toString();
    await pool.query(
      `INSERT INTO ventes (id, grossiste_email, created_at, status, type, variete, quantite, prix, etat, producer_email, nom_entreprise, lieu, date_recolte)
       VALUES ($1, $2, $3, 'disponible', $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [newId, grossisteEmail, new Date().toISOString(), type, variete, quantite, prix, etat, producerEmail, nomEntreprise, lieu, dateRecolte]
    );
    res.status(201).json({ id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    await pool.query('UPDATE ventes SET status = $1 WHERE id = $2', [req.body.status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ventes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
