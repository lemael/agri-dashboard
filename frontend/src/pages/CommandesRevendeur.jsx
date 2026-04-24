import React, { useEffect, useState } from 'react';
import { api } from '../api';
import DataTable, { StatusBadge } from '../components/DataTable';

const STATUTS = ['en attente', 'confirmée', 'livré', 'annulée'];

export default function CommandesRevendeur() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('');

  const load = (s = '') => {
    const q = s ? `?status=${encodeURIComponent(s)}` : '';
    api.revendeurOrders(q).then(setRows);
  };

  useEffect(() => { load(); }, []);

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  const columns = [
    { key: 'id', label: 'ID', render: r => r.id.slice(-8) },
    { key: 'revendeur_email', label: 'Revendeur' },
    { key: 'produit', label: 'Produit', render: r => `${r.produit?.type}` },
    { key: 'produit', label: 'Variété', render: r => r.produit?.variete },
    { key: 'produit', label: 'Qté', render: r => r.produit?.quantite },
    { key: 'produit', label: 'Prix', render: r => fmt(r.produit?.prix || 0) },
    { key: 'produit', label: 'Grossiste', render: r => r.produit?.grossisteEmail },
    { key: 'commande_at', label: 'Date', render: r => r.commande_at?.slice(0, 10) },
    { key: 'status', label: 'Statut', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: 'Action',
      render: r => (
        <select
          value={r.status}
          onChange={async e => { await api.updateRevOrderStatus(r.id, e.target.value); load(filter); }}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 12 }}
        >
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Commandes Revendeur</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', ...STATUTS].map(s => (
            <button
              key={s}
              onClick={() => { setFilter(s); load(s); }}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid #dee2e6',
                background: filter === s ? '#1e3a2f' : '#fff',
                color: filter === s ? '#fff' : '#495057',
                fontSize: 12, fontWeight: 500,
              }}
            >
              {s || 'Tous'}
            </button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} rows={rows} emptyMessage="Aucune commande revendeur" />
    </div>
  );
}
