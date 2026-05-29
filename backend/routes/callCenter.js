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

// ── SOUHAITS (partagés entre CC agents) ─────────────────────────────────────

// GET /api/call-center/souhaits?groupe=2  (CC Grossiste lit ceux du groupe 2)
// GET /api/call-center/souhaits?email=xxx (CC Revendeur lit les siens)
router.get('/souhaits', async (req, res) => {
  try {
    const { groupe, email } = req.query;
    let rows;
    if (email) {
      ({ rows } = await pool.query(
        'SELECT * FROM cc_souhaits WHERE cc_email = $1 ORDER BY created_at DESC',
        [email.toLowerCase()]
      ));
    } else if (groupe) {
      // Fetch souhaits from all CC agents of the given groupe
      ({ rows } = await pool.query(
        `SELECT s.* FROM cc_souhaits s
         JOIN dashboard_users u ON u.email = s.cc_email
         WHERE u.cc_groupe = $1
         ORDER BY s.created_at DESC`,
        [parseInt(groupe)]
      ));
    } else {
      ({ rows } = await pool.query('SELECT * FROM cc_souhaits ORDER BY created_at DESC'));
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/call-center/souhaits
router.post('/souhaits', async (req, res) => {
  try {
    const { cc_email, client_nom, produit, quantite, notes } = req.body;
    if (!cc_email || !produit) return res.status(400).json({ error: 'cc_email et produit requis' });
    const id = genId();
    await pool.query(
      'INSERT INTO cc_souhaits (id, cc_email, client_nom, produit, quantite, notes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, cc_email.toLowerCase(), client_nom || null, produit, quantite || null, notes || null, new Date().toISOString()]
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/call-center/souhaits/:id — update quantite and notes only (by owner CC)
router.patch('/souhaits/:id', async (req, res) => {
  try {
    const { quantite, notes, cc_email } = req.body;
    if (!cc_email) return res.status(400).json({ error: 'cc_email requis' });
    await pool.query(
      'UPDATE cc_souhaits SET quantite = $1, notes = $2 WHERE id = $3 AND cc_email = $4',
      [quantite || null, notes || null, req.params.id, cc_email.toLowerCase()]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/call-center/souhaits/:id
router.delete('/souhaits/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM cc_souhaits WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/call-center/grossiste-produits — all products from CC Grossiste clients
router.get('/grossiste-produits', async (req, res) => {
  try {
    // Fetch all cc_clients registered by CC Grossiste agents (cc_groupe = 1)
    const { rows } = await pool.query(
      `SELECT c.id, c.nom, c.produits, c.cc_email
       FROM cc_clients c
       JOIN dashboard_users u ON u.email = c.cc_email
       WHERE u.cc_groupe = 1`
    );
    const produits = [];
    for (const client of rows) {
      const ps = client.produits ? JSON.parse(client.produits) : [];
      ps.forEach((p, i) => {
        produits.push({
          grossiste_id:  client.id,
          grossiste_nom: client.nom,
          cc_email:      client.cc_email,
          prod_idx:      i,
          nom:           p.nom || p.type || `Produit ${i + 1}`,
          type:          p.type || null,
          quantite:      p.quantite || null,
          prix:          p.prix || null,
          unite:         p.unite || null,
          notes:         p.notes || null,
        });
      });
    }
    res.json(produits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/call-center/all-clients?groupe=1|2  — liste pour Comptabilité
// Inclut aussi les agents dont cc_groupe IS NULL (non encore assigné par le CEO)
router.get('/all-clients', async (req, res) => {
  try {
    const { groupe } = req.query;
    // When groupe is given: show exact groupe matches + unclassified (cc_groupe IS NULL)
    // When no groupe: show all clients
    const params = [];
    let where = '';
    if (groupe) {
      params.push(parseInt(groupe));
      where = 'WHERE (u.cc_groupe = $1 OR u.cc_groupe IS NULL)';
    }
    const { rows } = await pool.query(
      `SELECT c.id, c.nom, c.telephone, c.adresse, c.notes,
              c.cc_email, c.date_ravitaillement, c.prochaine_date,
              u.nom AS agent_nom, u.prenom AS agent_prenom, u.cc_groupe
       FROM cc_clients c
       LEFT JOIN dashboard_users u ON u.email = c.cc_email
       ${where}
       ORDER BY c.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── HISTORIQUE DES PRIX ──────────────────────────────────────────────────────

// GET /api/call-center/prix-history
router.get('/prix-history', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM prix_history ORDER BY changed_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/call-center/prix-history
router.post('/prix-history', async (req, res) => {
  try {
    const { cc_email, grossiste_nom, produit_nom, ancien_prix, nouveau_prix } = req.body;
    const id = genId();
    await pool.query(
      'INSERT INTO prix_history (id, cc_email, grossiste_nom, produit_nom, ancien_prix, nouveau_prix, changed_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, cc_email, grossiste_nom || null, produit_nom || null, ancien_prix ?? null, nouveau_prix ?? null, new Date().toISOString()]
    );
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
