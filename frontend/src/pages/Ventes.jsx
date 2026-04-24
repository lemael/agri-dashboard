import React, { useEffect, useState } from 'react';
import { api } from '../api';
import DataTable, { StatusBadge } from '../components/DataTable';

const STATUTS = ['disponible', 'vendu'];

export default function Ventes() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('');

  const load = (s = '') => {
    const q = s ? `?status=${encodeURIComponent(s)}` : '';
    api.ventes(q).then(setRows);
  };

  useEffect(() => { load(); }, []);

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette vente ?')) return;
    await api.deleteVente(id);
    load(filter);
  };

  const columns = [
    { key: 'id', label: 'ID', render: r => r.id.slice(-8) },
    { key: 'type', label: 'Type' },
    { key: 'variete', label: 'Variété' },
    { key: 'quantite', label: 'Quantité' },
    { key: 'prix', label: 'Prix', render: r => fmt(r.prix || 0) },
    { key: 'etat', label: 'État' },
    { key: 'grossiste_email', label: 'Grossiste' },
    { key: 'nom_entreprise', label: 'Entreprise' },
    { key: 'lieu', label: 'Lieu' },
    { key: 'created_at', label: 'Date', render: r => r.created_at?.slice(0, 10) },
    { key: 'status', label: 'Statut', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: 'Actions',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          <select
            value={r.status}
            onChange={async e => { await api.updateVenteStatus(r.id, e.target.value); load(filter); }}
            style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 12 }}
          >
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => handleDelete(r.id)}
            style={{ padding: '3px 8px', borderRadius: 6, background: '#f8d7da', border: 'none', color: '#721c24', fontSize: 12 }}
          >
            ✕
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Ventes</h1>
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
              {s || 'Toutes'}
            </button>
          ))}
        </div>
      </div>
      <DataTable columns={columns} rows={rows} emptyMessage="Aucune vente" />
    </div>
  );
}
