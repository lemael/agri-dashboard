/**
 * TESTS D'INTÉGRATION — Séparation agents CC (Grossiste / Revendeur)
 *
 * Utilise SQLite en mémoire (pas de DATABASE_URL) + supertest.
 * Vérifie les routes réelles de l'API.
 */

// Force SQLite pour les tests
delete process.env.DATABASE_URL;

const request = require('supertest');
const path    = require('path');

// Isoler la DB de test dans un fichier temporaire séparé
const TEST_DB = path.join(__dirname, '../../test.db');
process.env.SQLITE_PATH = TEST_DB;

let app, pool, initDB;

beforeAll(async () => {
  // Charger le serveur Express (sans le démarrer sur un port)
  jest.resetModules();
  const db = require('../../db');
  pool   = db.pool;
  initDB = db.initDB;
  await initDB();

  // Construire l'app sans app.listen
  const express       = require('express');
  const cors          = require('cors');
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth',          require('../../routes/auth'));
  app.use('/api/call-center',   require('../../routes/callCenter'));
  app.use('/api/dashboard-users', require('../../routes/dashboardUsers'));
});

afterAll(async () => {
  // Nettoyer la DB de test
  const fs = require('fs');
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createAgent(username, cc_groupe, status = 'active') {
  const crypto = require('crypto');
  const hash = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');
  const id = 'test_' + username;
  const email = `${username}@test.local`;
  await pool.query(
    `INSERT INTO dashboard_users (id, email, username, nom, prenom, role, cc_groupe, password_hash, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'call_center', ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET cc_groupe=excluded.cc_groupe, status=excluded.status`,
    [id, email, username, 'Test', username, cc_groupe, hash('pass1234'), status, new Date().toISOString()]
  );
  return { id, email, username };
}

async function createCCProfile(email, orientation) {
  await pool.query(
    `INSERT INTO cc_profiles (email, prenom, secteur_principal, orientation, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET orientation=excluded.orientation`,
    [email, 'Test', 'agriculture', orientation, new Date().toISOString()]
  );
}

async function addClient(cc_email, nom) {
  const genId = () => 'cli_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
  const id  = genId();
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO cc_clients (id, cc_email, nom, produits, created_at, updated_at) VALUES (?,?,?,'[]',?,?)`,
    [id, cc_email, nom, now, now]
  );
  return id;
}

// ─── 1. Connexion : seul un agent actif avec cc_groupe peut se connecter ──────

describe('POST /api/auth/login — séparation des agents CC', () => {
  beforeAll(async () => {
    await createAgent('gross_actif', 1, 'active');
    await createAgent('rev_actif',   2, 'active');
    await createAgent('pending_cc',  null, 'pending');
    await createAgent('nullgroupe',  null, 'active');
  });

  test('agent Grossiste actif (cc_groupe=1) peut se connecter', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'gross_actif', password: 'pass1234' });
    expect(res.status).toBe(200);
    expect(res.body.user.cc_groupe).toBe(1);
  });

  test('agent Revendeur actif (cc_groupe=2) peut se connecter', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'rev_actif', password: 'pass1234' });
    expect(res.status).toBe(200);
    expect(res.body.user.cc_groupe).toBe(2);
  });

  test('agent en attente (pending) ne peut pas se connecter', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'pending_cc', password: 'pass1234' });
    expect(res.status).toBe(403);
  });

  test('agent actif avec cc_groupe=null retourne cc_groupe null (PROBLÈME: doit être bloqué)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nullgroupe', password: 'pass1234' });
    // Il peut se connecter mais cc_groupe est null — comportement imprévu
    expect(res.status).toBe(200);
    expect(res.body.user.cc_groupe).toBeNull(); // BUG: devrait être assigné
  });
});

// ─── 2. all-clients : isolation stricte entre groupes ─────────────────────────

describe('GET /api/call-center/all-clients — isolation Grossiste / Revendeur', () => {
  beforeAll(async () => {
    await createAgent('g_client_agent', 1, 'active');
    await createAgent('r_client_agent', 2, 'active');
    await createAgent('null_agent',     null, 'active');
    await addClient('g_client_agent@test.local', 'ClientGrossiste');
    await addClient('r_client_agent@test.local', 'ClientRevendeur');
    await addClient('null_agent@test.local',     'ClientNonClassifie');
  });

  test('groupe=1 retourne uniquement les clients des agents Grossiste', async () => {
    const res = await request(app).get('/api/call-center/all-clients?groupe=1');
    expect(res.status).toBe(200);
    const noms = res.body.map(c => c.nom);
    expect(noms).toContain('ClientGrossiste');
    expect(noms).not.toContain('ClientRevendeur');
  });

  test('groupe=2 retourne uniquement les clients des agents Revendeur', async () => {
    const res = await request(app).get('/api/call-center/all-clients?groupe=2');
    expect(res.status).toBe(200);
    const noms = res.body.map(c => c.nom);
    expect(noms).toContain('ClientRevendeur');
    expect(noms).not.toContain('ClientGrossiste');
  });

  test('PROBLÈME CONNU : groupe=1 ne doit PAS inclure les agents cc_groupe=null', async () => {
    const res = await request(app).get('/api/call-center/all-clients?groupe=1');
    const noms = res.body.map(c => c.nom);
    // Ce test ÉCHOUE si le bug "OR cc_groupe IS NULL" est présent
    expect(noms).not.toContain('ClientNonClassifie');
  });

  test('PROBLÈME CONNU : groupe=2 ne doit PAS inclure les agents cc_groupe=null', async () => {
    const res = await request(app).get('/api/call-center/all-clients?groupe=2');
    const noms = res.body.map(c => c.nom);
    expect(noms).not.toContain('ClientNonClassifie');
  });
});

// ─── 3. grossiste-produits : uniquement cc_groupe=1 ───────────────────────────

describe('GET /api/call-center/grossiste-produits — seuls cc_groupe=1 visibles', () => {
  beforeAll(async () => {
    await createAgent('gros_prod', 1, 'active');
    await createAgent('rev_prod',  2, 'active');
    const now = new Date().toISOString();
    const produits = JSON.stringify([{ nom: 'Maïs', prix: 500 }]);
    await pool.query(
      `INSERT OR REPLACE INTO cc_clients (id, cc_email, nom, produits, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
      ['cli_gros', 'gros_prod@test.local', 'GrossisteAvecProduit', produits, now, now]
    );
    await pool.query(
      `INSERT OR REPLACE INTO cc_clients (id, cc_email, nom, produits, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
      ['cli_rev', 'rev_prod@test.local', 'RevendeurAvecProduit', produits, now, now]
    );
  });

  test('seuls les produits des agents cc_groupe=1 sont retournés', async () => {
    const res = await request(app).get('/api/call-center/grossiste-produits');
    expect(res.status).toBe(200);
    const grossisteNoms = res.body.map(p => p.grossiste_nom);
    expect(grossisteNoms).toContain('GrossisteAvecProduit');
    expect(grossisteNoms).not.toContain('RevendeurAvecProduit');
  });
});

// ─── 4. Souhaits : isolation par email vs groupe ───────────────────────────────

describe('GET /api/call-center/souhaits — filtrage par groupe / email', () => {
  beforeAll(async () => {
    await createAgent('souh_rev1',  2, 'active');
    await createAgent('souh_rev2',  2, 'active');
    await createAgent('souh_gros1', 1, 'active');
    const now = new Date().toISOString();
    await pool.query(
      `INSERT OR REPLACE INTO cc_souhaits (id, cc_email, produit, created_at) VALUES (?,?,?,?)`,
      ['s_r1', 'souh_rev1@test.local', 'Tomate', now]
    );
    await pool.query(
      `INSERT OR REPLACE INTO cc_souhaits (id, cc_email, produit, created_at) VALUES (?,?,?,?)`,
      ['s_r2', 'souh_rev2@test.local', 'Manioc', now]
    );
    await pool.query(
      `INSERT OR REPLACE INTO cc_souhaits (id, cc_email, produit, created_at) VALUES (?,?,?,?)`,
      ['s_g1', 'souh_gros1@test.local', 'ProduitGrossiste', now]
    );
  });

  test('?email=souh_rev1 retourne seulement les souhaits de cet agent', async () => {
    const res = await request(app)
      .get(`/api/call-center/souhaits?email=${encodeURIComponent('souh_rev1@test.local')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].produit).toBe('Tomate');
  });

  test('?groupe=2 retourne les souhaits de TOUS les agents Revendeur (cc_groupe=2)', async () => {
    const res = await request(app).get('/api/call-center/souhaits?groupe=2');
    expect(res.status).toBe(200);
    const produits = res.body.map(s => s.produit);
    expect(produits).toContain('Tomate');
    expect(produits).toContain('Manioc');
    expect(produits).not.toContain('ProduitGrossiste'); // Grossiste ne doit pas apparaître
  });

  test('?groupe=1 retourne les souhaits des Grossiste uniquement', async () => {
    const res = await request(app).get('/api/call-center/souhaits?groupe=1');
    expect(res.status).toBe(200);
    const produits = res.body.map(s => s.produit);
    expect(produits).toContain('ProduitGrossiste');
    expect(produits).not.toContain('Tomate');
    expect(produits).not.toContain('Manioc');
  });
});

// ─── 5. Validation CEO — cc_groupe doit être assigné ──────────────────────────

describe('PATCH /api/dashboard-users/:id/validate — assignation cc_groupe', () => {
  let agentId;

  beforeAll(async () => {
    const agent = await createAgent('agent_to_validate', null, 'pending');
    agentId = agent.id;
  });

  test('validation sans cc_groupe → agent reste avec cc_groupe=null (BUG)', async () => {
    const res = await request(app)
      .patch(`/api/dashboard-users/${agentId}/validate`)
      .send({});
    expect(res.status).toBe(200);
    // Vérifier en base
    const { rows } = await pool.query(
      'SELECT cc_groupe, status FROM dashboard_users WHERE id = ?', [agentId]
    );
    expect(rows[0].status).toBe('active');
    expect(rows[0].cc_groupe).toBeNull(); // BUG: cc_groupe non assigné
  });
});
