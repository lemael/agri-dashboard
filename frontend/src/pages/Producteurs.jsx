import React, { useEffect, useState } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';

export default function Producteurs() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('');

  const load = (s = '') => {
    const q = s ? `?status=${encodeURIComponent(s)}` : '';
    api.producteurs(q).then(setRows);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce producteur ?')) return;
    await api.deleteProducteur(id);
    load(filter);
  };

  const columns = [
    { key: 'id', label: 'ID', render: r => r.id },
    { key: 'nom', label: 'Nom', render: r => `${r.prenom} ${r.nom}` },
    { key: 'email', label: 'Email' },
    { key: 'telephone', label: 'Téléphone' },
    { key: 'nom_entreprise', label: 'Entreprise' },
    { key: 'nom_exploitation', label: 'Exploitation' },
    { key: 'localisation', label: 'Localisation' },
    { key: 'status', label: 'Statut', render: r => (
      <span style={{
        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
        background: r.status === 'actif' ? '#d1e7dd' : '#f8d7da',
        color: r.status === 'actif' ? '#0a5336' : '#721c24',
      }}>{r.status}</span>
    )},
    { key: 'created_at', label: 'Inscription', render: r => r.created_at?.slice(0, 10) },
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Producteurs</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'actif', 'inactif'].map(s => (
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
      <DataTable columns={columns} rows={rows} emptyMessage="Aucun producteur — importez d'abord le fichier users.json" />
    </div>
  );
}
