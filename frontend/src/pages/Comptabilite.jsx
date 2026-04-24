import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';

const CATEGORIES = [
  { value: 'frais_telephone', label: '📞 Frais téléphoniques', color: '#2196f3' },
  { value: 'frais_taxi',      label: '🚕 Frais de taxi',        color: '#ff9800' },
  { value: 'frais_assesoir',  label: '🪑 Frais assesoir',       color: '#9c27b0' },
  { value: 'frais_promo',     label: '🎁 Frais de promo',       color: '#e91e63' },
];

const NIVEAUX = ['producteur', 'grossiste', 'revendeur'];

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';
const getCatLabel = (v) => CATEGORIES.find(c => c.value === v)?.label || v;
const getCatColor = (v) => CATEGORIES.find(c => c.value === v)?.color || '#636e72';

const empty = { categorie: '', montant: '', description: '', beneficiaire: '', niveau: '', date: new Date().toISOString().slice(0, 10) };

export default function Comptabilite() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState(null);
  const [filterCat, setFilterCat] = useState('');
  const [form, setForm] = useState(empty);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadAll = () => {
    api.depensesSummary().then(setSummary);
    const q = filterCat ? `?categorie=${filterCat}` : '';
    api.depenses(q).then(setRows);
  };

  useEffect(() => { loadAll(); }, [filterCat]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.categorie || !form.montant || !form.date) return;
    setSaving(true);
    setError(null);
    try {
      await api.createDepense({ ...form, created_by: user?.email });
      setForm(empty);
      setFormOpen(false);
      loadAll();
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette dépense ?')) return;
    await api.deleteDepense(id);
    loadAll();
  };

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Comptabilité</h1>

      {/* KPI */}
      {summary && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          <StatsCard label="Gains (commandes)" value={fmt(summary.gains)} color="#4caf7d" sub="grossiste + revendeur" />
          <StatsCard label="Total dépenses" value={fmt(summary.totalDepenses)} color="#e53935" />
          <StatsCard
            label="Résultat net"
            value={fmt(summary.resultat)}
            color={summary.resultat >= 0 ? '#4caf7d' : '#e53935'}
            sub={summary.resultat >= 0 ? 'Bénéfice' : 'Déficit'}
          />
        </div>
      )}

      {/* Breakdown par catégorie */}
      {summary && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
          {CATEGORIES.map(cat => {
            const found = summary.totaux.find(t => t.categorie === cat.value);
            const total = found?.total || 0;
            const count = found?.count || 0;
            return (
              <div key={cat.value} style={{
                flex: 1, minWidth: 200, background: '#fff', borderRadius: 10, padding: '16px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,.08)', borderLeft: `4px solid ${cat.color}`,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{cat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: cat.color }}>{fmt(total)}</div>
                <div style={{ fontSize: 12, color: '#b2bec3', marginTop: 2 }}>{count} entrée(s)</div>
                {cat.value === 'frais_promo' && summary.promosParNiveau?.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: '1px solid #f1f3f5', paddingTop: 8 }}>
                    {summary.promosParNiveau.map(p => (
                      <div key={p.niveau} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                        <span style={{ color: '#636e72', textTransform: 'capitalize' }}>↳ {p.niveau}</span>
                        <strong>{fmt(p.total)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['', ...CATEGORIES.map(c => c.value)].map(v => (
            <button
              key={v}
              onClick={() => setFilterCat(v)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid #dee2e6', fontSize: 12, fontWeight: 500,
                background: filterCat === v ? '#1e3a2f' : '#fff',
                color: filterCat === v ? '#fff' : '#495057',
              }}
            >
              {v ? getCatLabel(v) : 'Toutes'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFormOpen(o => !o)}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: '#1e3a2f', color: '#fff', fontSize: 13, fontWeight: 600,
          }}
        >
          {formOpen ? '✕ Annuler' : '+ Ajouter une dépense'}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {formOpen && (
        <form onSubmit={handleAdd} style={{
          background: '#fff', borderRadius: 10, padding: 24,
          boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nouvelle dépense</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={labelStyle}>Catégorie *</label>
              <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value, niveau: '' }))} required style={inputStyle}>
                <option value="">— Choisir —</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Montant (FCFA) *</label>
              <input type="number" min="0" step="1" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} required style={inputStyle} placeholder="ex: 5000" />
            </div>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Bénéficiaire</label>
              <input type="text" value={form.beneficiaire} onChange={e => setForm(f => ({ ...f, beneficiaire: e.target.value }))} style={inputStyle} placeholder="Nom / email" />
            </div>
            {form.categorie === 'frais_promo' && (
              <div>
                <label style={labelStyle}>Niveau</label>
                <select value={form.niveau} onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))} style={inputStyle}>
                  <option value="">— Choisir —</option>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                </select>
              </div>
            )}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="Détails optionnels" />
            </div>
          </div>
          {error && <div style={{ marginTop: 12, color: '#721c24', fontSize: 13 }}>{error}</div>}
          <button
            type="submit"
            disabled={saving}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, border: 'none', background: '#4caf7d', color: '#fff', fontWeight: 600, fontSize: 14 }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}

      {/* Tableau */}
      {!rows ? (
        <div style={{ color: '#636e72' }}>Chargement…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: '#636e72', padding: 20 }}>Aucune dépense enregistrée.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Date', 'Catégorie', 'Montant', 'Bénéficiaire', 'Niveau', 'Description', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #dee2e6', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f5' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={tdStyle}>{r.date}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: getCatColor(r.categorie) + '22', color: getCatColor(r.categorie) }}>
                      {getCatLabel(r.categorie)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(r.montant)}</td>
                  <td style={tdStyle}>{r.beneficiaire || '—'}</td>
                  <td style={tdStyle}>{r.niveau ? r.niveau.charAt(0).toUpperCase() + r.niveau.slice(1) : '—'}</td>
                  <td style={tdStyle}>{r.description || '—'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleDelete(r.id)} style={{ padding: '3px 8px', borderRadius: 6, background: '#f8d7da', border: 'none', color: '#721c24', fontSize: 12 }}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
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
