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
  login:    (email, password) => post('/auth/login', { email, password }),
  register: (data)           => post('/auth/register', data),

  // Dépenses
  depenses:        (q = '') => get(`/depenses${q}`),
  depensesSummary: ()       => get('/depenses/summary'),
  createDepense:   (data)   => post('/depenses', data),
  deleteDepense:   (id)     => del(`/depenses/${id}`),

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
};
