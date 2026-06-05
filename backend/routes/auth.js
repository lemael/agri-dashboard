const express = require('express');
const router = express.Router();
const { pool, USE_SQLITE } = require('../db');
const crypto = require('crypto');

const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');
const genId = () => 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Pseudonyme et mot de passe requis' });

    // Bloquer les comptes de test local contre l'API de production
    if (!USE_SQLITE && username.trim().toLowerCase().startsWith('test_'))
      return res.status(403).json({ error: 'Compte de test non autorisé en production.' });

    const { rows } = await pool.query(
      `SELECT u.*,
              CASE WHEN cp.email IS NOT NULL THEN true ELSE false END AS profile_complete
       FROM dashboard_users u
       LEFT JOIN cc_profiles cp ON cp.email = u.email
       WHERE LOWER(u.username) = LOWER($1)`,
      [username.trim()]
    );
    const user = rows[0];

    if (!user || user.password_hash !== hash(password))
      return res.status(401).json({ error: 'Pseudonyme ou mot de passe incorrect' });

    if (user.status === 'pending')
      return res.status(403).json({ error: 'Compte en attente de validation par l\'administrateur.' });

    if (user.status === 'rejected')
      return res.status(403).json({ error: 'Compte refusé. Contactez l\'administrateur.' });

    const { password_hash, ...safeUser } = user;
    res.json({ ok: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public registration for call_center users
router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, username, password } = req.body;
    if (!nom || !prenom || !username || !password)
      return res.status(400).json({ error: 'nom, prénom, pseudonyme et mot de passe sont requis' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Mot de passe minimum 6 caractères' });

    const id = genId();
    // email is generated internally from username
    const email = `${username.toLowerCase().trim()}@facilitar.local`;
    await pool.query(
      `INSERT INTO dashboard_users (id, email, username, nom, prenom, role, password_hash, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'call_center', $6, 'pending', $7)`,
      [id, email, username.toLowerCase().trim(), nom.trim(), prenom.trim(), hash(password), new Date().toISOString()]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Ce pseudonyme est déjà utilisé' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
