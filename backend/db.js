const crypto = require('crypto');

const hashPwd = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

// ─── Determine DB mode ────────────────────────────────────────────────────────
const USE_SQLITE = !process.env.DATABASE_URL;
if (USE_SQLITE) {
  console.log('ℹ️  DATABASE_URL not set → SQLite local (local.db)');
} else {
  console.log('✅ DATABASE_URL found → PostgreSQL (Railway)');
}

// ─── SQLite query translator (PostgreSQL syntax → SQLite) ────────────────────
function pgToSqlite(sql) {
  return sql
    // (col::json->>'field')::numeric  →  CAST(json_extract(col, '$.field') AS REAL)
    .replace(/\((\w+)::json->>'(\w+)'\)::numeric/g, "CAST(json_extract($1, '$.$2') AS REAL)")
    // col::json->>'field'  →  json_extract(col, '$.field')
    .replace(/(\w+)::json->>'(\w+)'/g, "json_extract($1, '$.$2')")
    // col::numeric  →  CAST(col AS REAL)
    .replace(/(\w+)::numeric/g, 'CAST($1 AS REAL)')
    // $1, $2, ...  →  ?
    .replace(/\$\d+/g, '?')
    // NOW()  →  datetime('now')
    .replace(/\bNOW\(\)/gi, "datetime('now')");
}

// ─── SQLite pool adapter ──────────────────────────────────────────────────────
function createSQLitePool() {
  let Database;
  try { Database = require('better-sqlite3'); }
  catch (e) { throw new Error('better-sqlite3 not available. Set DATABASE_URL to use PostgreSQL.'); }
  const path = require('path');
  const db = new Database(path.join(__dirname, 'local.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return {
    _db: db,
    query(sql, params = []) {
      const s = pgToSqlite(sql);
      try {
        const upper = s.trimStart().toUpperCase();
        if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
          const rows = db.prepare(s).all(...params);
          return Promise.resolve({ rows });
        } else {
          db.prepare(s).run(...params);
          return Promise.resolve({ rows: [] });
        }
      } catch (err) {
        return Promise.reject(err);
      }
    },
  };
}

// ─── PostgreSQL pool ──────────────────────────────────────────────────────────
function createPGPool() {
  const { Pool } = require('pg');
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

const pool = USE_SQLITE ? createSQLitePool() : createPGPool();

// ─── SQLite schema init (SQLite-compatible DDL) ───────────────────────────────
async function initSQLite() {
  const db = pool._db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      grossiste_email TEXT NOT NULL,
      commande_at TEXT,
      status TEXT DEFAULT 'en attente',
      produit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revendeur_orders (
      id TEXT PRIMARY KEY,
      revendeur_email TEXT NOT NULL,
      commande_at TEXT,
      status TEXT DEFAULT 'en attente',
      produit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ventes (
      id TEXT PRIMARY KEY,
      grossiste_email TEXT,
      created_at TEXT,
      status TEXT DEFAULT 'disponible',
      type TEXT,
      variete TEXT,
      quantite TEXT,
      prix REAL,
      etat TEXT,
      producer_email TEXT,
      nom_entreprise TEXT,
      lieu TEXT,
      date_recolte TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      producer_email TEXT NOT NULL,
      type TEXT,
      variete TEXT,
      quantite TEXT,
      prix REAL,
      created_at TEXT,
      status TEXT DEFAULT 'actif',
      sold_out INTEGER DEFAULT 0,
      etat TEXT,
      lieu TEXT,
      date_recolte TEXT,
      nom_entreprise TEXT,
      photos TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
      email TEXT PRIMARY KEY,
      nom TEXT,
      prenom TEXT,
      role TEXT,
      telephone TEXT,
      adresse TEXT,
      extra TEXT
    );

    CREATE TABLE IF NOT EXISTS producteurs (
      id TEXT PRIMARY KEY,
      nom TEXT,
      prenom TEXT,
      email TEXT UNIQUE,
      telephone TEXT,
      nom_entreprise TEXT,
      nom_exploitation TEXT,
      localisation TEXT,
      status TEXT DEFAULT 'actif',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS dashboard_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT,
      nom TEXT,
      prenom TEXT,
      role TEXT NOT NULL,
      cc_groupe INTEGER,
      password_hash TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      telephone TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS depenses (
      id TEXT PRIMARY KEY,
      categorie TEXT NOT NULL,
      montant REAL NOT NULL,
      description TEXT,
      beneficiaire TEXT,
      niveau TEXT,
      date TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cc_profiles (
      email TEXT PRIMARY KEY,
      prenom TEXT,
      telephone TEXT,
      ville TEXT,
      secteur_principal TEXT,
      secteur_secondaire TEXT,
      orientation TEXT,
      geolocation TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cc_clients (
      id TEXT PRIMARY KEY,
      cc_email TEXT NOT NULL,
      nom TEXT NOT NULL,
      telephone TEXT,
      adresse TEXT,
      geolocation TEXT,
      produits TEXT,
      date_ravitaillement TEXT,
      prochaine_date TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS paiements (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      email TEXT NOT NULL,
      ordre_id TEXT,
      montant REAL NOT NULL,
      montant_paye REAL DEFAULT 0,
      statut TEXT DEFAULT 'en_attente',
      echeance TEXT,
      date_paiement TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS commissions_agents (
      id TEXT PRIMARY KEY,
      agent_email TEXT NOT NULL,
      agent_nom TEXT,
      periode TEXT NOT NULL,
      nb_ventes INTEGER DEFAULT 0,
      ca_realise REAL DEFAULT 0,
      taux_commission REAL DEFAULT 5,
      montant_commission REAL DEFAULT 0,
      statut TEXT DEFAULT 'en_attente',
      notes TEXT,
      created_by TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cc_souhaits (
      id TEXT PRIMARY KEY,
      cc_email TEXT NOT NULL,
      client_nom TEXT,
      produit TEXT,
      quantite TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prix_history (
      id TEXT PRIMARY KEY,
      cc_email TEXT NOT NULL,
      grossiste_nom TEXT,
      produit_nom TEXT,
      ancien_prix REAL,
      nouveau_prix REAL,
      changed_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS compta_suivi_ventes (
      id TEXT PRIMARY KEY,
      order_ref TEXT,
      date_vente TEXT,
      grossiste TEXT,
      revendeur TEXT,
      agent_responsable TEXT,
      produit TEXT,
      quantite REAL DEFAULT 0,
      prix_unitaire REAL DEFAULT 0,
      reduction REAL DEFAULT 0,
      cout_unitaire REAL DEFAULT 0,
      statut_paiement TEXT DEFAULT 'en_attente',
      statut_livraison TEXT DEFAULT 'en_attente',
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_users_username
      ON dashboard_users(username) WHERE username IS NOT NULL;

    CREATE TABLE IF NOT EXISTS planning (
      id TEXT PRIMARY KEY,
      mois TEXT NOT NULL,
      titre TEXT NOT NULL,
      description TEXT,
      statut TEXT DEFAULT 'a_faire',
      priorite TEXT DEFAULT 'normale',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  seedDefaultUsers(db);
}

// ─── PostgreSQL schema init (original) ───────────────────────────────────────
async function initPostgres() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      grossiste_email TEXT NOT NULL,
      commande_at TEXT,
      status TEXT DEFAULT 'en attente',
      produit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revendeur_orders (
      id TEXT PRIMARY KEY,
      revendeur_email TEXT NOT NULL,
      commande_at TEXT,
      status TEXT DEFAULT 'en attente',
      produit TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ventes (
      id TEXT PRIMARY KEY,
      grossiste_email TEXT,
      created_at TEXT,
      status TEXT DEFAULT 'disponible',
      type TEXT,
      variete TEXT,
      quantite TEXT,
      prix NUMERIC,
      etat TEXT,
      producer_email TEXT,
      nom_entreprise TEXT,
      lieu TEXT,
      date_recolte TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      producer_email TEXT NOT NULL,
      type TEXT,
      variete TEXT,
      quantite TEXT,
      prix NUMERIC,
      created_at TEXT,
      status TEXT DEFAULT 'actif',
      sold_out BOOLEAN DEFAULT FALSE,
      etat TEXT,
      lieu TEXT,
      date_recolte TEXT,
      nom_entreprise TEXT,
      photos TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
      email TEXT PRIMARY KEY,
      nom TEXT,
      prenom TEXT,
      role TEXT,
      telephone TEXT,
      adresse TEXT,
      extra TEXT
    );

    CREATE TABLE IF NOT EXISTS producteurs (
      id TEXT PRIMARY KEY,
      nom TEXT,
      prenom TEXT,
      email TEXT UNIQUE,
      telephone TEXT,
      nom_entreprise TEXT,
      nom_exploitation TEXT,
      localisation TEXT,
      status TEXT DEFAULT 'actif',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS dashboard_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      nom TEXT,
      prenom TEXT,
      role TEXT NOT NULL,
      cc_groupe INTEGER,
      password_hash TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS depenses (
      id TEXT PRIMARY KEY,
      categorie TEXT NOT NULL,
      montant NUMERIC NOT NULL,
      description TEXT,
      beneficiaire TEXT,
      niveau TEXT,
      date TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cc_profiles (
      email TEXT PRIMARY KEY,
      prenom TEXT,
      telephone TEXT,
      ville TEXT,
      secteur_principal TEXT,
      secteur_secondaire TEXT,
      orientation TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cc_clients (
      id TEXT PRIMARY KEY,
      cc_email TEXT NOT NULL,
      nom TEXT NOT NULL,
      telephone TEXT,
      adresse TEXT,
      geolocation TEXT,
      produits TEXT,
      date_ravitaillement TEXT,
      prochaine_date TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS paiements (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      email TEXT NOT NULL,
      ordre_id TEXT,
      montant NUMERIC NOT NULL,
      montant_paye NUMERIC DEFAULT 0,
      statut TEXT DEFAULT 'en_attente',
      echeance TEXT,
      date_paiement TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS commissions_agents (
      id TEXT PRIMARY KEY,
      agent_email TEXT NOT NULL,
      agent_nom TEXT,
      periode TEXT NOT NULL,
      nb_ventes INTEGER DEFAULT 0,
      ca_realise NUMERIC DEFAULT 0,
      taux_commission NUMERIC DEFAULT 5,
      montant_commission NUMERIC DEFAULT 0,
      statut TEXT DEFAULT 'en_attente',
      notes TEXT,
      created_by TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cc_souhaits (
      id TEXT PRIMARY KEY,
      cc_email TEXT NOT NULL,
      client_nom TEXT,
      produit TEXT,
      quantite TEXT,
      notes TEXT,
      created_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS prix_history (
      id TEXT PRIMARY KEY,
      cc_email TEXT NOT NULL,
      grossiste_nom TEXT,
      produit_nom TEXT,
      ancien_prix NUMERIC,
      nouveau_prix NUMERIC,
      changed_at TEXT DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS compta_suivi_ventes (
      id TEXT PRIMARY KEY,
      order_ref TEXT,
      date_vente TEXT,
      grossiste TEXT,
      revendeur TEXT,
      agent_responsable TEXT,
      produit TEXT,
      quantite NUMERIC DEFAULT 0,
      prix_unitaire NUMERIC DEFAULT 0,
      reduction NUMERIC DEFAULT 0,
      cout_unitaire NUMERIC DEFAULT 0,
      statut_paiement TEXT DEFAULT 'en_attente',
      statut_livraison TEXT DEFAULT 'en_attente',
      notes TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT now()
    );

  `);

  // Migrations
  await pool.query(`ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
  await pool.query(`ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS telephone TEXT`);
  await pool.query(`ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS username TEXT`);
  await pool.query(`UPDATE dashboard_users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_users_username ON dashboard_users(username) WHERE username IS NOT NULL`);
  await pool.query(`ALTER TABLE cc_profiles ADD COLUMN IF NOT EXISTS geolocation TEXT`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS planning (
      id TEXT PRIMARY KEY,
      mois TEXT NOT NULL,
      titre TEXT NOT NULL,
      description TEXT,
      statut TEXT DEFAULT 'a_faire',
      priorite TEXT DEFAULT 'normale',
      created_by TEXT,
      created_at TEXT DEFAULT NOW()::text,
      updated_at TEXT DEFAULT NOW()::text
    )
  `);

  await seedDefaultUsers(pool);
}

// ─── Shared seed (called with raw db for SQLite, pool for PG) ────────────────
// Comptes de TEST local uniquement — séparés des vrais comptes de production
const LOCAL_TEST_USERS = [
  { id: 'test_ceo',       email: 'ceo@test.local',        username: 'test_ceo',       nom: 'Test',  prenom: 'CEO',       role: 'ceo',         cc_groupe: null, password: 'test1234' },
  { id: 'test_compta',    email: 'compta@test.local',      username: 'test_compta',    nom: 'Test',  prenom: 'Comptable', role: 'comptable',   cc_groupe: null, password: 'test1234' },
  { id: 'test_cc1',       email: 'cc1@test.local',         username: 'test_cc1',       nom: 'Test',  prenom: 'CC Grp1',   role: 'call_center', cc_groupe: 1,    password: 'test1234' },
  { id: 'test_cc2',       email: 'cc2@test.local',         username: 'test_cc2',       nom: 'Test',  prenom: 'CC Grp2',   role: 'call_center', cc_groupe: 2,    password: 'test1234' },
  { id: 'test_marketing', email: 'marketing@test.local',   username: 'test_marketing', nom: 'Test',  prenom: 'Marketing', role: 'marketing',   cc_groupe: null, password: 'test1234' },
  { id: 'test_rh',        email: 'rh@test.local',          username: 'test_rh',        nom: 'Test',  prenom: 'RH',        role: 'rh',          cc_groupe: null, password: 'test1234' },
];

// En production (PostgreSQL), les comptes sont déjà en base — pas de seed
const PROD_USERS = [];



function seedDefaultUsers(db) {
  const users = USE_SQLITE ? LOCAL_TEST_USERS : PROD_USERS;

  if (USE_SQLITE) {
    // db is the raw better-sqlite3 Database instance
    const stmt = db.prepare(`
      INSERT INTO dashboard_users (id, email, username, nom, prenom, role, cc_groupe, password_hash, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      ON CONFLICT(email) DO UPDATE SET
        username = excluded.username,
        nom      = excluded.nom,
        prenom   = excluded.prenom
    `);
    db.transaction((list) => {
      for (const u of list) {
        stmt.run(u.id, u.email, u.username, u.nom, u.prenom, u.role,
          u.cc_groupe, hashPwd(u.password), new Date().toISOString());
      }
    })(users);
  } else {
    // db is the pg Pool — return the promise chain
    return (async () => {
      for (const u of users) {
        await db.query(
          `INSERT INTO dashboard_users (id, email, username, nom, prenom, role, cc_groupe, password_hash, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)
           ON CONFLICT (email) DO UPDATE SET
             username = EXCLUDED.username,
             nom      = EXCLUDED.nom,
             prenom   = EXCLUDED.prenom`,
          [u.id, u.email, u.username, u.nom, u.prenom, u.role,
           u.cc_groupe, hashPwd(u.password), new Date().toISOString()]
        );
      }
    })();
  }
}

// ─── Public initDB ────────────────────────────────────────────────────────────
async function initDB() {
  if (USE_SQLITE) {
    await initSQLite();
  } else {
    await initPostgres();
  }
}

module.exports = { pool, initDB, USE_SQLITE };
