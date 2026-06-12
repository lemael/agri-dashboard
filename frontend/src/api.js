import { mockApi } from './mockApi';

const USE_MOCK = !import.meta.env.VITE_API_URL;

const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export const api = USE_MOCK ? mockApi : {
  stats:          () => get('/stats'),
  orders:         (q = '') => get(`/orders${q}`),
  updateOrderStatus:  (id, status) => patch(`/orders/${id}/status`, { status }),
  revendeurOrders:(q = '') => get(`/revendeur-orders${q}`),
  updateRevOrderStatus: (id, status) => patch(`/revendeur-orders/${id}/status`, { status }),
  createRevendeurOrder: (data) => post('/revendeur-orders', data),
  ventes:         (q = '') => get(`/ventes${q}`),
  updateVenteStatus: (id, status) => patch(`/ventes/${id}/status`, { status }),
  deleteVente:    (id) => del(`/ventes/${id}`),
  products:       (q = '') => get(`/products${q}`),
  deleteProduct:  (id) => del(`/products/${id}`),
  producteurs:    (q = '') => get(`/producteurs${q}`),
  deleteProducteur: (id) => del(`/producteurs/${id}`),
  importData:     (data) => post('/import', data),
  importFromFiles: null,

  // Auth
  login: (username, password) => post('/auth/login', { username, password }),
  register: (data)           => post('/auth/register', data), // data: { nom, prenom, username, password }

  // Dépenses
  depenses:        (q = '') => get(`/depenses${q}`),
  depensesSummary: ()       => get('/depenses/summary'),
  createDepense:   (data)   => post('/depenses', data),
  deleteDepense:   (id)     => del(`/depenses/${id}`),

  // Dépenses CC (filtrées par agent)
  ccDepenses:      (email)  => get(`/depenses?created_by=${encodeURIComponent(email)}`),

  // Comptabilité (module complet)
  comptaOverview:          ()      => get('/comptabilite/dashboard'),
  comptaVentesAnalyse:     ()      => get('/comptabilite/ventes-analyse'),
  comptaPaiements:         (q = '') => get(`/comptabilite/paiements${q}`),
  createComptaPaiement:    (data)  => post('/comptabilite/paiements', data),
  updateComptaPaiement:    (id, data) => patch(`/comptabilite/paiements/${id}`, data),
  deleteComptaPaiement:    (id)    => del(`/comptabilite/paiements/${id}`),
  comptaCommissions:       (q = '') => get(`/comptabilite/commissions${q}`),
  createComptaCommission:  (data)  => post('/comptabilite/commissions', data),
  updateComptaCommission:  (id, data) => patch(`/comptabilite/commissions/${id}`, data),
  deleteComptaCommission:  (id)    => del(`/comptabilite/commissions/${id}`),
  comptaAnalyseProduits:   ()      => get('/comptabilite/analyse-produits'),
  // Suivi des ventes (cœur du comptable)
  suiviVentes:             (q = '') => get(`/comptabilite/suivi-ventes${q}`),
  createSuiviVente:        (data)  => post('/comptabilite/suivi-ventes', data),
  updateSuiviVente:        (id, data) => put(`/comptabilite/suivi-ventes/${id}`, data),
  deleteSuiviVente:        (id)    => del(`/comptabilite/suivi-ventes/${id}`),
  importSuiviVentes:       ()      => post('/comptabilite/suivi-ventes/import', {}),

  // Utilisateurs du dashboard
  dashboardUsers:       ()     => get('/dashboard-users'),
  createDashboardUser:  (data) => post('/dashboard-users', data),
  deleteDashboardUser:  (id)   => del(`/dashboard-users/${id}`),
  updateDashboardUser:  (id, data) => patch(`/dashboard-users/${id}`, data),
  pendingUsers:         ()     => get('/dashboard-users/pending'),
  validateUser:         (id)   => patch(`/dashboard-users/${id}/validate`, {}),
  rejectUser:           (id)   => patch(`/dashboard-users/${id}/reject`, {}),

  // Call Center
  ccProfile:       (email) => get(`/call-center/profile/${encodeURIComponent(email)}`),
  ccSaveProfile:   (data)  => post('/call-center/profile', data),
  ccClients:       (email) => get(`/call-center/clients?email=${encodeURIComponent(email)}`),
  ccAddClient:     (data)  => post('/call-center/clients', data),
  ccUpdateClient:  (id, data) => put(`/call-center/clients/${id}`, data),
  ccDeleteClient:  (id)    => del(`/call-center/clients/${id}`),
  ccTrends:        (email) => get(`/call-center/trends?email=${encodeURIComponent(email)}`),

  // Souhaits (partagés)
  ccSouhaits:        (q = '') => get(`/call-center/souhaits${q}`),
  ccAddSouhait:      (data)   => post('/call-center/souhaits', data),
  ccUpdateSouhait:   (id, data) => patch(`/call-center/souhaits/${id}`, data),
  ccDeleteSouhait:   (id)     => del(`/call-center/souhaits/${id}`),

  // Produits des grossistes (pour CC Revendeur)
  grossisteProduits: ()       => get('/call-center/grossiste-produits'),

  // Listes pour Comptabilité
  ccAllClients: (groupe) => get(`/call-center/all-clients${groupe != null ? '?groupe=' + groupe : ''}`),

  // Historique des prix
  prixHistory:     ()       => get('/call-center/prix-history'),
  addPrixHistory:  (data)   => post('/call-center/prix-history', data),

  // Planning mensuel (comptable + CEO)
  planning:        (mois)   => get(`/planning${mois ? '?mois=' + encodeURIComponent(mois) : ''}`),
  createPlanning:  (data)   => post('/planning', data),
  updatePlanning:  (id, data) => patch(`/planning/${id}`, data),
  deletePlanning:  (id)     => del(`/planning/${id}`),
};
