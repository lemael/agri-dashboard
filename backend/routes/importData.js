const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/', async (req, res) => {
  const { orders, revendeurOrders, ventes, products, profiles, users } = req.body;
  const imported = { orders: 0, revendeurOrders: 0, ventes: 0, products: 0, profiles: 0, producteurs: 0 };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Orders (grossiste) ---
    if (orders?.commandes) {
      for (const o of orders.commandes) {
        await client.query(
          `INSERT INTO orders (id, grossiste_email, commande_at, status, produit)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO UPDATE SET
             grossiste_email = EXCLUDED.grossiste_email,
             commande_at = EXCLUDED.commande_at,
             status = EXCLUDED.status,
             produit = EXCLUDED.produit`,
          [o.id, o.grossisteEmail, o.commandeAt, o.status, JSON.stringify(o.produit)]
        );
        imported.orders++;
      }
    }

    // --- Revendeur Orders ---
    if (revendeurOrders?.commandes) {
      for (const o of revendeurOrders.commandes) {
        await client.query(
          `INSERT INTO revendeur_orders (id, revendeur_email, commande_at, status, produit)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO UPDATE SET
             revendeur_email = EXCLUDED.revendeur_email,
             commande_at = EXCLUDED.commande_at,
             status = EXCLUDED.status,
             produit = EXCLUDED.produit`,
          [o.id, o.revendeurEmail, o.commandeAt, o.status, JSON.stringify(o.produit)]
        );
        imported.revendeurOrders++;
      }
    }

    // --- Ventes ---
    if (ventes?.ventes) {
      for (const v of ventes.ventes) {
        await client.query(
          `INSERT INTO ventes (id, grossiste_email, created_at, status, type, variete, quantite, prix, etat, producer_email, nom_entreprise, lieu, date_recolte)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO UPDATE SET
             grossiste_email = EXCLUDED.grossiste_email,
             created_at = EXCLUDED.created_at,
             status = EXCLUDED.status,
             type = EXCLUDED.type,
             variete = EXCLUDED.variete,
             quantite = EXCLUDED.quantite,
             prix = EXCLUDED.prix,
             etat = EXCLUDED.etat,
             producer_email = EXCLUDED.producer_email,
             nom_entreprise = EXCLUDED.nom_entreprise,
             lieu = EXCLUDED.lieu,
             date_recolte = EXCLUDED.date_recolte`,
          [v.id, v.grossisteEmail, v.createdAt, v.status, v.type, v.variete, v.quantite, v.prix, v.etat, v.producerEmail, v.nomEntreprise, v.lieu, v.dateRecolte]
        );
        imported.ventes++;
      }
    }

    // --- Products ---
    if (products?.producers) {
      for (const [email, data] of Object.entries(products.producers)) {
        for (const p of (data.products || [])) {
          await client.query(
            `INSERT INTO products (id, producer_email, type, variete, quantite, prix, created_at, status, sold_out, etat, lieu, date_recolte, nom_entreprise, photos)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             ON CONFLICT (id) DO UPDATE SET
               producer_email = EXCLUDED.producer_email,
               type = EXCLUDED.type,
               variete = EXCLUDED.variete,
               quantite = EXCLUDED.quantite,
               prix = EXCLUDED.prix,
               created_at = EXCLUDED.created_at,
               status = EXCLUDED.status,
               sold_out = EXCLUDED.sold_out,
               etat = EXCLUDED.etat,
               lieu = EXCLUDED.lieu,
               date_recolte = EXCLUDED.date_recolte,
               nom_entreprise = EXCLUDED.nom_entreprise,
               photos = EXCLUDED.photos`,
            [p.id, email, p.type, p.variete, p.quantite, p.prix, p.createdAt, p.status, p.soldOut || false, p.etat, p.lieu, p.dateRecolte, p.nomEntreprise, JSON.stringify(p.photos || [])]
          );
          imported.products++;
        }
      }
    }

    // --- Profiles ---
    if (profiles && typeof profiles === 'object') {
      for (const [email, p] of Object.entries(profiles)) {
        await client.query(
          `INSERT INTO profiles (email, nom, prenom, role, telephone, adresse, extra)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (email) DO UPDATE SET
             nom = EXCLUDED.nom,
             prenom = EXCLUDED.prenom,
             role = EXCLUDED.role,
             telephone = EXCLUDED.telephone,
             adresse = EXCLUDED.adresse,
             extra = EXCLUDED.extra`,
          [email, p.nom, p.prenom, p.role, p.telephone, p.adresse, JSON.stringify(p)]
        );
        imported.profiles++;
      }
    }

    // --- Producteurs (from users.json) ---
    if (users?.producteurs) {
      for (const p of users.producteurs) {
        await client.query(
          `INSERT INTO producteurs (id, nom, prenom, email, telephone, nom_entreprise, nom_exploitation, localisation, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO UPDATE SET
             nom = EXCLUDED.nom,
             prenom = EXCLUDED.prenom,
             email = EXCLUDED.email,
             telephone = EXCLUDED.telephone,
             nom_entreprise = EXCLUDED.nom_entreprise,
             nom_exploitation = EXCLUDED.nom_exploitation,
             localisation = EXCLUDED.localisation,
             status = EXCLUDED.status,
             created_at = EXCLUDED.created_at`,
          [p.id, p.nom, p.prenom, p.email, p.telephone, p.nomEntreprise, p.nomExploitation, p.localisation, p.status, p.createdAt]
        );
        imported.producteurs++;
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, imported });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
