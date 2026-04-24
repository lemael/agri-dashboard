const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email et mot de passe requis' });

  const user = db
    .prepare('SELECT * FROM dashboard_users WHERE email = ?')
    .get(email.toLowerCase().trim());

  if (!user || user.password_hash !== hash(password))
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const { password_hash, ...safeUser } = user;
  res.json({ ok: true, user: safeUser });
});

module.exports = router;
