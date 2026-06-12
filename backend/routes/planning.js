const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const crypto  = require('crypto');

// GET /api/planning?mois=2024-06
router.get('/', async (req, res) => {
  try {
    const { mois } = req.query;
    let sql    = 'SELECT * FROM planning';
    const params = [];
    if (mois) {
      sql += ' WHERE mois = $1';
      params.push(mois);
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/planning
router.post('/', async (req, res) => {
  try {
    const { mois, titre, description, statut = 'a_faire', priorite = 'normale', created_by } = req.body;
    if (!mois || !titre) return res.status(400).json({ error: 'mois et titre requis' });
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO planning (id, mois, titre, description, statut, priorite, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
      [id, mois, titre, description || null, statut, priorite, created_by || null, new Date().toISOString()]
    );
    const { rows } = await pool.query('SELECT * FROM planning WHERE id = $1', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/planning/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titre, description, statut, priorite, mois } = req.body;
    const fields = [];
    const params = [];
    let i = 1;
    if (titre       !== undefined) { fields.push(`titre       = $${i++}`); params.push(titre); }
    if (description !== undefined) { fields.push(`description = $${i++}`); params.push(description); }
    if (statut      !== undefined) { fields.push(`statut      = $${i++}`); params.push(statut); }
    if (priorite    !== undefined) { fields.push(`priorite    = $${i++}`); params.push(priorite); }
    if (mois        !== undefined) { fields.push(`mois        = $${i++}`); params.push(mois); }
    if (!fields.length) return res.status(400).json({ error: 'Aucun champ à modifier' });
    fields.push(`updated_at = $${i++}`);
    params.push(new Date().toISOString());
    params.push(id);
    await pool.query(`UPDATE planning SET ${fields.join(', ')} WHERE id = $${i}`, params);
    const { rows } = await pool.query('SELECT * FROM planning WHERE id = $1', [id]);
    res.json(rows[0] || { id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/planning/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM planning WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
