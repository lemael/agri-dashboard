/**
 * mockApi.js — Mode démo sans backend.
 * Toutes les données sont stockées dans localStorage,
 * pré-chargées depuis les fichiers JSON statiques.
 */

const S = {
  read(k, def = []) {
    try { return JSON.parse(localStorage.getItem('fac_' + k)) ?? def; }
    catch { return def; }
  },
  write(k, v) { localStorage.setItem('fac_' + k, JSON.stringify(v)); },
};

const genId = (p = 'id') =>
  `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const base = import.meta.env.BASE_URL || '/';
const dataUrl = (file) => `${base}data/${file}`;

// Utilisateurs par défaut (mot de passe en clair pour le mode démo)
const SEED_USERS = [
  { id: 'usr_ceo',    email: 'ceo@facilitar.cm',       nom: 'Directeur', prenom: 'Général', role: 'ceo',         cc_groupe: null, password: 'Admin1234',  created_at: '2026-01-01T00:00:00Z' },
  { id: 'usr_co',     email: 'comptable@facilitar.cm',  nom: 'Nguema',    prenom: 'Sophie',  role: 'comptable',   cc_groupe: null, password: 'Compta1234', created_at: '2026-01-01T00:00:00Z' },
  { id: 'usr_cc1',    email: 'cc1@facilitar.cm',        nom: 'Mvondo',    prenom: 'Paul',    role: 'call_center', cc_groupe: 1,    password: 'CC1234',     created_at: '2026-01-01T00:00:00Z' },
  { id: 'usr_cc2',    email: 'cc2@facilitar.cm',        nom: 'Abena',     prenom: 'Alice',   role: 'call_center', cc_groupe: 2,    password: 'CC1234',     created_at: '2026-01-01T00:00:00Z' },
  { id: 'usr_mkt',    email: 'marketing@facilitar.cm',  nom: 'Nkeng',     prenom: 'Bruno',   role: 'marketing',   cc_groupe: null, password: 'Mkt1234',    created_at: '2026-01-01T00:00:00Z' },
  { id: 'usr_rh',     email: 'rh@facilitar.cm',         nom: 'Bessem',    prenom: 'Claire',  role: 'rh',          cc_groupe: null, password: 'RH1234',     created_at: '2026-01-01T00:00:00Z' },
];

if (!localStorage.getItem('fac_dusers')) {
  S.write('dusers', SEED_USERS);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function filterByQuery(rows, q = '') {
  const params = new URLSearchParams(q.startsWith('?') ? q.slice(1) : q);
  const status = params.get('status');
  const email  = params.get('email');
  if (status) rows = rows.filter(r => r.status === status || (status === 'sold out' && r.sold_out));
  if (email)  rows = rows.filter(r => r.producer_email === email);
  return rows;
}

function ok(data) { return Promise.resolve(data); }

// ─── Import depuis les fichiers JSON ────────────────────────────────────────

async function importData({ orders, revendeurOrders, ventes, products, profiles, users }) {
  const imported = { orders: 0, revendeurOrders: 0, ventes: 0, products: 0, producteurs: 0, profiles: 0 };

  if (orders?.commandes) {
    const existing = S.read('orders');
    const ids = new Set(existing.map(o => o.id));
    const toAdd = orders.commandes
      .filter(o => !ids.has(o.id))
      .map(o => ({
        id: o.id,
        grossiste_email: o.grossisteEmail,
        commande_at: o.commandeAt,
        status: o.status,
        produit: o.produit,
      }));
    S.write('orders', [...existing, ...toAdd]);
    imported.orders = toAdd.length;
  }

  if (revendeurOrders?.commandes) {
    const existing = S.read('revorders');
    const ids = new Set(existing.map(o => o.id));
    const toAdd = revendeurOrders.commandes
      .filter(o => !ids.has(o.id))
      .map(o => ({
        id: o.id,
        revendeur_email: o.revendeurEmail,
        commande_at: o.commandeAt,
        status: o.status,
        produit: o.produit,
      }));
    S.write('revorders', [...existing, ...toAdd]);
    imported.revendeurOrders = toAdd.length;
  }

  if (ventes?.ventes) {
    const existing = S.read('ventes');
    const ids = new Set(existing.map(v => v.id));
    const toAdd = ventes.ventes
      .filter(v => !ids.has(v.id))
      .map(v => ({
        id: v.id,
        grossiste_email: v.grossisteEmail,
        created_at: v.createdAt,
        status: v.status,
        type: v.type,
        variete: v.variete,
        quantite: v.quantite,
        prix: v.prix,
        etat: v.etat,
        producer_email: v.producerEmail,
        nom_entreprise: v.nomEntreprise,
        lieu: v.lieu,
        date_recolte: v.dateRecolte,
      }));
    S.write('ventes', [...existing, ...toAdd]);
    imported.ventes = toAdd.length;
  }

  if (products?.producers) {
    const existing = S.read('products');
    const ids = new Set(existing.map(p => p.id));
    const toAdd = [];
    for (const [email, data] of Object.entries(products.producers)) {
      for (const p of (data.products || [])) {
        if (!ids.has(p.id)) {
          toAdd.push({
            id: p.id,
            producer_email: email,
            type: p.type,
            variete: p.variete,
            quantite: p.quantite,
            prix: p.prix,
            created_at: p.createdAt,
            status: p.status || 'actif',
            sold_out: p.soldOut || false,
            etat: p.etat,
            lieu: p.lieu,
            date_recolte: p.dateRecolte,
            nom_entreprise: p.nomEntreprise,
            photos: p.photos || [],
          });
        }
      }
    }
    S.write('products', [...existing, ...toAdd]);
    imported.products = toAdd.length;
  }

  if (users?.producteurs) {
    const existing = S.read('producteurs');
    const ids = new Set(existing.map(p => p.id));
    const toAdd = users.producteurs
      .filter(p => !ids.has(p.id))
      .map(p => ({
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        email: p.email,
        telephone: p.telephone,
        nom_entreprise: p.nomEntreprise,
        nom_exploitation: p.nomExploitation,
        localisation: p.localisation,
        status: p.status || 'actif',
        created_at: p.createdAt,
      }));
    S.write('producteurs', [...existing, ...toAdd]);
    imported.producteurs = toAdd.length;
  }

  return ok({ ok: true, imported });
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const mockApi = {

  // Auth
  login(email, password) {
    const users = S.read('dusers');
    const user = users.find(u => u.email === email.toLowerCase().trim());
    if (!user || user.password !== password)
      return ok({ ok: false, error: 'Email ou mot de passe incorrect' });
    const { password: _, ...safeUser } = user;
    return ok({ ok: true, user: safeUser });
  },

  // Stats
  stats() {
    const orders    = S.read('orders');
    const revOrders = S.read('revorders');
    const ventes    = S.read('ventes');
    const products  = S.read('products');

    const totalOrders     = orders.length;
    const totalRevOrders  = revOrders.length;
    const totalVentes     = ventes.length;
    const totalProducts   = products.length;
    const pendingOrders   = orders.filter(o => o.status === 'en attente').length;
    const pendingRevOrders = revOrders.filter(o => o.status === 'en attente').length;
    const ventesDispos    = ventes.filter(v => v.status === 'disponible').length;

    const caOrders    = orders.filter(o => o.status !== 'annulée').reduce((s, o) => s + (o.produit?.prix || 0), 0);
    const caRevOrders = revOrders.filter(o => o.status !== 'annulée').reduce((s, o) => s + (o.produit?.prix || 0), 0);

    const byStatus = (arr) => Object.entries(
      arr.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {})
    ).map(([status, count]) => ({ status, count }));

    const sorted = (arr, key) => [...arr].sort((a, b) => (b[key] || '').localeCompare(a[key] || ''));

    return ok({
      totals: { totalOrders, totalRevOrders, totalVentes, totalProducts },
      pending: { pendingOrders, pendingRevOrders, ventesDispos },
      chiffreAffaires: { orders: caOrders, revendeurOrders: caRevOrders, total: caOrders + caRevOrders },
      recentOrders: sorted(orders, 'commande_at').slice(0, 5),
      recentRevOrders: sorted(revOrders, 'commande_at').slice(0, 5),
      ordersByStatus: byStatus(orders),
      ventesByStatus: byStatus(ventes),
    });
  },

  // Orders
  orders(q = '') { return ok(filterByQuery(S.read('orders'), q).sort((a, b) => (b.commande_at || '').localeCompare(a.commande_at || ''))); },
  updateOrderStatus(id, status) {
    S.write('orders', S.read('orders').map(r => r.id === id ? { ...r, status } : r));
    return ok({ ok: true });
  },

  // Revendeur orders
  revendeurOrders(q = '') { return ok(filterByQuery(S.read('revorders'), q).sort((a, b) => (b.commande_at || '').localeCompare(a.commande_at || ''))); },
  updateRevOrderStatus(id, status) {
    S.write('revorders', S.read('revorders').map(r => r.id === id ? { ...r, status } : r));
    return ok({ ok: true });
  },

  // Ventes
  ventes(q = '') { return ok(filterByQuery(S.read('ventes'), q).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))); },
  updateVenteStatus(id, status) {
    S.write('ventes', S.read('ventes').map(r => r.id === id ? { ...r, status } : r));
    return ok({ ok: true });
  },
  deleteVente(id) {
    S.write('ventes', S.read('ventes').filter(r => r.id !== id));
    return ok({ ok: true });
  },

  // Products
  products(q = '') { return ok(filterByQuery(S.read('products'), q).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))); },
  deleteProduct(id) {
    S.write('products', S.read('products').filter(r => r.id !== id));
    return ok({ ok: true });
  },

  // Producteurs
  producteurs(q = '') { return ok(filterByQuery(S.read('producteurs'), q)); },
  deleteProducteur(id) {
    S.write('producteurs', S.read('producteurs').filter(r => r.id !== id));
    return ok({ ok: true });
  },

  // Import
  async importData(data) { return importData(data); },

  // Import automatique depuis /data/
  async importFromFiles() {
    const [orders, revendeurOrders, ventes, products, profiles, users] = await Promise.all([
      fetch(dataUrl('orders.json')).then(r => r.json()).catch(() => null),
      fetch(dataUrl('revendeur_orders.json')).then(r => r.json()).catch(() => null),
      fetch(dataUrl('ventes.json')).then(r => r.json()).catch(() => null),
      fetch(dataUrl('products.json')).then(r => r.json()).catch(() => null),
      fetch(dataUrl('profiles.json')).then(r => r.json()).catch(() => null),
      fetch(dataUrl('users.json')).then(r => r.json()).catch(() => null),
    ]);
    return importData({ orders, revendeurOrders, ventes, products, profiles, users });
  },

  // Dépenses
  depenses(q = '') { return ok(filterByQuery(S.read('depenses'), q).sort((a, b) => b.date.localeCompare(a.date))); },
  depensesSummary() {
    const depenses = S.read('depenses');
    const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
    const orders    = S.read('orders').filter(o => o.status !== 'annulée');
    const revOrders = S.read('revorders').filter(o => o.status !== 'annulée');
    const gains = [...orders, ...revOrders].reduce((s, o) => s + (o.produit?.prix || 0), 0);

    const catMap = {};
    depenses.forEach(d => {
      if (!catMap[d.categorie]) catMap[d.categorie] = { categorie: d.categorie, total: 0, count: 0 };
      catMap[d.categorie].total += d.montant;
      catMap[d.categorie].count++;
    });
    const totaux = Object.values(catMap);

    const promoMap = {};
    depenses.filter(d => d.categorie === 'frais_promo' && d.niveau).forEach(d => {
      if (!promoMap[d.niveau]) promoMap[d.niveau] = { niveau: d.niveau, total: 0 };
      promoMap[d.niveau].total += d.montant;
    });
    const promosParNiveau = Object.values(promoMap);

    return ok({ totaux, promosParNiveau, totalDepenses, gains, resultat: gains - totalDepenses });
  },
  createDepense(data) {
    const dep = { ...data, id: genId('dep'), montant: parseFloat(data.montant), created_at: new Date().toISOString() };
    S.write('depenses', [dep, ...S.read('depenses')]);
    return ok({ ok: true, id: dep.id });
  },
  deleteDepense(id) {
    S.write('depenses', S.read('depenses').filter(r => r.id !== id));
    return ok({ ok: true });
  },

  // Dashboard users
  dashboardUsers() {
    return ok(S.read('dusers').map(({ password: _, ...u }) => u));
  },
  createDashboardUser(data) {
    const users = S.read('dusers');
    if (users.find(u => u.email === data.email.toLowerCase().trim()))
      return ok({ ok: false, error: 'Cet email est déjà utilisé' });
    const user = { ...data, id: genId('usr'), email: data.email.toLowerCase().trim(), created_at: new Date().toISOString() };
    S.write('dusers', [user, ...users]);
    return ok({ ok: true, id: user.id });
  },
  updateDashboardUser(id, data) {
    S.write('dusers', S.read('dusers').map(u => u.id === id ? { ...u, ...data } : u));
    return ok({ ok: true });
  },
  deleteDashboardUser(id) {
    S.write('dusers', S.read('dusers').filter(u => u.id !== id));
    return ok({ ok: true });
  },
};
