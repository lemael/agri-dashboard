const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('./data.sqlite');

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
    montant REAL NOT NULL,
    description TEXT,
    beneficiaire TEXT,
    niveau TEXT,
    date TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT
  );
`);

// Seed default dashboard users
const hashPwd = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');
const seedUsers = [
  { id: 'usr_ceo',       email: 'ceo@facilitar.cm',        nom: 'Directeur',  prenom: 'Général', role: 'ceo',         cc_groupe: null, password: 'Admin1234'  },
  { id: 'usr_compta',    email: 'comptable@facilitar.cm',   nom: 'Nguema',     prenom: 'Sophie',  role: 'comptable',   cc_groupe: null, password: 'Compta1234' },
  { id: 'usr_cc1',       email: 'cc1@facilitar.cm',         nom: 'Mvondo',     prenom: 'Paul',    role: 'call_center', cc_groupe: 1,    password: 'CC1234'     },
  { id: 'usr_cc2',       email: 'cc2@facilitar.cm',         nom: 'Abena',      prenom: 'Alice',   role: 'call_center', cc_groupe: 2,    password: 'CC1234'     },
  { id: 'usr_marketing', email: 'marketing@facilitar.cm',   nom: 'Nkeng',      prenom: 'Bruno',   role: 'marketing',   cc_groupe: null, password: 'Mkt1234'    },
  { id: 'usr_rh',        email: 'rh@facilitar.cm',          nom: 'Bessem',     prenom: 'Claire',  role: 'rh',          cc_groupe: null, password: 'RH1234'     },
];
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO dashboard_users (id, email, nom, prenom, role, cc_groupe, password_hash, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const u of seedUsers) {
  insertUser.run(u.id, u.email, u.nom, u.prenom, u.role, u.cc_groupe, hashPwd(u.password), new Date().toISOString());
}

module.exports = db;
