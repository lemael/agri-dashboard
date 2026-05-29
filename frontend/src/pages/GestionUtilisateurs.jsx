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

const empty = { username: '', email: '', nom: '', prenom: '', role: '', cc_groupe: '', password: '' };
const emptyEdit = { cc_groupe: '', secteur_principal: '', telephone: '' };

const SECTEURS = [
  'Alimentaire',
  'Cosmétique',
  'Vêtements',
  'Appareils électroniques',
  'Accessoires maison',
];

export default function GestionUtilisateurs() {
  const [users, setUsers] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editUser, setEditUser] = useState(null);   // user being edited
  const [editForm, setEditForm] = useState(emptyEdit);
  const [editSaving, setEditSaving] = useState(false);

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

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      cc_groupe: u.cc_groupe != null ? String(u.cc_groupe) : '',
      secteur_principal: u.secteur_principal || '',
      telephone: u.telephone || '',
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    await api.updateDashboardUser(editUser.id, {
      role: editUser.role,
      cc_groupe: editForm.cc_groupe || null,
      secteur_principal: editForm.secteur_principal || null,
      telephone: editForm.telephone || null,
    });
    setEditUser(null);
    setEditSaving(false);
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
              <label style={labelStyle}>Pseudonyme *</label>
              <input type="text" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={inputStyle} placeholder="pseudonyme" autoComplete="off" />
            </div>
            <div>
              <label style={labelStyle}>Email (optionnel)</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} placeholder="nom@facilitar.cm" />
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
        <>
        {/* ── Modal édition ── */}
        {editUser && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}>
            <form onSubmit={handleEdit} style={{
              background: '#fff', borderRadius: 14, padding: 28, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e3a2f' }}>
                  ✏️ Modifier — {editUser.prenom} {editUser.nom}
                </h3>
                <button type="button" onClick={() => setEditUser(null)}
                  style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#aaa' }}>✕</button>
              </div>

              {editUser.role === 'call_center' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Groupe (Grossiste ou Revendeur)</label>
                  <select value={editForm.cc_groupe} onChange={e => setEditForm(f => ({ ...f, cc_groupe: e.target.value }))} style={inputStyle}>
                    <option value="">— Non assigné —</option>
                    <option value="1">📦 Groupe 1 — Grossiste</option>
                    <option value="2">🛒 Groupe 2 — Revendeur</option>
                  </select>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Numéro de téléphone</label>
                <input
                  type="tel"
                  value={editForm.telephone}
                  onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))}
                  style={inputStyle}
                  placeholder="ex: +237 6XX XXX XXX"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Secteur commercial</label>
                <select
                  value={editForm.secteur_principal}
                  onChange={e => setEditForm(f => ({ ...f, secteur_principal: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">— Choisir un secteur —</option>
                  {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setEditUser(null)}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #dee2e6', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                  Annuler
                </button>
                <button type="submit" disabled={editSaving}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1e3a2f', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  {editSaving ? 'Enregistrement…' : '💾 Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Nom', 'Pseudonyme', 'Rôle', 'Téléphone', 'Ville', 'Géolocalisation', 'Secteur commercial', 'Nb clients', 'Statut', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #dee2e6', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const rc = ROLE_COLORS[u.role] || { bg: '#e9ecef', color: '#495057' };
                const statusColor = u.status === 'active'
                  ? { bg: '#d1e7dd', color: '#0a5336' }
                  : u.status === 'pending'
                  ? { bg: '#fff8e1', color: '#856404' }
                  : { bg: '#f8d7da', color: '#721c24' };
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f3f5' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.prenom} {u.nom}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                        <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: rc.bg, color: rc.color }}>
                          {ROLES.find(r => r.value === u.role)?.label || u.role}
                          {u.role === 'call_center' && String(u.cc_groupe) === '1' ? ' — Grossiste' : ''}
                          {u.role === 'call_center' && String(u.cc_groupe) === '2' ? ' — Revendeur' : ''}
                        </span>
                      </div>
                    </td>
                    <td style={tdStyle}><code style={{ fontSize: 13, background: '#f1f3f5', padding: '2px 6px', borderRadius: 4 }}>{u.username || '—'}</code></td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: rc.bg, color: rc.color }}>
                        {ROLES.find(r => r.value === u.role)?.label || u.role}
                        {u.role === 'call_center' && String(u.cc_groupe) === '1' ? ' — Grossiste' : ''}
                        {u.role === 'call_center' && String(u.cc_groupe) === '2' ? ' — Revendeur' : ''}
                      </span>
                    </td>
                    <td style={tdStyle}>{u.telephone || '—'}</td>
                    <td style={tdStyle}>{u.ville || '—'}</td>
                    <td style={tdStyle}>
                      {u.geolocation
                        ? <a href={`https://maps.google.com/?q=${encodeURIComponent(u.geolocation)}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1565c0' }}>
                            📍 {u.geolocation}
                          </a>
                        : '—'}
                    </td>
                    <td style={tdStyle}>{u.secteur_principal || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {u.role === 'call_center'
                        ? <span style={{ fontWeight: 700, color: u.nb_clients > 0 ? '#1e3a2f' : '#aaa' }}>{u.nb_clients ?? 0}</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: statusColor.bg, color: statusColor.color }}>
                        {u.status === 'active' ? 'Actif' : u.status === 'pending' ? 'En attente' : 'Refusé'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{ padding: '3px 8px', borderRadius: 6, background: '#e8f4fd', border: 'none', color: '#1565c0', fontSize: 12, cursor: 'pointer' }}>
                        ✏️ Modifier
                      </button>
                      <button onClick={() => handleDelete(u.id, u.username || u.email)} style={{ padding: '3px 8px', borderRadius: 6, background: '#f8d7da', border: 'none', color: '#721c24', fontSize: 12, cursor: 'pointer' }}>
                        Supprimer
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #dee2e6', fontSize: 13, boxSizing: 'border-box' };
const tdStyle = { padding: '12px 16px', fontSize: 13 };
