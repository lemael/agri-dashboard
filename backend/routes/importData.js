const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * POST /api/import
 * Importe les données JSON depuis l'app Flutter.
 * Body: { orders, revendeurOrders, ventes, products, profiles }
 */
router.post('/', (req, res) => {
  const { orders, revendeurOrders, ventes, products, profiles, users } = req.body;
  let imported = { orders: 0, revendeurOrders: 0, ventes: 0, products: 0, profiles: 0, producteurs: 0 };

  // --- Orders (grossiste) ---
  if (orders?.commandes) {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO orders (id, grossiste_email, commande_at, status, produit)
      VALUES (?, ?, ?, ?, ?)
    `);
    const batchOrders = db.transaction((items) => {
      for (const o of items) {
        upsert.run(o.id, o.grossisteEmail, o.commandeAt, o.status, JSON.stringify(o.produit));
        imported.orders++;
      }
    });
    batchOrders(orders.commandes);
  }

  // --- Revendeur Orders ---
  if (revendeurOrders?.commandes) {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO revendeur_orders (id, revendeur_email, commande_at, status, produit)
      VALUES (?, ?, ?, ?, ?)
    `);
    const batch = db.transaction((items) => {
      for (const o of items) {
        upsert.run(o.id, o.revendeurEmail, o.commandeAt, o.status, JSON.stringify(o.produit));
        imported.revendeurOrders++;
      }
    });
    batch(revendeurOrders.commandes);
  }

  // --- Ventes ---
  if (ventes?.ventes) {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO ventes
        (id, grossiste_email, created_at, status, type, variete, quantite, prix, etat, producer_email, nom_entreprise, lieu, date_recolte)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const batch = db.transaction((items) => {
      for (const v of items) {
        upsert.run(v.id, v.grossisteEmail, v.createdAt, v.status, v.type, v.variete, v.quantite, v.prix, v.etat, v.producerEmail, v.nomEntreprise, v.lieu, v.dateRecolte);
        imported.ventes++;
      }
    });
    batch(ventes.ventes);
  }

  // --- Products ---
  if (products?.producers) {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO products
        (id, producer_email, type, variete, quantite, prix, created_at, status, sold_out, etat, lieu, date_recolte, nom_entreprise, photos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const batch = db.transaction((producers) => {
      for (const [email, data] of Object.entries(producers)) {
        for (const p of (data.products || [])) {
          upsert.run(p.id, email, p.type, p.variete, p.quantite, p.prix, p.createdAt, p.status, p.soldOut ? 1 : 0, p.etat, p.lieu, p.dateRecolte, p.nomEntreprise, JSON.stringify(p.photos || []));
          imported.products++;
        }
      }
    });
    batch(products.producers);
  }

  // --- Profiles ---
  if (profiles && typeof profiles === 'object') {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO profiles (email, nom, prenom, role, telephone, adresse, extra)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const batch = db.transaction((items) => {
      for (const [email, p] of Object.entries(items)) {
        upsert.run(email, p.nom, p.prenom, p.role, p.telephone, p.adresse, JSON.stringify(p));
        imported.profiles++;
      }
    });
    batch(profiles);
  }

  // --- Producteurs (from users.json) ---
  if (users?.producteurs) {
    const upsert = db.prepare(`
      INSERT OR REPLACE INTO producteurs
        (id, nom, prenom, email, telephone, nom_entreprise, nom_exploitation, localisation, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const batch = db.transaction((items) => {
      for (const p of items) {
        upsert.run(p.id, p.nom, p.prenom, p.email, p.telephone, p.nomEntreprise, p.nomExploitation, p.localisation, p.status, p.createdAt);
        imported.producteurs++;
      }
    });
    batch(users.producteurs);
  }

  res.json({ ok: true, imported });
});

module.exports = router;
