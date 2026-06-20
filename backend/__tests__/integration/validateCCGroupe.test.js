/**
 * TESTS D'INTÉGRATION — Fix validation CEO : forcer cc_groupe à la validation
 *
 * Régression : PATCH /api/dashboard-users/:id/validate envoyait un body vide
 * → cc_groupe restait NULL en base → l'agent voyait "En attente d'assignation".
 *
 * Fix : le frontend transmet désormais cc_groupe dans le body.
 * Le backend (route /validate) supporte déjà ce paramètre via :
 *   if (cc_groupe !== undefined) → UPDATE SET status='active', cc_groupe=$2
 */

delete process.env.DATABASE_URL;

const request = require('supertest');
const path    = require('path');
const crypto  = require('crypto');

const TEST_DB = path.join(__dirname, '../../test_validate_cc.db');
process.env.SQLITE_PATH = TEST_DB;

let app, pool;

const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

beforeAll(async () => {
  jest.resetModules();
  const db = require('../../db');
  pool = db.pool;
  await db.initDB();

  const express = require('express');
  const cors    = require('cors');
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth',             require('../../routes/auth'));
  app.use('/api/dashboard-users',  require('../../routes/dashboardUsers'));
});

afterAll(async () => {
  const fs = require('fs');
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

// ─── Helper : créer un agent call_center en attente ──────────────────────────

async function createPendingAgent(username) {
  const id    = 'tval_' + username;
  const email = `${username}@test.local`;
  await pool.query(
    `INSERT INTO dashboard_users
       (id, email, username, nom, prenom, role, cc_groupe, password_hash, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'call_center', NULL, ?, 'pending', ?)
     ON CONFLICT(email) DO UPDATE SET status='pending', cc_groupe=NULL`,
    [id, email, username, 'Test', username, hash('pass1234'), new Date().toISOString()]
  );
  return { id, email };
}

async function getUser(id) {
  const { rows } = await pool.query(
    'SELECT cc_groupe, status FROM dashboard_users WHERE id = ?', [id]
  );
  return rows[0];
}

// ─── 1. PATCH /validate avec cc_groupe → assignation correcte ────────────────

describe('PATCH /api/dashboard-users/:id/validate — avec cc_groupe (comportement corrigé)', () => {
  test('validation avec cc_groupe="1" → status=active, cc_groupe=1 (Grossiste)', async () => {
    const { id } = await createPendingAgent('val_grossiste');

    const res = await request(app)
      .patch(`/api/dashboard-users/${id}/validate`)
      .send({ cc_groupe: 1 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const user = await getUser(id);
    expect(user.status).toBe('active');
    expect(Number(user.cc_groupe)).toBe(1);
  });

  test('validation avec cc_groupe="2" → status=active, cc_groupe=2 (Revendeur)', async () => {
    const { id } = await createPendingAgent('val_revendeur');

    const res = await request(app)
      .patch(`/api/dashboard-users/${id}/validate`)
      .send({ cc_groupe: 2 });

    expect(res.status).toBe(200);

    const user = await getUser(id);
    expect(user.status).toBe('active');
    expect(Number(user.cc_groupe)).toBe(2);
  });

  test('validation avec cc_groupe en string "1" → cc_groupe correctement enregistré', async () => {
    const { id } = await createPendingAgent('val_str_groupe');

    await request(app)
      .patch(`/api/dashboard-users/${id}/validate`)
      .send({ cc_groupe: '1' });

    const user = await getUser(id);
    expect(Number(user.cc_groupe)).toBe(1);
  });
});

// ─── 2. PATCH /validate sans cc_groupe → régression documentée ───────────────

describe('PATCH /api/dashboard-users/:id/validate — sans cc_groupe (ancien comportement bugué)', () => {
  test('validation sans cc_groupe → status=active MAIS cc_groupe reste NULL (BUG CONTOURNÉ CÔTÉ FRONTEND)', async () => {
    const { id } = await createPendingAgent('val_sans_groupe');

    const res = await request(app)
      .patch(`/api/dashboard-users/${id}/validate`)
      .send({}); // body vide = ancien comportement avant fix frontend

    expect(res.status).toBe(200);

    const user = await getUser(id);
    expect(user.status).toBe('active');
    // Le backend seul ne bloque pas — c'est le frontend qui impose le groupe
    expect(user.cc_groupe).toBeNull();
  });
});

// ─── 3. Connexion après validation correcte — cc_groupe présent dans la session ──

describe('Login après validation avec cc_groupe → données complètes retournées', () => {
  test('agent validé avec cc_groupe=1 reçoit cc_groupe dans la réponse login', async () => {
    const { id } = await createPendingAgent('login_after_val_g');

    await request(app)
      .patch(`/api/dashboard-users/${id}/validate`)
      .send({ cc_groupe: 1 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'login_after_val_g', password: 'pass1234' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Number(res.body.user.cc_groupe)).toBe(1);
    // L'agent ne verra plus l'écran "En attente d'assignation"
    expect(res.body.user.status).toBe('active');
  });

  test('agent validé avec cc_groupe=2 reçoit cc_groupe=2 dans la réponse login', async () => {
    const { id } = await createPendingAgent('login_after_val_r');

    await request(app)
      .patch(`/api/dashboard-users/${id}/validate`)
      .send({ cc_groupe: 2 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'login_after_val_r', password: 'pass1234' });

    expect(res.status).toBe(200);
    expect(Number(res.body.user.cc_groupe)).toBe(2);
  });

  test('agent validé SANS cc_groupe → cc_groupe=null → verrait encore l\'écran d\'attente', async () => {
    const { id } = await createPendingAgent('login_after_null');

    // Simule l'ANCIEN comportement frontend (body vide)
    await request(app)
      .patch(`/api/dashboard-users/${id}/validate`)
      .send({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'login_after_null', password: 'pass1234' });

    expect(res.status).toBe(200);
    // cc_groupe est null → le frontend afficherait l'écran d'attente
    expect(res.body.user.cc_groupe).toBeNull();
  });
});

// ─── 4. Mise à jour du groupe via PATCH /:id (GestionUtilisateurs) ───────────

describe('PATCH /api/dashboard-users/:id — correction d\'un agent déjà actif sans groupe', () => {
  test('un agent actif sans groupe peut se voir assigner un groupe a posteriori', async () => {
    const { id } = await createPendingAgent('fix_after_active');

    // Valider sans groupe (bug simulé)
    await request(app)
      .patch(`/api/dashboard-users/${id}/validate`)
      .send({});

    let user = await getUser(id);
    expect(user.cc_groupe).toBeNull();

    // CEO corrige via GestionUtilisateurs
    const res = await request(app)
      .patch(`/api/dashboard-users/${id}`)
      .send({ role: 'call_center', cc_groupe: '2' });

    expect(res.status).toBe(200);

    user = await getUser(id);
    expect(Number(user.cc_groupe)).toBe(2);
  });

  test('après correction, le login retourne le bon cc_groupe', async () => {
    const { id } = await createPendingAgent('fix_then_login');

    await request(app).patch(`/api/dashboard-users/${id}/validate`).send({});
    await request(app).patch(`/api/dashboard-users/${id}`).send({ role: 'call_center', cc_groupe: '1' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'fix_then_login', password: 'pass1234' });

    expect(res.status).toBe(200);
    expect(Number(res.body.user.cc_groupe)).toBe(1);
  });
});
