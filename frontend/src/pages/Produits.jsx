import React, { useEffect, useState } from 'react';
import { api } from '../api';
import DataTable, { StatusBadge } from '../components/DataTable';

export default function Produits() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('');

  const load = (s = '') => {
    const q = s ? `?status=${encodeURIComponent(s)}` : '';
    api.products(q).then(setRows);
  };

  useEffect(() => { load(); }, []);

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    await api.deleteProduct(id);
    load(filter);
  };

  const columns = [
    { key: 'id', label: 'ID', render: r => r.id.slice(-8) },
    { key: 'type', label: 'Type' },
    { key: 'variete', label: 'Variété' },
    { key: 'quantite', label: 'Quantité' },
    { key: 'prix', label: 'Prix/unité', render: r => fmt(r.prix || 0) },
    { key: 'etat', label: 'État' },
    { key: 'producer_email', label: 'Producteur' },
    { key: 'nom_entreprise', label: 'Entreprise' },
    { key: 'lieu', label: 'Lieu' },
    { key: 'created_at', label: 'Date', render: r => r.created_at?.slice(0, 10) },
    { key: 'status', label: 'Statut', render: r => <StatusBadge status={r.sold_out ? 'sold out' : r.status} /> },
    {
      key: 'actions', label: 'Action',
      render: r => (
        <button
          onClick={() => handleDelete(r.id)}
          style={{ padding: '3px 8px', borderRadius: 6, background: '#f8d7da', border: 'none', color: '#721c24', fontSize: 12 }}
        >
          Supprimer
        </button>
      ),
    },
  ];

  const statuts = ['actif', 'sold out', 'supprimé'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Produits</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', ...statuts].map(s => (
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
      <DataTable columns={columns} rows={rows} emptyMessage="Aucun produit" />
    </div>
  );
}
