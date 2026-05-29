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

  useEffect(() => {
    api.stats().then(setStats).catch(() => setError('Impossible de contacter le serveur.'));
  }, []);

  useEffect(() => {
    if (user?.role === 'ceo') {
      api.pendingUsers().then(setPending).catch(() => {});
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

      {/* ── Panel validation ── */}
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
