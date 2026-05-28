const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');

const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');
const genId = () => 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, nom, prenom, role, cc_groupe, created_at FROM dashboard_users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, nom, prenom, role, cc_groupe, password } = req.body;
    if (!email || !password || !role)
      return res.status(400).json({ error: 'email, password et role sont requis' });
    const id = genId();
    await pool.query(
      'INSERT INTO dashboard_users (id, email, nom, prenom, role, cc_groupe, password_hash, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id, email.toLowerCase().trim(), nom || null, prenom || null, role, cc_groupe || null, hash(password), new Date().toISOString()]
    );
    res.json({ ok: true, id });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { password, role, cc_groupe } = req.body;
    if (password) {
      await pool.query('UPDATE dashboard_users SET password_hash = $1 WHERE id = $2', [hash(password), req.params.id]);
    }
    if (role !== undefined) {
      await pool.query('UPDATE dashboard_users SET role = $1, cc_groupe = $2 WHERE id = $3', [role, cc_groupe || null, req.params.id]);
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
