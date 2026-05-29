const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');

const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');
const genId = () => 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.email, u.nom, u.prenom, u.role, u.cc_groupe,
             u.telephone, u.status, u.created_at,
             cp.ville, cp.geolocation, cp.secteur_principal,
             COUNT(DISTINCT cc.id)::int AS nb_clients
      FROM dashboard_users u
      LEFT JOIN cc_profiles cp ON cp.email = u.email
      LEFT JOIN cc_clients  cc ON cc.cc_email = u.email
      GROUP BY u.id, u.username, u.email, u.nom, u.prenom, u.role, u.cc_groupe,
               u.telephone, u.status, u.created_at, cp.ville, cp.geolocation, cp.secteur_principal
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pending call_center accounts
router.get('/pending', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, nom, prenom, telephone, created_at
       FROM dashboard_users WHERE role = 'call_center' AND status = 'pending'
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pending count (for badge)
router.get('/pending-count', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count FROM dashboard_users WHERE role = 'call_center' AND status = 'pending'`
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/validate — approve
router.patch('/:id/validate', async (req, res) => {
  try {
    await pool.query(
      `UPDATE dashboard_users SET status = 'active' WHERE id = $1`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/reject — reject
router.patch('/:id/reject', async (req, res) => {
  try {
    await pool.query(
      `UPDATE dashboard_users SET status = 'rejected' WHERE id = $1`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, email, nom, prenom, role, cc_groupe, password } = req.body;
    if (!username || !password || !role)
      return res.status(400).json({ error: 'pseudonyme, password et role sont requis' });
    const id = genId();
    // email: use provided or generate from username
    const resolvedEmail = email?.trim()
      ? email.toLowerCase().trim()
      : `${username.toLowerCase().trim()}@facilitar.local`;
    await pool.query(
      'INSERT INTO dashboard_users (id, email, username, nom, prenom, role, cc_groupe, password_hash, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,\'active\',$9)',
      [id, resolvedEmail, username.toLowerCase().trim(), nom || null, prenom || null, role, cc_groupe || null, hash(password), new Date().toISOString()]
    );
    res.json({ ok: true, id });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ce pseudonyme ou email est déjà utilisé' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { password, role, cc_groupe, secteur_principal, telephone } = req.body;
    if (password) {
      await pool.query('UPDATE dashboard_users SET password_hash = $1 WHERE id = $2', [hash(password), req.params.id]);
    }
    if (role !== undefined) {
      await pool.query('UPDATE dashboard_users SET role = $1, cc_groupe = $2 WHERE id = $3', [role, cc_groupe || null, req.params.id]);
    }
    if (telephone !== undefined) {
      await pool.query('UPDATE dashboard_users SET telephone = $1 WHERE id = $2', [telephone || null, req.params.id]);
    }
    if (secteur_principal !== undefined) {
      // Upsert secteur_principal in cc_profiles (keyed by email)
      const { rows } = await pool.query('SELECT email FROM dashboard_users WHERE id = $1', [req.params.id]);
      if (rows.length && rows[0].email) {
        await pool.query(
          `INSERT INTO cc_profiles (email, secteur_principal) VALUES ($1, $2)
           ON CONFLICT (email) DO UPDATE SET secteur_principal = EXCLUDED.secteur_principal`,
          [rows[0].email, secteur_principal || null]
        );
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM dashboard_users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
