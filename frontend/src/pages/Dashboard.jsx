import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import DataTable, { StatusBadge } from '../components/DataTable';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState([]);
  const [showPending, setShowPending] = useState(false);
  const [validating, setValidating] = useState(null);
  const [pendingCCOrders, setPendingCCOrders]   = useState([]);
  const [showCCOrders, setShowCCOrders]         = useState(false);
  const [validatingOrder, setValidatingOrder]   = useState(null);
  const [prixHistory, setPrixHistory]   = useState([]);
  const [showPrixHist, setShowPrixHist] = useState(false);

  // Planning
  const today = new Date();
  const initMois = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [planMois, setPlanMois]           = useState(initMois);
  const [planItems, setPlanItems]         = useState(null);
  const [planFormOpen, setPlanFormOpen]   = useState(false);
  const [planEditItem, setPlanEditItem]   = useState(null);
  const [planForm, setPlanForm]           = useState({ titre: '', description: '', statut: 'a_faire', priorite: 'normale' });
  const [planSaving, setPlanSaving]       = useState(false);

  const STATUTS_PLANNING = [
    { value: 'a_faire',  label: 'À faire',  color: '#ff9800' },
    { value: 'en_cours', label: 'En cours', color: '#2196f3' },
    { value: 'fait',     label: 'Fait',     color: '#4caf50' },
  ];
  const PRIORITES_PLAN = [
    { value: 'haute',   label: '🔴 Haute' },
    { value: 'normale', label: '🟡 Normale' },
    { value: 'basse',   label: '🟢 Basse' },
  ];

  const loadPlan = useCallback(() => {
    api.planning(planMois).then(d => setPlanItems(Array.isArray(d) ? d : [])).catch(() => {});
  }, [planMois]);

  useEffect(() => { loadPlan(); }, [loadPlan]);

  useEffect(() => {
    api.stats().then(setStats).catch(() => setError('Impossible de contacter le serveur.'));
  }, []);

  useEffect(() => {
    if (user?.role === 'ceo') {
      api.pendingUsers().then(setPending).catch(() => {});
      api.revendeurOrders('?status=validation%20CEO').then(d => setPendingCCOrders(Array.isArray(d) ? d : [])).catch(() => {});
      api.prixHistory().then(d => setPrixHistory(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [user]);

  async function handleValidate(id) {
    setValidating(id);
    await api.validateUser(id);
    setPending(p => p.filter(u => u.id !== id));
    setValidating(null);
  }

  async function handleReject(id) {
    setValidating(id);
    await api.rejectUser(id);
    setPending(p => p.filter(u => u.id !== id));
    setValidating(null);
  }

  async function handleValidateCCOrder(id) {
    setValidatingOrder(id);
    await api.updateRevOrderStatus(id, 'en attente');
    setPendingCCOrders(p => p.filter(o => o.id !== id));
    setValidatingOrder(null);
  }

  async function handleRejectCCOrder(id) {
    setValidatingOrder(id);
    await api.updateRevOrderStatus(id, 'annulée');
    setPendingCCOrders(p => p.filter(o => o.id !== id));
    setValidatingOrder(null);
  }

  if (error) return (
    <div style={{ padding: 20, background: '#f8d7da', borderRadius: 8, color: '#721c24' }}>
      {error} Vérifiez que le backend tourne sur <strong>http://localhost:3001</strong>.
    </div>
  );

  if (!stats) return <div style={{ color: '#636e72' }}>Chargement…</div>;

  const { totals, pending: statsPending, chiffreAffaires, recentOrders, recentRevOrders, ordersByStatus } = stats;

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  const colsOrders = [
    { key: 'id', label: 'ID', render: r => r.id.slice(-6) },
    { key: 'grossiste_email', label: 'Grossiste' },
    { key: 'produit', label: 'Produit', render: r => `${r.produit?.type} — ${r.produit?.variete}` },
    { key: 'produit', label: 'Prix', render: r => fmt(r.produit?.prix || 0) },
    { key: 'commande_at', label: 'Date', render: r => r.commande_at?.slice(0, 10) },
    { key: 'status', label: 'Statut', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Tableau de bord</h1>

      {/* ── Notification CEO : comptes en attente ── */}
      {user?.role === 'ceo' && pending.length > 0 && (
        <div style={{
          marginBottom: 24, padding: '14px 18px', borderRadius: 12,
          background: '#fff8e1', border: '1.5px solid #ffc107',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            <div>
              <div style={{ fontWeight: 700, color: '#856404', fontSize: 15 }}>
                {pending.length} compte{pending.length > 1 ? 's' : ''} Call Center en attente de validation
              </div>
              <div style={{ fontSize: 12, color: '#9e7c0a', marginTop: 2 }}>
                Des agents ont créé un compte et attendent votre approbation.
              </div>
            </div>
          </div>
          <button onClick={() => setShowPending(v => !v)} style={{
            padding: '7px 16px', borderRadius: 8, background: '#ffc107', border: 'none',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#5d4037',
          }}>
            {showPending ? 'Masquer ▲' : 'Voir les demandes ▼'}
          </button>
        </div>
      )}

      {/* ── Panel validation comptes ── */}
      {user?.role === 'ceo' && showPending && (
        <div style={{
          marginBottom: 24, background: '#fff', borderRadius: 12, padding: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1e3a2f' }}>
            📋 Demandes de compte Call Center
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: '#f8f9fa', borderRadius: 10,
                border: '1px solid #e9ecef', flexWrap: 'wrap', gap: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a2f' }}>
                    {u.prenom} {u.nom}
                  </div>
                  <div style={{ fontSize: 12, color: '#636e72', marginTop: 2 }}>
                    ✉️ {u.email}{u.telephone ? ` · 📞 ${u.telephone}` : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    {u.role === 'call_center_1' && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#e8f5e9', color: '#2e7d32' }}>
                        📦 Grossiste
                      </span>
                    )}
                    {u.role === 'call_center_2' && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#e3f2fd', color: '#1565c0' }}>
                        🛒 Revendeur
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#aaa' }}>
                      Inscrit le {new Date(u.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleValidate(u.id)}
                    disabled={validating === u.id}
                    style={{
                      padding: '7px 16px', borderRadius: 8, background: '#4caf7d', border: 'none',
                      color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}>
                    {validating === u.id ? '…' : '✓ Valider'}
                  </button>
                  <button
                    onClick={() => handleReject(u.id)}
                    disabled={validating === u.id}
                    style={{
                      padding: '7px 16px', borderRadius: 8, background: '#ffebee', border: 'none',
                      color: '#c0392b', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}>
                    {validating === u.id ? '…' : '✕ Refuser'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Notification CEO : commandes CC en attente validation ── */}
      {user?.role === 'ceo' && pendingCCOrders.length > 0 && (
        <div style={{
          marginBottom: 24, padding: '14px 18px', borderRadius: 12,
          background: '#fff3e0', border: '1.5px solid #ff9800',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🚀</span>
            <div>
              <div style={{ fontWeight: 700, color: '#e65100', fontSize: 15 }}>
                  {pendingCCOrders.length} vente{pendingCCOrders.length > 1 ? 's' : ''} confirmée{pendingCCOrders.length > 1 ? 's' : ''} par CC Grossiste — en attente de votre validation
                </div>
                <div style={{ fontSize: 12, color: '#bf360c', marginTop: 2 }}>
                  Ces ventes ont été initiées par un CC Revendeur, puis confirmées par un CC Grossiste. Votre validation finale est requise.
              </div>
            </div>
          </div>
          <button onClick={() => setShowCCOrders(v => !v)} style={{
            padding: '7px 16px', borderRadius: 8, background: '#ff9800', border: 'none',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#fff',
          }}>
            {showCCOrders ? 'Masquer ▲' : 'Voir les ventes ▼'}
          </button>
        </div>
      )}

      {/* ── Panel validation commandes CC ── */}
      {user?.role === 'ceo' && showCCOrders && (
        <div style={{
          marginBottom: 24, background: '#fff', borderRadius: 12, padding: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1e3a2f' }}>
            📋 Ventes CC en attente de validation
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingCCOrders.map(o => {
              const p = o.produit || {};
              return (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: '#f8f9fa', borderRadius: 10,
                  border: '1px solid #e9ecef', flexWrap: 'wrap', gap: 8,
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a2f' }}>
                      {p.type} — {p.variete}
                    </div>
                    <div style={{ fontSize: 12, color: '#636e72', marginTop: 2 }}>
                      Revendeur : <strong>{o.revendeur_email}</strong> · Qté : <strong>{p.quantite}</strong> · Prix : <strong>{Number(p.prix || 0).toLocaleString('fr')} FCFA/u</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
                      Grossiste : {p.grossiste_email} · Initié par : {p.initiated_by || '—'} · Le {(o.commande_at || o.created_at || '').slice(0, 10)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleValidateCCOrder(o.id)}
                      disabled={validatingOrder === o.id}
                      style={{ padding: '7px 16px', borderRadius: 8, background: '#4caf7d', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {validatingOrder === o.id ? '…' : '✓ Valider'}
                    </button>
                    <button
                      onClick={() => handleRejectCCOrder(o.id)}
                      disabled={validatingOrder === o.id}
                      style={{ padding: '7px 16px', borderRadius: 8, background: '#ffebee', border: 'none', color: '#c0392b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {validatingOrder === o.id ? '…' : '✕ Refuser'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Historique des prix (CEO) ── */}
      {user?.role === 'ceo' && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            padding: '12px 18px', borderRadius: 12,
            background: '#f3e5f5', border: '1.5px solid #ce93d8',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📈</span>
              <div>
                <div style={{ fontWeight: 700, color: '#6a1b9a', fontSize: 15 }}>
                  Historique des modifications de prix — Stock grossistes
                </div>
                <div style={{ fontSize: 12, color: '#7b1fa2', marginTop: 2 }}>
                  {prixHistory.length} modification{prixHistory.length > 1 ? 's' : ''} enregistrée{prixHistory.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <button onClick={() => setShowPrixHist(v => !v)} style={{
              padding: '7px 16px', borderRadius: 8, background: '#9c27b0', border: 'none',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#fff',
            }}>
              {showPrixHist ? 'Masquer ▲' : 'Voir l\'historique ▼'}
            </button>
          </div>

          {showPrixHist && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginTop: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1e3a2f' }}>📈 Historique des prix modifiés</h3>
              {prixHistory.length === 0
                ? <div style={{ color: '#bbb', textAlign: 'center', padding: 20, fontSize: 13 }}>Aucune modification de prix enregistrée.</div>
                : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
                        {['Date', 'Agent CC', 'Grossiste', 'Produit', 'Ancien prix', 'Nouveau prix', 'Variation'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#636e72', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prixHistory.map((r, i) => {
                        const diff = (r.nouveau_prix || 0) - (r.ancien_prix || 0);
                        const pct = r.ancien_prix ? ((diff / r.ancien_prix) * 100).toFixed(1) : null;
                        return (
                          <tr key={r.id || i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                            <td style={{ padding: '8px 12px', color: '#636e72' }}>{(r.changed_at || '').slice(0, 16).replace('T', ' ')}</td>
                            <td style={{ padding: '8px 12px' }}>{r.cc_email?.split('@')[0] || '—'}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>{r.grossiste_nom || '—'}</td>
                            <td style={{ padding: '8px 12px' }}>{r.produit_nom || '—'}</td>
                            <td style={{ padding: '8px 12px', color: '#636e72' }}>{r.ancien_prix != null ? `${Number(r.ancien_prix).toLocaleString('fr')} FCFA` : '—'}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1e3a2f' }}>{r.nouveau_prix != null ? `${Number(r.nouveau_prix).toLocaleString('fr')} FCFA` : '—'}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: diff > 0 ? '#e53935' : diff < 0 ? '#43a047' : '#aaa' }}>
                              {pct ? `${diff > 0 ? '+' : ''}${pct}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              }
            </div>
          )}
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatsCard label="Commandes grossiste" value={totals.totalOrders} color="#4caf7d" sub={`${statsPending.pendingOrders} en attente`} />
        <StatsCard label="Commandes revendeur" value={totals.totalRevOrders} color="#2196f3" sub={`${statsPending.pendingRevOrders} en attente`} />
        <StatsCard label="Ventes disponibles" value={statsPending.ventesDispos} color="#ff9800" sub={`${totals.totalVentes} total`} />
        <StatsCard label="Produits listés" value={totals.totalProducts} color="#9c27b0" />
        <StatsCard label="Chiffre d'affaires" value={fmt(chiffreAffaires.total)} color="#e91e63" sub="cmds grossiste + revendeur" />
      </div>

      {/* Statuts */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div style={{ flex: 1, minWidth: 260, background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h3 style={{ marginBottom: 14, fontSize: 15 }}>Commandes grossiste par statut</h3>
          {ordersByStatus.map(s => (
            <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f3f5' }}>
              <StatusBadge status={s.status} />
              <strong>{s.count}</strong>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 260, background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h3 style={{ marginBottom: 14, fontSize: 15 }}>CA détaillé</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f3f5' }}>
            <span style={{ color: '#636e72' }}>Grossiste</span><strong>{fmt(chiffreAffaires.orders)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span style={{ color: '#636e72' }}>Revendeur</span><strong>{fmt(chiffreAffaires.revendeurOrders)}</strong>
          </div>
        </div>
      </div>

      {/* Dernières commandes grossiste */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Dernières commandes grossiste</h2>
          <Link to="/commandes-grossiste" style={{ color: '#4caf7d', fontSize: 13 }}>Voir tout →</Link>
        </div>
        <DataTable columns={colsOrders} rows={recentOrders} emptyMessage="Aucune commande" />
      </div>

      {/* Dernières commandes revendeur */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Dernières commandes revendeur</h2>
          <Link to="/commandes-revendeur" style={{ color: '#2196f3', fontSize: 13 }}>Voir tout →</Link>
        </div>
        <DataTable
          columns={[
            { key: 'id', label: 'ID', render: r => r.id.slice(-6) },
            { key: 'revendeur_email', label: 'Revendeur' },
            { key: 'produit', label: 'Produit', render: r => `${r.produit?.type}` },
            { key: 'produit', label: 'Prix', render: r => fmt(r.produit?.prix || 0) },
            { key: 'commande_at', label: 'Date', render: r => r.commande_at?.slice(0, 10) },
            { key: 'status', label: 'Statut', render: r => <StatusBadge status={r.status} /> },
          ]}
          rows={recentRevOrders}
          emptyMessage="Aucune commande"
        />
      </div>

      {/* ── Planning mensuel (CEO) ── */}
      {user?.role === 'ceo' && (
        <div style={{ marginTop: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#1e3a2f' }}>Planning mensuel</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => { const [y,m] = planMois.split('-').map(Number); const d = new Date(y, m-2, 1); setPlanMois(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#1e3a2f', color: '#fff', fontSize: 13, cursor: 'pointer' }}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e3a2f', minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>
                {new Date(planMois + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => { const [y,m] = planMois.split('-').map(Number); const d = new Date(y, m, 1); setPlanMois(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`); }} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#1e3a2f', color: '#fff', fontSize: 13, cursor: 'pointer' }}>›</button>
              <button onClick={() => { setPlanEditItem(null); setPlanForm({ titre: '', description: '', statut: 'a_faire', priorite: 'normale' }); setPlanFormOpen(true); }} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: '#1e3a2f', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>+ Ajouter</button>
            </div>
          </div>

          {planFormOpen && (
            <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)', border: '1.5px solid #1e3a2f22', marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#1e3a2f' }}>
                {planEditItem ? '✏️ Modifier la tâche' : '➕ Nouvelle tâche'}
              </h3>
              <form onSubmit={async (e) => {
                e.preventDefault(); setPlanSaving(true);
                try {
                  if (planEditItem) { await api.updatePlanning(planEditItem.id, planForm); }
                  else { await api.createPlanning({ ...planForm, mois: planMois, created_by: user?.username || user?.email }); }
                  setPlanFormOpen(false); setPlanEditItem(null); loadPlan();
                } finally { setPlanSaving(false); }
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 4 }}>Titre *</label>
                    <input style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #dee2e6', fontSize: 13, boxSizing: 'border-box' }} value={planForm.titre} onChange={e => setPlanForm(f => ({ ...f, titre: e.target.value }))} required placeholder="Ex : Révision budgétaire, Réunion équipe…" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 4 }}>Statut</label>
                    <select style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #dee2e6', fontSize: 13 }} value={planForm.statut} onChange={e => setPlanForm(f => ({ ...f, statut: e.target.value }))}>
                      {STATUTS_PLANNING.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 4 }}>Priorité</label>
                    <select style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #dee2e6', fontSize: 13 }} value={planForm.priorite} onChange={e => setPlanForm(f => ({ ...f, priorite: e.target.value }))}>
                      {PRIORITES_PLAN.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 4 }}>Description</label>
                    <textarea style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #dee2e6', fontSize: 13, minHeight: 60, resize: 'vertical', boxSizing: 'border-box' }} value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} placeholder="Détails, remarques…" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" disabled={planSaving} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1e3a2f', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{planSaving ? '…' : planEditItem ? 'Enregistrer' : 'Ajouter'}</button>
                  <button type="button" onClick={() => { setPlanFormOpen(false); setPlanEditItem(null); }} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#f1f3f5', color: '#495057', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                </div>
              </form>
            </div>
          )}

          {planItems === null ? (
            <div style={{ color: '#636e72', fontSize: 13 }}>Chargement…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {STATUTS_PLANNING.map(s => {
                const grp = planItems.filter(i => i.statut === s.value);
                return (
                  <div key={s.value} style={{ background: '#f8f9fa', borderRadius: 10, padding: 14, minHeight: 100 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</span>
                      <span style={{ fontSize: 12, background: s.color + '22', color: s.color, borderRadius: 12, padding: '1px 8px', fontWeight: 700 }}>{grp.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {grp.length === 0 && <div style={{ fontSize: 12, color: '#adb5bd', textAlign: 'center', padding: '8px 0' }}>Aucune tâche</div>}
                      {grp.map(item => {
                        const prio = PRIORITES_PLAN.find(p => p.value === item.priorite) || PRIORITES_PLAN[1];
                        return (
                          <div key={item.id} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: `1.5px solid ${s.color}33` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a2f', flex: 1 }}>{item.titre}</div>
                              <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{prio.label}</span>
                            </div>
                            {item.description && <div style={{ fontSize: 12, color: '#636e72', marginTop: 5, lineHeight: 1.4 }}>{item.description}</div>}
                            <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 5 }}>Par {item.created_by || '—'} · {(item.updated_at || item.created_at || '').slice(0, 10)}</div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                              {STATUTS_PLANNING.filter(st => st.value !== item.statut).map(st => (
                                <button key={st.value} onClick={async () => { await api.updatePlanning(item.id, { statut: st.value }); loadPlan(); }} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, border: `1px solid ${st.color}`, background: st.color + '15', color: st.color, cursor: 'pointer', fontWeight: 600 }}>→ {st.label}</button>
                              ))}
                              <button onClick={() => { setPlanEditItem(item); setPlanForm({ titre: item.titre, description: item.description || '', statut: item.statut, priorite: item.priorite }); setPlanFormOpen(true); }} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, border: '1px solid #6c757d', background: '#f8f9fa', color: '#6c757d', cursor: 'pointer' }}>✏️</button>
                              <button onClick={async () => { if (!window.confirm('Supprimer cette tâche ?')) return; await api.deletePlanning(item.id); loadPlan(); }} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, border: '1px solid #f44336', background: '#fff5f5', color: '#f44336', cursor: 'pointer' }}>🗑</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
