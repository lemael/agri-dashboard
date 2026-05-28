const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

const hashPwd = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

async function initDB() {
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
  `);

  // Add status column if not exists (migration)
  await pool.query(`ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
  await pool.query(`ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS telephone TEXT`);
  await pool.query(`ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS username TEXT`);
  await pool.query(`UPDATE dashboard_users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_users_username ON dashboard_users(username) WHERE username IS NOT NULL`);
  await pool.query(`ALTER TABLE cc_profiles ADD COLUMN IF NOT EXISTS geolocation TEXT`);

  // Seed default dashboard users
  const seedUsers = [
    { id: 'usr_ceo',       email: 'ceo@facilitar.cm',        username: 'ceo',        nom: 'Directeur',  prenom: 'Général', role: 'ceo',         cc_groupe: null, password: 'Admin1234'  },
    { id: 'usr_compta',    email: 'comptable@facilitar.cm',   username: 'comptable',  nom: 'Nguema',     prenom: 'Sophie',  role: 'comptable',   cc_groupe: null, password: 'Compta1234' },
    { id: 'usr_cc1',       email: 'cc1@facilitar.cm',         username: 'cc1',        nom: 'Mvondo',     prenom: 'Paul',    role: 'call_center', cc_groupe: 1,    password: 'CC1234'     },
    { id: 'usr_cc2',       email: 'cc2@facilitar.cm',         username: 'cc2',        nom: 'Abena',      prenom: 'Alice',   role: 'call_center', cc_groupe: 2,    password: 'CC1234'     },
    { id: 'usr_marketing', email: 'marketing@facilitar.cm',   username: 'marketing',  nom: 'Nkeng',      prenom: 'Bruno',   role: 'marketing',   cc_groupe: null, password: 'Mkt1234'    },
    { id: 'usr_rh',        email: 'rh@facilitar.cm',          username: 'rh',         nom: 'Bessem',     prenom: 'Claire',  role: 'rh',          cc_groupe: null, password: 'RH1234'     },
  ];
  for (const u of seedUsers) {
    await pool.query(
      `INSERT INTO dashboard_users (id, email, username, nom, prenom, role, cc_groupe, password_hash, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username`,
      [u.id, u.email, u.username, u.nom, u.prenom, u.role, u.cc_groupe, hashPwd(u.password), new Date().toISOString()]
    );
  }
}

module.exports = { pool, initDB };
