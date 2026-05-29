const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const genId = () => 'cpt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

// ─── GET /api/comptabilite/dashboard ─────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [
      { rows: [{ total: gainsOrders }] },
      { rows: [{ total: gainsRevOrders }] },
      { rows: [{ total: totalDepenses }] },
      { rows: ordersByStatus },
      { rows: revOrdersByStatus },
      { rows: ventesByStatus },
      { rows: [{ total: creditOuvert }] },
      { rows: recentPaiements },
    ] = await Promise.all([
      pool.query("SELECT COALESCE(SUM((produit::json->>'prix')::numeric), 0) as total FROM orders WHERE status != 'annulée'"),
      pool.query("SELECT COALESCE(SUM((produit::json->>'prix')::numeric), 0) as total FROM revendeur_orders WHERE status != 'annulée'"),
      pool.query('SELECT COALESCE(SUM(montant), 0) as total FROM depenses'),
      pool.query("SELECT status, COUNT(*) as count, COALESCE(SUM((produit::json->>'prix')::numeric), 0) as montant FROM orders GROUP BY status"),
      pool.query("SELECT status, COUNT(*) as count, COALESCE(SUM((produit::json->>'prix')::numeric), 0) as montant FROM revendeur_orders GROUP BY status"),
      pool.query('SELECT status, COUNT(*) as count FROM ventes GROUP BY status'),
      pool.query("SELECT COALESCE(SUM(montant - montant_paye), 0) as total FROM paiements WHERE statut != 'payé'"),
      pool.query('SELECT * FROM paiements ORDER BY created_at DESC LIMIT 5'),
    ]);
    const gains = (parseFloat(gainsOrders) || 0) + (parseFloat(gainsRevOrders) || 0);
    const depTotal = parseFloat(totalDepenses) || 0;
    res.json({
      gains,
      totalDepenses: depTotal,
      resultat: gains - depTotal,
      creditOuvert: parseFloat(creditOuvert) || 0,
      ordersByStatus,
      revOrdersByStatus,
      ventesByStatus,
      recentPaiements,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/comptabilite/ventes-analyse ─────────────────────────────────────
router.get('/ventes-analyse', async (req, res) => {
  try {
    const [
      { rows: parGrossiste },
      { rows: parVille },
      { rows: parProduit },
      { rows: agentsPerf },
    ] = await Promise.all([
      pool.query(`
        SELECT grossiste_email,
               COUNT(*) as nb_commandes,
               COALESCE(SUM(CASE WHEN status = 'livrée' THEN (produit::json->>'prix')::numeric ELSE 0 END), 0) as ca_confirme,
               COALESCE(SUM(CASE WHEN status = 'en attente' THEN (produit::json->>'prix')::numeric ELSE 0 END), 0) as ca_pending,
               COALESCE(SUM(CASE WHEN status != 'annulée' THEN (produit::json->>'prix')::numeric ELSE 0 END), 0) as ca_total
        FROM orders GROUP BY grossiste_email ORDER BY ca_total DESC LIMIT 20
      `),
      pool.query(`
        SELECT lieu as ville, COUNT(*) as nb_ventes,
               COALESCE(SUM(prix), 0) as ca_total
        FROM ventes WHERE lieu IS NOT NULL AND lieu != ''
        GROUP BY lieu ORDER BY ca_total DESC LIMIT 10
      `),
      pool.query(`
        SELECT produit::json->>'type' as type_produit,
               produit::json->>'variete' as variete,
               COUNT(*) as nb_commandes,
               COALESCE(SUM((produit::json->>'prix')::numeric), 0) as ca_total,
               COALESCE(AVG((produit::json->>'prix')::numeric), 0) as prix_moyen
        FROM orders WHERE status != 'annulée'
        GROUP BY type_produit, variete ORDER BY ca_total DESC LIMIT 15
      `),
      pool.query(`
        SELECT cc_email as agent_email, COUNT(*) as nb_clients
        FROM cc_clients
        GROUP BY cc_email ORDER BY nb_clients DESC
      `),
    ]);
    res.json({ parGrossiste, parVille, parProduit, agentsPerf });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PAIEMENTS CRUD ───────────────────────────────────────────────────────────
router.get('/paiements', async (req, res) => {
  try {
    const { statut, type } = req.query;
    const params = [];
    const conditions = [];
    if (statut) conditions.push(`statut = $${params.push(statut)}`);
    if (type)   conditions.push(`type = $${params.push(type)}`);
    let query = 'SELECT * FROM paiements';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/paiements', async (req, res) => {
  try {
    const { type, email, ordre_id, montant, montant_paye, statut, echeance, date_paiement, notes, created_by } = req.body;
    if (!type || !email || !montant) return res.status(400).json({ error: 'type, email et montant sont requis' });
    const id = genId();
    await pool.query(
      `INSERT INTO paiements (id, type, email, ordre_id, montant, montant_paye, statut, echeance, date_paiement, notes, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, type, email, ordre_id || null, parseFloat(montant),
       parseFloat(montant_paye || 0), statut || 'en_attente',
       echeance || null, date_paiement || null, notes || null,
       created_by || null, new Date().toISOString()]
    );
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/paiements/:id', async (req, res) => {
  try {
    const fields = [];
    const params = [];
    const { montant_paye, statut, date_paiement, notes } = req.body;
    if (montant_paye !== undefined) fields.push(`montant_paye = $${params.push(parseFloat(montant_paye))}`);
    if (statut)         fields.push(`statut = $${params.push(statut)}`);
    if (date_paiement)  fields.push(`date_paiement = $${params.push(date_paiement)}`);
    if (notes !== undefined) fields.push(`notes = $${params.push(notes)}`);
    if (!fields.length) return res.json({ ok: true });
    params.push(req.params.id);
    await pool.query(`UPDATE paiements SET ${fields.join(', ')} WHERE id = $${params.length}`, params);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/paiements/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM paiements WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── COMMISSIONS CRUD ─────────────────────────────────────────────────────────
router.get('/commissions', async (req, res) => {
  try {
    const { statut, periode } = req.query;
    const params = [];
    const conditions = [];
    if (statut)  conditions.push(`statut = $${params.push(statut)}`);
    if (periode) conditions.push(`periode = $${params.push(periode)}`);
    let query = 'SELECT * FROM commissions_agents';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/commissions', async (req, res) => {
  try {
    const { agent_email, agent_nom, periode, nb_ventes, ca_realise, taux_commission, montant_commission, statut, notes, created_by } = req.body;
    if (!agent_email || !periode) return res.status(400).json({ error: 'agent_email et periode sont requis' });
    const id = genId();
    await pool.query(
      `INSERT INTO commissions_agents (id, agent_email, agent_nom, periode, nb_ventes, ca_realise, taux_commission, montant_commission, statut, notes, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, agent_email, agent_nom || null, periode,
       parseInt(nb_ventes || 0), parseFloat(ca_realise || 0),
       parseFloat(taux_commission || 5), parseFloat(montant_commission || 0),
       statut || 'en_attente', notes || null, created_by || null, new Date().toISOString()]
    );
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/commissions/:id', async (req, res) => {
  try {
    const fields = [];
    const params = [];
    const { statut, montant_commission, notes } = req.body;
    if (statut)                        fields.push(`statut = $${params.push(statut)}`);
    if (montant_commission !== undefined) fields.push(`montant_commission = $${params.push(parseFloat(montant_commission))}`);
    if (notes !== undefined)           fields.push(`notes = $${params.push(notes)}`);
    if (!fields.length) return res.json({ ok: true });
    params.push(req.params.id);
    await pool.query(`UPDATE commissions_agents SET ${fields.join(', ')} WHERE id = $${params.length}`, params);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/commissions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM commissions_agents WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/comptabilite/analyse-produits ───────────────────────────────────
router.get('/analyse-produits', async (req, res) => {
  try {
    const [
      { rows: topProduits },
      { rows: stockRotation },
    ] = await Promise.all([
      pool.query(`
        SELECT produit::json->>'type' as type,
               produit::json->>'variete' as variete,
               COUNT(*) as nb_ventes,
               COALESCE(SUM((produit::json->>'prix')::numeric), 0) as ca_total,
               COALESCE(AVG((produit::json->>'prix')::numeric), 0) as prix_moyen
        FROM orders WHERE status != 'annulée'
        GROUP BY type, variete ORDER BY ca_total DESC LIMIT 15
      `),
      pool.query(`
        SELECT type, variete,
               COUNT(*) as nb_total,
               SUM(CASE WHEN status IN ('vendu', 'livré') THEN 1 ELSE 0 END) as nb_vendus,
               SUM(CASE WHEN status = 'disponible' THEN 1 ELSE 0 END) as nb_dispo
        FROM products
        GROUP BY type, variete ORDER BY nb_total DESC LIMIT 15
      `),
    ]);
    res.json({ topProduits, stockRotation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
