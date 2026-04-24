import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatsCard from '../components/StatsCard';
import DataTable, { StatusBadge } from '../components/DataTable';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.stats().then(setStats).catch(() => setError('Impossible de contacter le serveur.'));
  }, []);

  if (error) return (
    <div style={{ padding: 20, background: '#f8d7da', borderRadius: 8, color: '#721c24' }}>
      {error} Vérifiez que le backend tourne sur <strong>http://localhost:3001</strong>.
    </div>
  );

  if (!stats) return <div style={{ color: '#636e72' }}>Chargement…</div>;

  const { totals, pending, chiffreAffaires, recentOrders, recentRevOrders, ordersByStatus } = stats;

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

      {/* KPI */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatsCard label="Commandes grossiste" value={totals.totalOrders} color="#4caf7d" sub={`${pending.pendingOrders} en attente`} />
        <StatsCard label="Commandes revendeur" value={totals.totalRevOrders} color="#2196f3" sub={`${pending.pendingRevOrders} en attente`} />
        <StatsCard label="Ventes disponibles" value={pending.ventesDispos} color="#ff9800" sub={`${totals.totalVentes} total`} />
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
