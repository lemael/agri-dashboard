const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');

const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email et mot de passe requis' });

    const { rows } = await pool.query(
      'SELECT * FROM dashboard_users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    if (!user || user.password_hash !== hash(password))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const { password_hash, ...safeUser } = user;
    res.json({ ok: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
