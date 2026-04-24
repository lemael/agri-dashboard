const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

const genId = () => 'dep_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

// GET /api/depenses — liste avec filtres optionnels
router.get('/', (req, res) => {
  const { categorie, niveau } = req.query;
  let query = 'SELECT * FROM depenses';
  const params = [];
  const conditions = [];
  if (categorie) { conditions.push('categorie = ?'); params.push(categorie); }
  if (niveau)    { conditions.push('niveau = ?');    params.push(niveau); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY date DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/depenses/summary — totaux par catégorie + gains vs dépenses
router.get('/summary', (req, res) => {
  const totaux = db.prepare(`
    SELECT categorie, SUM(montant) as total, COUNT(*) as count
    FROM depenses GROUP BY categorie
  `).all();

  // Sous-totaux des promos par niveau
  const promosParNiveau = db.prepare(`
    SELECT niveau, SUM(montant) as total
    FROM depenses WHERE categorie = 'frais_promo' AND niveau IS NOT NULL
    GROUP BY niveau
  `).all();

  const totalDepenses = db.prepare('SELECT COALESCE(SUM(montant), 0) as total FROM depenses').get().total;

  // Gains = somme des prix des commandes non annulées
  const gainsOrders = db.prepare(`
    SELECT COALESCE(SUM(CAST(json_extract(produit, '$.prix') AS REAL)), 0) as total
    FROM orders WHERE status != 'annulée'
  `).get().total;
  const gainsRevOrders = db.prepare(`
    SELECT COALESCE(SUM(CAST(json_extract(produit, '$.prix') AS REAL)), 0) as total
    FROM revendeur_orders WHERE status != 'annulée'
  `).get().total;
  const gains = gainsOrders + gainsRevOrders;

  res.json({
    totaux,
    promosParNiveau,
    totalDepenses,
    gains,
    resultat: gains - totalDepenses,
  });
});

// POST /api/depenses — créer une dépense
router.post('/', (req, res) => {
  const { categorie, montant, description, beneficiaire, niveau, date, created_by } = req.body;
  if (!categorie || !montant || !date)
    return res.status(400).json({ error: 'categorie, montant et date sont requis' });

  const id = genId();
  db.prepare(`
    INSERT INTO depenses (id, categorie, montant, description, beneficiaire, niveau, date, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, categorie, parseFloat(montant), description || null, beneficiaire || null, niveau || null, date, created_by || null, new Date().toISOString());

  res.json({ ok: true, id });
});

// DELETE /api/depenses/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM depenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
