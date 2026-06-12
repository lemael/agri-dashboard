const express = require('express');
const router  = express.Router();
const { pool } = require('../db');
const crypto  = require('crypto');

// ─── ENTRÉES ──────────────────────────────────────────────────────────────────

// GET /api/tresorerie/entrees?mois=2026-06
router.get('/entrees', async (req, res) => {
  try {
    const { mois } = req.query;
    const sql = mois
      ? 'SELECT * FROM tresorerie_entrees WHERE mois = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM tresorerie_entrees ORDER BY created_at DESC';
    const { rows } = await pool.query(sql, mois ? [mois] : []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tresorerie/entrees
router.post('/entrees', async (req, res) => {
  try {
    const { mois, montant, description, created_by } = req.body;
    if (!mois || !montant) return res.status(400).json({ error: 'mois et montant requis' });
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO tresorerie_entrees (id, mois, montant, description, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, mois, parseFloat(montant), description || null, created_by || null, new Date().toISOString()]
    );
    const { rows } = await pool.query('SELECT * FROM tresorerie_entrees WHERE id=$1', [id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tresorerie/entrees/:id
router.delete('/entrees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tresorerie_entrees WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AFFECTATIONS ─────────────────────────────────────────────────────────────

// GET /api/tresorerie/affectations?mois=2026-06
router.get('/affectations', async (req, res) => {
  try {
    const { mois } = req.query;
    const sql = mois
      ? 'SELECT * FROM tresorerie_affectations WHERE mois = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM tresorerie_affectations ORDER BY created_at DESC';
    const { rows } = await pool.query(sql, mois ? [mois] : []);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tresorerie/affectations
router.post('/affectations', async (req, res) => {
  try {
    const { mois, categorie, montant, description, beneficiaire, created_by } = req.body;
    if (!mois || !categorie || !montant) return res.status(400).json({ error: 'mois, categorie et montant requis' });
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO tresorerie_affectations (id, mois, categorie, montant, description, beneficiaire, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, mois, categorie, parseFloat(montant), description || null, beneficiaire || null, created_by || null, new Date().toISOString()]
    );
    const { rows } = await pool.query('SELECT * FROM tresorerie_affectations WHERE id=$1', [id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/tresorerie/affectations/:id
router.patch('/affectations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { categorie, montant, description, beneficiaire } = req.body;
    const fields = [], params = [];
    let i = 1;
    if (categorie   !== undefined) { fields.push(`categorie   = $${i++}`); params.push(categorie); }
    if (montant     !== undefined) { fields.push(`montant     = $${i++}`); params.push(parseFloat(montant)); }
    if (description !== undefined) { fields.push(`description = $${i++}`); params.push(description); }
    if (beneficiaire!== undefined) { fields.push(`beneficiaire= $${i++}`); params.push(beneficiaire); }
    if (!fields.length) return res.status(400).json({ error: 'Aucun champ' });
    params.push(id);
    await pool.query(`UPDATE tresorerie_affectations SET ${fields.join(', ')} WHERE id = $${i}`, params);
    const { rows } = await pool.query('SELECT * FROM tresorerie_affectations WHERE id=$1', [id]);
    res.json(rows[0] || { id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tresorerie/affectations/:id
router.delete('/affectations/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tresorerie_affectations WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── RÉSUMÉ MENSUEL ───────────────────────────────────────────────────────────

// GET /api/tresorerie/resume?mois=2026-06
router.get('/resume', async (req, res) => {
  try {
    const { mois } = req.query;
    if (!mois) return res.status(400).json({ error: 'mois requis' });
    const [{ rows: entrees }, { rows: affectations }, { rows: parCat }] = await Promise.all([
      pool.query('SELECT COALESCE(SUM(montant),0) as total FROM tresorerie_entrees WHERE mois=$1', [mois]),
      pool.query('SELECT COALESCE(SUM(montant),0) as total FROM tresorerie_affectations WHERE mois=$1', [mois]),
      pool.query('SELECT categorie, COALESCE(SUM(montant),0) as total FROM tresorerie_affectations WHERE mois=$1 GROUP BY categorie', [mois]),
    ]);
    const totalEntrees     = parseFloat(entrees[0].total) || 0;
    const totalAffectations = parseFloat(affectations[0].total) || 0;
    res.json({
      totalEntrees,
      totalAffectations,
      solde: totalEntrees - totalAffectations,
      parCategorie: parCat,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
