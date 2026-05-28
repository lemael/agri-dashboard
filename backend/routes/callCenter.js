const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');

const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');
const genId = () => 'cc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

// GET /api/call-center/profile/:email
router.get('/profile/:email', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM cc_profiles WHERE email = $1',
      [req.params.email.toLowerCase()]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Profil non trouvé' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/call-center/profile — create or update
router.post('/profile', async (req, res) => {
  try {
    const { email, prenom, telephone, ville, geolocation, secteur_principal, secteur_secondaire, orientation, password } = req.body;
    if (!email || !secteur_principal || !orientation)
      return res.status(400).json({ error: 'email, secteur_principal et orientation sont requis' });

    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO cc_profiles (email, prenom, telephone, ville, geolocation, secteur_principal, secteur_secondaire, orientation, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (email) DO UPDATE SET
         prenom = EXCLUDED.prenom,
         telephone = EXCLUDED.telephone,
         ville = EXCLUDED.ville,
         geolocation = EXCLUDED.geolocation,
         secteur_principal = EXCLUDED.secteur_principal,
         secteur_secondaire = EXCLUDED.secteur_secondaire,
         orientation = EXCLUDED.orientation`,
      [email.toLowerCase(), prenom || null, telephone || null, ville || null,
       geolocation || null, secteur_principal, secteur_secondaire || null, orientation, now]
    );

    // Update prenom in dashboard_users if provided
    if (prenom) {
      await pool.query('UPDATE dashboard_users SET prenom = $1 WHERE email = $2', [prenom, email.toLowerCase()]);
    }

    // Update password if provided
    if (password && password.length >= 6) {
      await pool.query('UPDATE dashboard_users SET password_hash = $1 WHERE email = $2', [hash(password), email.toLowerCase()]);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/call-center/clients?email=xxx
router.get('/clients', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email requis' });
    const { rows } = await pool.query(
      'SELECT * FROM cc_clients WHERE cc_email = $1 ORDER BY created_at DESC',
      [email.toLowerCase()]
    );
    const clients = rows.map(r => ({
      ...r,
      produits: r.produits ? JSON.parse(r.produits) : [],
    }));
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/call-center/clients
router.post('/clients', async (req, res) => {
  try {
    const { cc_email, nom, telephone, adresse, geolocation, produits, date_ravitaillement, prochaine_date, notes } = req.body;
    if (!cc_email || !nom) return res.status(400).json({ error: 'cc_email et nom sont requis' });
    const id = genId();
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO cc_clients (id, cc_email, nom, telephone, adresse, geolocation, produits, date_ravitaillement, prochaine_date, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, cc_email.toLowerCase(), nom, telephone || null, adresse || null,
       geolocation || null, produits ? JSON.stringify(produits) : '[]',
       date_ravitaillement || null, prochaine_date || null, notes || null, now, now]
    );
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/call-center/clients/:id
router.put('/clients/:id', async (req, res) => {
  try {
    const { nom, telephone, adresse, geolocation, produits, date_ravitaillement, prochaine_date, notes } = req.body;
    const now = new Date().toISOString();
    await pool.query(
      `UPDATE cc_clients SET
         nom = $1, telephone = $2, adresse = $3, geolocation = $4,
         produits = $5, date_ravitaillement = $6, prochaine_date = $7,
         notes = $8, updated_at = $9
       WHERE id = $10`,
      [nom, telephone || null, adresse || null, geolocation || null,
       produits ? JSON.stringify(produits) : '[]',
       date_ravitaillement || null, prochaine_date || null, notes || null, now, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/call-center/clients/:id
router.delete('/clients/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM cc_clients WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/call-center/trends?secteur=xxx
router.get('/trends', async (req, res) => {
  try {
    const { secteur } = req.query;

    const [prodStats, ventesStats, topProduits] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE sold_out = false) as disponibles FROM products`),
      pool.query(`SELECT COUNT(*) as total, COALESCE(SUM(prix::numeric), 0) as chiffre FROM ventes WHERE status = 'disponible'`),
      pool.query(`SELECT type, variete, COUNT(*) as nb, ROUND(AVG(prix::numeric),0) as prix_moy
                  FROM products WHERE sold_out = false GROUP BY type, variete ORDER BY nb DESC LIMIT 5`),
    ]);

    res.json({
      secteur,
      produits_actifs: parseInt(prodStats.rows[0].total),
      produits_disponibles: parseInt(prodStats.rows[0].disponibles),
      ventes_actives: parseInt(ventesStats.rows[0].total),
      chiffre_affaires: parseFloat(ventesStats.rows[0].chiffre),
      top_produits: topProduits.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
