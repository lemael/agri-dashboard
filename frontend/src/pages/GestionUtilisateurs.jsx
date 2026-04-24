import React, { useEffect, useState } from 'react';
import { api } from '../api';

const ROLES = [
  { value: 'ceo',         label: 'CEO' },
  { value: 'comptable',   label: 'Comptable' },
  { value: 'call_center', label: 'Call Center' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'rh',          label: 'Ressources Humaines' },
];

const ROLE_COLORS = {
  ceo:         { bg: '#1e3a2f22', color: '#1e3a2f' },
  comptable:   { bg: '#2196f322', color: '#1565c0' },
  call_center: { bg: '#ff980022', color: '#e65100' },
  marketing:   { bg: '#9c27b022', color: '#6a1b9a' },
  rh:          { bg: '#4caf7d22', color: '#2e7d32' },
};

const empty = { email: '', nom: '', prenom: '', role: '', cc_groupe: '', password: '' };

export default function GestionUtilisateurs() {
  const [users, setUsers] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = () => api.dashboardUsers().then(setUsers);
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.createDashboardUser(form);
      if (!res.ok) { setError(res.error); return; }
      setForm(empty);
      setFormOpen(false);
      load();
    } catch {
      setError('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm(`Supprimer l'utilisateur ${email} ?`)) return;
    await api.deleteDashboardUser(id);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Gestion des utilisateurs</h1>
        <button
          onClick={() => setFormOpen(o => !o)}
          style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1e3a2f', color: '#fff', fontSize: 13, fontWeight: 600 }}
        >
          {formOpen ? '✕ Annuler' : '+ Nouvel utilisateur'}
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleAdd} style={{
          background: '#fff', borderRadius: 10, padding: 24,
          boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Créer un compte</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="nom@facilitar.cm" />
            </div>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input type="text" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Rôle *</label>
              <select required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, cc_groupe: '' }))} style={inputStyle}>
                <option value="">— Choisir —</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {form.role === 'call_center' && (
              <div>
                <label style={labelStyle}>Groupe Call Center *</label>
                <select required value={form.cc_groupe} onChange={e => setForm(f => ({ ...f, cc_groupe: e.target.value }))} style={inputStyle}>
                  <option value="">— Choisir —</option>
                  <option value="1">Groupe 1 — Producteur → Grossiste</option>
                  <option value="2">Groupe 2 — Grossiste → Revendeur</option>
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle}>Mot de passe *</label>
              <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} placeholder="••••••••" />
            </div>
          </div>
          {error && <div style={{ marginTop: 12, color: '#721c24', fontSize: 13 }}>{error}</div>}
          <button
            type="submit"
            disabled={saving}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#4caf7d', color: '#fff', fontWeight: 600, fontSize: 14 }}
          >
            {saving ? 'Création…' : 'Créer'}
          </button>
        </form>
      )}

      {!users ? (
        <div style={{ color: '#636e72' }}>Chargement…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Nom', 'Email', 'Rôle', 'Groupe CC', 'Créé le', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #dee2e6', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const rc = ROLE_COLORS[u.role] || { bg: '#e9ecef', color: '#495057' };
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f3f5' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={tdStyle}><strong>{u.prenom} {u.nom}</strong></td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: rc.bg, color: rc.color }}>
                        {ROLES.find(r => r.value === u.role)?.label || u.role}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {u.role === 'call_center' && u.cc_groupe
                        ? `Groupe ${u.cc_groupe} — ${u.cc_groupe == 1 ? 'Prod→Gros' : 'Gros→Rev'}`
                        : '—'}
                    </td>
                    <td style={tdStyle}>{u.created_at?.slice(0, 10)}</td>
                    <td style={tdStyle}>
                      <button onClick={() => handleDelete(u.id, u.email)} style={{ padding: '3px 8px', borderRadius: 6, background: '#f8d7da', border: 'none', color: '#721c24', fontSize: 12 }}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #dee2e6', fontSize: 13, boxSizing: 'border-box' };
const tdStyle = { padding: '12px 16px', fontSize: 13 };
