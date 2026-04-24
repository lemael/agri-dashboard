const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');
const genId = () => 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

// GET — liste tous les utilisateurs (sans mot de passe)
router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT id, email, nom, prenom, role, cc_groupe, created_at
    FROM dashboard_users ORDER BY created_at DESC
  `).all();
  res.json(users);
});

// POST — créer un utilisateur
router.post('/', (req, res) => {
  const { email, nom, prenom, role, cc_groupe, password } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ error: 'email, password et role sont requis' });

  const id = genId();
  try {
    db.prepare(`
      INSERT INTO dashboard_users (id, email, nom, prenom, role, cc_groupe, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, email.toLowerCase().trim(), nom || null, prenom || null, role, cc_groupe || null, hash(password), new Date().toISOString());
    res.json({ ok: true, id });
  } catch {
    res.status(400).json({ error: 'Cet email est déjà utilisé' });
  }
});

// PATCH — changer mot de passe ou rôle
router.patch('/:id', (req, res) => {
  const { password, role, cc_groupe } = req.body;
  if (password) {
    db.prepare('UPDATE dashboard_users SET password_hash = ? WHERE id = ?').run(hash(password), req.params.id);
  }
  if (role !== undefined) {
    db.prepare('UPDATE dashboard_users SET role = ?, cc_groupe = ? WHERE id = ?').run(role, cc_groupe || null, req.params.id);
  }
  res.json({ ok: true });
});

// DELETE
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM dashboard_users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
