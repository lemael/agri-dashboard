import React, { useEffect, useState } from 'react';
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
    </div>
  );
}
