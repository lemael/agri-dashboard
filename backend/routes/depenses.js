const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const genId = () => 'dep_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

router.get('/', async (req, res) => {
  try {
    const { categorie, niveau, created_by } = req.query;
    const params = [];
    const conditions = [];
    if (categorie)   conditions.push(`categorie = $${params.push(categorie)}`);
    if (niveau)      conditions.push(`niveau = $${params.push(niveau)}`);
    if (created_by)  conditions.push(`created_by = $${params.push(created_by)}`);
    let query = 'SELECT * FROM depenses';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY date DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const [
      { rows: totaux },
      { rows: promosParNiveau },
      { rows: [{ total: totalDepenses }] },
      { rows: [{ total: gainsOrders }] },
      { rows: [{ total: gainsRevOrders }] },
    ] = await Promise.all([
      pool.query('SELECT categorie, SUM(montant) as total, COUNT(*) as count FROM depenses GROUP BY categorie'),
      pool.query("SELECT niveau, SUM(montant) as total FROM depenses WHERE categorie = 'frais_promo' AND niveau IS NOT NULL GROUP BY niveau"),
      pool.query('SELECT COALESCE(SUM(montant), 0) as total FROM depenses'),
      pool.query("SELECT COALESCE(SUM((produit::json->>'prix')::numeric), 0) as total FROM orders WHERE status != 'annulée'"),
      pool.query("SELECT COALESCE(SUM((produit::json->>'prix')::numeric), 0) as total FROM revendeur_orders WHERE status != 'annulée'"),
    ]);
    const gains = (parseFloat(gainsOrders) || 0) + (parseFloat(gainsRevOrders) || 0);
    const depTotal = parseFloat(totalDepenses) || 0;
    res.json({ totaux, promosParNiveau, totalDepenses: depTotal, gains, resultat: gains - depTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { categorie, montant, description, beneficiaire, niveau, date, created_by } = req.body;
    if (!categorie || !montant || !date)
      return res.status(400).json({ error: 'categorie, montant et date sont requis' });
    const id = genId();
    await pool.query(
      'INSERT INTO depenses (id, categorie, montant, description, beneficiaire, niveau, date, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, categorie, parseFloat(montant), description || null, beneficiaire || null, niveau || null, date, created_by || null, new Date().toISOString()]
    );
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM depenses WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
