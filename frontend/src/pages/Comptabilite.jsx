import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEP_CATEGORIES = [
  { value: 'frais_telephone', label: '📞 Fr. téléphoniques', color: '#2196f3' },
  { value: 'frais_taxi',      label: '🚕 Fr. de taxi',       color: '#ff9800' },
  { value: 'frais_assesoir',  label: '🪑 Fr. assesoir',      color: '#9c27b0' },
  { value: 'frais_promo',     label: '🎁 Fr. de promo',      color: '#e91e63' },
  // Catégories CC agents
  { value: 'transport',       label: '🚗 Transport CC',      color: '#00897b' },
  { value: 'communication',   label: '📱 Communication CC',  color: '#039be5' },
  { value: 'imprevu',         label: '⚠️ Imprévu CC',        color: '#f4511e' },
];
const NIVEAUX = ['producteur', 'grossiste', 'revendeur'];

const STATUTS_PAIEMENT = [
  { value: 'en_attente', label: 'En attente', color: '#ff9800' },
  { value: 'partiel',    label: 'Partiel',    color: '#2196f3' },
  { value: 'payé',       label: 'Payé',       color: '#4caf50' },
  { value: 'retard',     label: 'En retard',  color: '#f44336' },
  { value: 'crédit',     label: 'Crédit',     color: '#9c27b0' },
];
const STATUTS_COMMISSION = [
  { value: 'en_attente', label: 'En attente', color: '#ff9800' },
  { value: 'validé',     label: 'Validé',     color: '#2196f3' },
  { value: 'payé',       label: 'Payé',       color: '#4caf50' },
];
const STATUTS_LIVRAISON = [
  { value: 'en_attente', label: 'En attente', color: '#ff9800' },
  { value: 'en_transit', label: 'En transit', color: '#2196f3' },
  { value: 'livré',      label: 'Livré',      color: '#4caf50' },
  { value: 'retourné',   label: 'Retourné',   color: '#f44336' },
];
const EMPTY_VENTE = {
  order_ref: '', date_vente: new Date().toISOString().slice(0, 10),
  grossiste: '', revendeur: '', agent_responsable: '', produit: '',
  quantite: '', prix_unitaire: '', reduction: '0', cout_unitaire: '0',
  statut_paiement: 'en_attente', statut_livraison: 'en_attente', notes: '',
};

const TABS = [
  { id: 'overview',    label: "📊 Vue d'ensemble" },
  { id: 'ventes',      label: '💰 Suivi des ventes' },
  { id: 'paiements',   label: '💳 Paiements' },
  { id: 'commissions', label: '👤 Commissions' },
  { id: 'produits',    label: '📈 Analyse produits' },
  { id: 'promotions',  label: '🎁 Promotions' },
  { id: 'depenses',    label: '📝 Dépenses' },
  { id: 'revendeurs',  label: '🛒 Revendeurs' },
  { id: 'grossistes',  label: '🏪 Grossistes' },
  { id: 'agents_cc',   label: '📞 Agents CC' },
  { id: 'tresorerie',  label: '🏦 Trésorerie' },
  { id: 'planning',    label: '📅 Planning' },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt         = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)) + ' FCFA';
const catLabel    = (v) => DEP_CATEGORIES.find(c => c.value === v)?.label || v;
const catColor    = (v) => DEP_CATEGORIES.find(c => c.value === v)?.color || '#636e72';
const statPaie    = (v) => STATUTS_PAIEMENT.find(s => s.value === v)   || { label: v || '—', color: '#636e72' };
const statComm    = (v) => STATUTS_COMMISSION.find(s => s.value === v) || { label: v || '—', color: '#636e72' };
const statLivr    = (v) => STATUTS_LIVRAISON.find(s => s.value === v)  || { label: v || '—', color: '#636e72' };

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #dee2e6', fontSize: 13, boxSizing: 'border-box' };
const tdStyle    = { padding: '11px 14px', fontSize: 13, verticalAlign: 'middle' };
const thStyle    = { padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#495057', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.08)' };
const cardStyle  = { background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)', marginBottom: 20 };
const btnPrimary = { padding: '8px 18px', borderRadius: 8, border: 'none', background: '#1e3a2f', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const badge      = (color) => ({ padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: color + '22', color, display: 'inline-block' });

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function FilterBar({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {[{ value: '', label: 'Tous' }, ...options].map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '5px 12px', borderRadius: 20, border: '1px solid #dee2e6', fontSize: 12,
          fontWeight: 500, cursor: 'pointer',
          background: value === o.value ? '#1e3a2f' : '#fff',
          color:      value === o.value ? '#fff'    : '#495057',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function TableBlock({ title, columns, rows, renderRow, emptyMsg = 'Aucune donnée.' }) {
  return (
    <div style={cardStyle}>
      {title && <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#1e3a2f' }}>{title}</h3>}
      {!rows || rows.length === 0
        ? <div style={{ color: '#636e72', fontSize: 13 }}>{emptyMsg}</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, boxShadow: 'none' }}>
              <thead><tr style={{ background: '#f8f9fa' }}>
                {columns.map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f3f5' }}>
                    {renderRow(r, i).map((cell, j) => <td key={j} style={tdStyle}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

function Spinner() {
  return <div style={{ color: '#636e72', padding: 20, fontSize: 13 }}>Chargement…</div>;
}

// ─── TAB 1 : VUE D'ENSEMBLE ───────────────────────────────────────────────────
function TabOverview() {
  const [data, setData] = useState(null);
  useEffect(() => { api.comptaOverview().then(setData).catch(console.error); }, []);
  if (!data) return <Spinner />;

  const STATUS_COLORS = {
    'livrée': '#4caf50', 'livré': '#4caf50', 'confirmé': '#4caf50',
    'en attente': '#ff9800', 'disponible': '#ff9800',
    'annulée': '#f44336', 'annulé': '#f44336',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatsCard label="CA total (commandes)" value={fmt(data.gains)}         color="#4caf7d" sub="grossiste + revendeur" />
        <StatsCard label="Total dépenses"       value={fmt(data.totalDepenses)} color="#e53935" />
        <StatsCard label="Résultat net"         value={fmt(data.resultat)}      color={data.resultat >= 0 ? '#4caf7d' : '#e53935'} sub={data.resultat >= 0 ? 'Bénéfice' : 'Déficit'} />
        <StatsCard label="Crédits ouverts"      value={fmt(data.creditOuvert)}  color="#ff9800" sub="montant à recouvrer" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { title: 'Commandes grossistes', rows: data.ordersByStatus,    showMontant: true },
          { title: 'Commandes revendeurs', rows: data.revOrdersByStatus, showMontant: true },
          { title: 'Ventes terrain',       rows: data.ventesByStatus,    showMontant: false },
        ].map(({ title, rows, showMontant }) => (
          <div key={title} style={{ ...cardStyle, marginBottom: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#1e3a2f' }}>{title}</div>
            {rows.map(r => (
              <div key={r.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f1f3f5' }}>
                <span style={badge(STATUS_COLORS[r.status] || '#636e72')}>{r.status}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{r.count}</div>
                  {showMontant && <div style={{ fontSize: 11, color: '#636e72' }}>{fmt(r.montant)}</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {data.recentPaiements?.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#1e3a2f' }}>Derniers paiements enregistrés</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...tableStyle, boxShadow: 'none' }}>
              <thead><tr style={{ background: '#f8f9fa' }}>
                {['Type', 'Email', 'Montant', 'Payé', 'Reste', 'Statut'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {data.recentPaiements.map(p => {
                  const s = statPaie(p.statut);
                  const reste = parseFloat(p.montant) - parseFloat(p.montant_paye || 0);
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                      <td style={tdStyle}><span style={badge('#2196f3')}>{p.type}</span></td>
                      <td style={tdStyle}>{p.email}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(p.montant)}</td>
                      <td style={{ ...tdStyle, color: '#4caf50', fontWeight: 600 }}>{fmt(p.montant_paye)}</td>
                      <td style={{ ...tdStyle, color: reste > 0 ? '#f44336' : '#4caf50', fontWeight: 600 }}>{fmt(reste)}</td>
                      <td style={tdStyle}><span style={badge(s.color)}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TAB 2 : SUIVI DES VENTES ─────────────────────────────────────────────────
// ─── TAB 2 : SUIVI DES VENTES ─────────────────────────────────────────────────
function TabSuiviVentes() {
  const { user } = useAuth();
  const [rows, setRows]             = useState(null);
  const [filterPaie, setFilterPaie] = useState('');
  const [filterLivr, setFilterLivr] = useState('');
  const [formOpen, setFormOpen]     = useState(false);
  const [editRow, setEditRow]       = useState(null);
  const [form, setForm]             = useState(EMPTY_VENTE);
  const [saving, setSaving]         = useState(false);
  const [importing, setImporting]   = useState(false);
  const [importMsg, setImportMsg]   = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filterPaie) params.set('statut_paiement',  filterPaie);
    if (filterLivr) params.set('statut_livraison', filterLivr);
    const q = params.toString() ? '?' + params.toString() : '';
    api.suiviVentes(q).then(setRows).catch(console.error);
  }, [filterPaie, filterLivr]);

  useEffect(load, [load]);

  const montant = (r) => parseFloat(r.prix_unitaire || 0) * parseFloat(r.quantite || 0) - parseFloat(r.reduction || 0);
  const marge   = (r) => (parseFloat(r.prix_unitaire || 0) - parseFloat(r.cout_unitaire || 0)) * parseFloat(r.quantite || 0) - parseFloat(r.reduction || 0);

  const totalCA    = rows?.reduce((s, r) => s + montant(r), 0) || 0;
  const totalMarge = rows?.reduce((s, r) => s + marge(r), 0) || 0;
  const nbLivres   = rows?.filter(r => r.statut_livraison === 'livré').length || 0;
  const nbAttenteP = rows?.filter(r => r.statut_paiement  === 'en_attente').length || 0;

  const openAdd  = () => { setEditRow(null);  setForm({ ...EMPTY_VENTE, date_vente: new Date().toISOString().slice(0,10) }); setFormOpen(true); };
  const openEdit = (r) => {
    setEditRow(r);
    setForm({ ...r, quantite: String(r.quantite || ''), prix_unitaire: String(r.prix_unitaire || ''), reduction: String(r.reduction || '0'), cout_unitaire: String(r.cout_unitaire || '0') });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editRow) { await api.updateSuiviVente(editRow.id, { ...form }); }
      else         { await api.createSuiviVente({ ...form, created_by: user?.email }); }
      setFormOpen(false); setEditRow(null); load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Retirer cette vente du suivi ?')) return;
    await api.deleteSuiviVente(id); load();
  };

  const handleImport = async () => {
    setImporting(true); setImportMsg('');
    try {
      const r = await api.importSuiviVentes();
      setImportMsg(r.imported === 0 ? 'Tout est déjà à jour.' : `${r.imported} vente(s) importée(s).`);
      load();
    } catch { setImportMsg('Erreur lors de l\'import.'); }
    setImporting(false);
  };

  const updateStatus = async (id, field, value) => {
    await api.updateSuiviVente(id, { [field]: value });
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const fVal = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const prevMontant = parseFloat(form.prix_unitaire || 0) * parseFloat(form.quantite || 0) - parseFloat(form.reduction || 0);
  const prevMarge   = (parseFloat(form.prix_unitaire || 0) - parseFloat(form.cout_unitaire || 0)) * parseFloat(form.quantite || 0) - parseFloat(form.reduction || 0);

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatsCard label="CA total suivi"      value={fmt(totalCA)}    color="#4caf7d" sub={`${rows?.length || 0} vente(s)`} />
        <StatsCard label="Marge estimée"       value={fmt(totalMarge)} color={totalMarge >= 0 ? '#2196f3' : '#e53935'} sub="prix − coût × qté" />
        <StatsCard label="Livrées"             value={nbLivres}        color="#4caf50" sub="statut livraison" />
        <StatsCard label="Paiements en attente" value={nbAttenteP}     color="#ff9800" sub="à recouvrer" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: '#636e72', marginBottom: 5, fontWeight: 600 }}>Statut paiement</div>
            <FilterBar options={STATUTS_PAIEMENT.map(s => ({ value: s.value, label: s.label }))} value={filterPaie} onChange={setFilterPaie} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#636e72', marginBottom: 5, fontWeight: 600 }}>Statut livraison</div>
            <FilterBar options={STATUTS_LIVRAISON.map(s => ({ value: s.value, label: s.label }))} value={filterLivr} onChange={setFilterLivr} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {importMsg && <span style={{ fontSize: 12, color: '#4caf50', fontWeight: 600 }}>{importMsg}</span>}
          <button onClick={handleImport} disabled={importing} style={{ ...btnPrimary, background: '#2196f3' }}>
            {importing ? '…' : '⬇️ Importer commandes CC'}
          </button>
          <button onClick={openAdd} style={btnPrimary}>+ Nouvelle vente</button>
        </div>
      </div>

      {/* Formulaire Add/Edit */}
      {formOpen && (
        <form onSubmit={handleSubmit} style={{ ...cardStyle, border: '2px solid #1e3a2f', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a2f', margin: 0 }}>{editRow ? '✏️ Modifier la vente' : '+ Nouvelle vente'}</h3>
            <button type="button" onClick={() => setFormOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#636e72', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
            <div><label style={labelStyle}>Date *</label>
              <input type="date" required value={form.date_vente} onChange={e => fVal('date_vente', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Grossiste</label>
              <input value={form.grossiste} onChange={e => fVal('grossiste', e.target.value)} style={inputStyle} placeholder="Email ou nom" /></div>
            <div><label style={labelStyle}>Revendeur</label>
              <input value={form.revendeur} onChange={e => fVal('revendeur', e.target.value)} style={inputStyle} placeholder="Email ou nom" /></div>
            <div><label style={labelStyle}>Agent responsable</label>
              <input value={form.agent_responsable} onChange={e => fVal('agent_responsable', e.target.value)} style={inputStyle} placeholder="Email agent CC" /></div>
            <div><label style={labelStyle}>Produit *</label>
              <input required value={form.produit} onChange={e => fVal('produit', e.target.value)} style={inputStyle} placeholder="ex: Riz 50 kg" /></div>
            <div><label style={labelStyle}>Quantité *</label>
              <input type="number" min="0" required value={form.quantite} onChange={e => fVal('quantite', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Prix unitaire (FCFA) *</label>
              <input type="number" min="0" required value={form.prix_unitaire} onChange={e => fVal('prix_unitaire', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Réduction (FCFA)</label>
              <input type="number" min="0" value={form.reduction} onChange={e => fVal('reduction', e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Coût unitaire (FCFA)</label>
              <input type="number" min="0" value={form.cout_unitaire} onChange={e => fVal('cout_unitaire', e.target.value)} style={inputStyle} placeholder="Pour la marge" /></div>
            <div><label style={labelStyle}>Statut paiement</label>
              <select value={form.statut_paiement} onChange={e => fVal('statut_paiement', e.target.value)} style={inputStyle}>
                {STATUTS_PAIEMENT.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></div>
            <div><label style={labelStyle}>Statut livraison</label>
              <select value={form.statut_livraison} onChange={e => fVal('statut_livraison', e.target.value)} style={inputStyle}>
                {STATUTS_LIVRAISON.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></div>
            <div><label style={labelStyle}>Notes</label>
              <input value={form.notes} onChange={e => fVal('notes', e.target.value)} style={inputStyle} placeholder="Observations…" /></div>
            <div><label style={labelStyle}>Réf. commande</label>
              <input value={form.order_ref} onChange={e => fVal('order_ref', e.target.value)} style={inputStyle} placeholder="ID optionnel" /></div>
          </div>
          {form.prix_unitaire && form.quantite && (
            <div style={{ marginTop: 14, padding: '10px 16px', background: '#f0faf4', borderRadius: 8, display: 'flex', gap: 28, fontSize: 13, flexWrap: 'wrap' }}>
              <span>Montant total : <strong style={{ color: '#4caf7d' }}>{fmt(prevMontant)}</strong></span>
              {parseFloat(form.cout_unitaire) > 0 && <span>Marge estimée : <strong style={{ color: prevMarge >= 0 ? '#2196f3' : '#e53935' }}>{fmt(prevMarge)}</strong></span>}
            </div>
          )}
          <button type="submit" disabled={saving} style={{ marginTop: 16, ...btnPrimary }}>
            {saving ? 'Enregistrement…' : editRow ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </form>
      )}

      {/* Tableau principal */}
      {!rows ? <Spinner /> : rows.length === 0
        ? (
          <div style={{ ...cardStyle, color: '#636e72', fontSize: 13, textAlign: 'center', padding: 32 }}>
            Aucune vente dans le suivi.<br />
            <span style={{ fontSize: 12, color: '#aaa' }}>Utilisez "⬇️ Importer commandes CC" ou "+ Nouvelle vente" pour commencer.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  {['ID', 'Date', 'Grossiste', 'Revendeur', 'Agent', 'Produit', 'Qté', 'Prix unit.', 'Montant total', 'Réduction', 'Statut paiement', 'Statut livraison', 'Marge est.', ''].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const mt = montant(r);
                  const mg = marge(r);
                  const sp = statPaie(r.statut_paiement);
                  const sl = statLivr(r.statut_livraison);
                  const hasCout = parseFloat(r.cout_unitaire || 0) > 0;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                      <td style={{ ...tdStyle, fontSize: 11, fontFamily: 'monospace', color: '#636e72' }} title={r.id}>
                        {r.order_ref
                          ? <span title={`Lié à commande: ${r.order_ref}`}>{r.id.slice(-6)} <span style={{ color: '#2196f3' }}>🔗</span></span>
                          : r.id.slice(-6)
                        }
                      </td>
                      <td style={tdStyle}>{r.date_vente || '—'}</td>
                      <td style={{ ...tdStyle, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.grossiste}>
                        {r.grossiste || '—'}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.revendeur}>
                        {r.revendeur || '—'}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#636e72', fontSize: 12 }} title={r.agent_responsable}>
                        {r.agent_responsable || '—'}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{r.produit || '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{r.quantite ?? '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#636e72' }}>{fmt(r.prix_unitaire)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#1e3a2f', textAlign: 'right' }}>{fmt(mt)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: parseFloat(r.reduction) > 0 ? '#e53935' : '#ccc', fontSize: 12 }}>
                        {parseFloat(r.reduction) > 0 ? `−${fmt(r.reduction)}` : '—'}
                      </td>
                      <td style={tdStyle}>
                        <select value={r.statut_paiement}
                          onChange={e => updateStatus(r.id, 'statut_paiement', e.target.value)}
                          style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 11, background: sp.color + '22', color: sp.color, fontWeight: 700, cursor: 'pointer', minWidth: 95 }}>
                          {STATUTS_PAIEMENT.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <select value={r.statut_livraison}
                          onChange={e => updateStatus(r.id, 'statut_livraison', e.target.value)}
                          style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 11, background: sl.color + '22', color: sl.color, fontWeight: 700, cursor: 'pointer', minWidth: 95 }}>
                          {STATUTS_LIVRAISON.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                        </select>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: mg >= 0 ? '#4caf50' : '#e53935', textAlign: 'right' }}>
                        {hasCout ? fmt(mg) : <span style={{ color: '#ccc', fontSize: 11 }}>N/A</span>}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEdit(r)} style={{ padding: '3px 8px', borderRadius: 6, background: '#e8f5e9', border: 'none', color: '#2e7d32', fontSize: 12, cursor: 'pointer' }}>✏️</button>
                          <button onClick={() => handleDelete(r.id)} style={{ padding: '3px 8px', borderRadius: 6, background: '#f8d7da', border: 'none', color: '#721c24', fontSize: 12, cursor: 'pointer' }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8f9fa', fontWeight: 700, borderTop: '2px solid #dee2e6' }}>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'right', color: '#495057', fontSize: 12 }}>TOTAUX ({rows.length} vente{rows.length > 1 ? 's' : ''})</td>
                  <td style={{ ...tdStyle, color: '#1e3a2f', textAlign: 'right' }}>{fmt(totalCA)}</td>
                  <td style={tdStyle} />
                  <td style={tdStyle} />
                  <td style={tdStyle} />
                  <td style={{ ...tdStyle, color: totalMarge >= 0 ? '#4caf50' : '#e53935', textAlign: 'right' }}>
                    {rows.some(r => parseFloat(r.cout_unitaire || 0) > 0) ? fmt(totalMarge) : '—'}
                  </td>
                  <td style={tdStyle} />
                </tr>
              </tfoot>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ─── TAB 3 : PAIEMENTS ────────────────────────────────────────────────────────
function TabPaiements() {
  const { user } = useAuth();
  const [rows, setRows]         = useState(null);
  const [filter, setFilter]     = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const emptyForm = { type: 'grossiste', email: '', ordre_id: '', montant: '', montant_paye: '0', statut: 'en_attente', echeance: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    const q = filter ? `?statut=${filter}` : '';
    api.comptaPaiements(q).then(setRows).catch(console.error);
  }, [filter]);
  useEffect(load, [load]);

  const totalDu   = rows?.reduce((s, r) => s + Math.max(0, parseFloat(r.montant) - parseFloat(r.montant_paye || 0)), 0) || 0;
  const totalPaye = rows?.reduce((s, r) => s + parseFloat(r.montant_paye || 0), 0) || 0;
  const nbRetard  = rows?.filter(r => r.statut === 'retard').length || 0;

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createComptaPaiement({ ...form, created_by: user?.email });
      setForm(emptyForm); setFormOpen(false); load();
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatsCard label="Montant dû"   value={fmt(totalDu)}   color="#f44336" sub="non encore reçu" />
        <StatsCard label="Montant reçu" value={fmt(totalPaye)} color="#4caf50" sub="paiements effectués" />
        <StatsCard label="En retard"    value={nbRetard}       color="#ff9800" sub="dossiers" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <FilterBar options={STATUTS_PAIEMENT.map(s => ({ value: s.value, label: s.label }))} value={filter} onChange={setFilter} />
        <button onClick={() => setFormOpen(o => !o)} style={btnPrimary}>
          {formOpen ? '✕ Annuler' : '+ Ajouter paiement'}
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleAdd} style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Nouveau suivi paiement</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <div><label style={labelStyle}>Type *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                <option value="grossiste">Grossiste</option>
                <option value="revendeur">Revendeur</option>
              </select>
            </div>
            <div><label style={labelStyle}>Email *</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required style={inputStyle} placeholder="email@exemple.com" />
            </div>
            <div><label style={labelStyle}>Référence commande</label>
              <input value={form.ordre_id} onChange={e => setForm(f => ({ ...f, ordre_id: e.target.value }))} style={inputStyle} placeholder="ID optionnel" />
            </div>
            <div><label style={labelStyle}>Montant total (FCFA) *</label>
              <input type="number" min="0" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} required style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Montant déjà payé (FCFA)</label>
              <input type="number" min="0" value={form.montant_paye} onChange={e => setForm(f => ({ ...f, montant_paye: e.target.value }))} style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Statut</label>
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} style={inputStyle}>
                {STATUTS_PAIEMENT.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Échéance</label>
              <input type="date" value={form.echeance} onChange={e => setForm(f => ({ ...f, echeance: e.target.value }))} style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} placeholder="Reçu, conditions, commentaires…" />
            </div>
          </div>
          <button type="submit" disabled={saving} style={{ marginTop: 16, ...btnPrimary }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}

      {!rows ? <Spinner /> : rows.length === 0
        ? <div style={{ color: '#636e72', padding: 20 }}>Aucun paiement enregistré.</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead><tr style={{ background: '#f8f9fa' }}>
                {['Type', 'Email', 'Référence', 'Montant', 'Payé', 'Reste dû', 'Statut', 'Échéance', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const s = statPaie(r.statut);
                  const reste = parseFloat(r.montant) - parseFloat(r.montant_paye || 0);
                  const overdue = r.echeance && new Date(r.echeance) < new Date() && r.statut !== 'payé';
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f5', background: overdue ? '#fff5f5' : 'transparent' }}>
                      <td style={tdStyle}><span style={badge('#2196f3')}>{r.type}</span></td>
                      <td style={tdStyle}>{r.email}</td>
                      <td style={{ ...tdStyle, fontSize: 11, color: '#636e72' }}>{r.ordre_id || '—'}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(r.montant)}</td>
                      <td style={{ ...tdStyle, color: '#4caf50', fontWeight: 600 }}>{fmt(r.montant_paye)}</td>
                      <td style={{ ...tdStyle, color: reste > 0 ? '#f44336' : '#4caf50', fontWeight: 700 }}>{fmt(reste)}</td>
                      <td style={tdStyle}>
                        <select value={r.statut}
                          onChange={async e => { await api.updateComptaPaiement(r.id, { statut: e.target.value }); load(); }}
                          style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 12, background: s.color + '22', color: s.color, fontWeight: 600, cursor: 'pointer' }}>
                          {STATUTS_PAIEMENT.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                        </select>
                      </td>
                      <td style={{ ...tdStyle, color: overdue ? '#f44336' : '#495057', fontWeight: overdue ? 700 : 400 }}>
                        {r.echeance || '—'}{overdue ? ' ⚠️' : ''}
                      </td>
                      <td style={tdStyle}>
                        <button onClick={async () => { if (!window.confirm('Supprimer ?')) return; await api.deleteComptaPaiement(r.id); load(); }}
                          style={{ padding: '3px 8px', borderRadius: 6, background: '#f8d7da', border: 'none', color: '#721c24', fontSize: 12, cursor: 'pointer' }}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ─── TAB 4 : COMMISSIONS ──────────────────────────────────────────────────────
function TabCommissions() {
  const { user } = useAuth();
  const [rows, setRows]         = useState(null);
  const [filter, setFilter]     = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const curPeriode = new Date().toISOString().slice(0, 7);
  const emptyForm = { agent_email: '', agent_nom: '', periode: curPeriode, nb_ventes: '', ca_realise: '', taux_commission: '5', statut: 'en_attente', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    const q = filter ? `?statut=${filter}` : '';
    api.comptaCommissions(q).then(setRows).catch(console.error);
  }, [filter]);
  useEffect(load, [load]);

  const totalCom     = rows?.reduce((s, r) => s + parseFloat(r.montant_commission || 0), 0) || 0;
  const totalPaye    = rows?.filter(r => r.statut === 'payé').reduce((s, r) => s + parseFloat(r.montant_commission || 0), 0) || 0;
  const totalPending = rows?.filter(r => r.statut !== 'payé').reduce((s, r) => s + parseFloat(r.montant_commission || 0), 0) || 0;
  const montantCalc  = parseFloat(form.ca_realise || 0) * parseFloat(form.taux_commission || 5) / 100;

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createComptaCommission({ ...form, montant_commission: montantCalc, created_by: user?.email });
      setForm(emptyForm); setFormOpen(false); load();
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatsCard label="Total commissions" value={fmt(totalCom)}     color="#9c27b0" />
        <StatsCard label="Déjà payé"         value={fmt(totalPaye)}    color="#4caf50" />
        <StatsCard label="À payer / valider" value={fmt(totalPending)} color="#ff9800" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <FilterBar options={STATUTS_COMMISSION.map(s => ({ value: s.value, label: s.label }))} value={filter} onChange={setFilter} />
        <button onClick={() => setFormOpen(o => !o)} style={btnPrimary}>
          {formOpen ? '✕ Annuler' : '+ Ajouter commission'}
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleAdd} style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Nouvelle commission agent</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <div><label style={labelStyle}>Email agent *</label>
              <input value={form.agent_email} onChange={e => setForm(f => ({ ...f, agent_email: e.target.value }))} required style={inputStyle} placeholder="agent@facilitar.cm" />
            </div>
            <div><label style={labelStyle}>Nom agent</label>
              <input value={form.agent_nom} onChange={e => setForm(f => ({ ...f, agent_nom: e.target.value }))} style={inputStyle} placeholder="Nom complet" />
            </div>
            <div><label style={labelStyle}>Période *</label>
              <input type="month" value={form.periode} onChange={e => setForm(f => ({ ...f, periode: e.target.value }))} required style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Nb ventes réalisées</label>
              <input type="number" min="0" value={form.nb_ventes} onChange={e => setForm(f => ({ ...f, nb_ventes: e.target.value }))} style={inputStyle} />
            </div>
            <div><label style={labelStyle}>CA réalisé (FCFA)</label>
              <input type="number" min="0" value={form.ca_realise} onChange={e => setForm(f => ({ ...f, ca_realise: e.target.value }))} style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Taux commission (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={form.taux_commission} onChange={e => setForm(f => ({ ...f, taux_commission: e.target.value }))} style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Montant calculé</label>
              <div style={{ ...inputStyle, background: '#f8f9fa', color: '#4caf50', fontWeight: 700 }}>{fmt(montantCalc)}</div>
            </div>
            <div><label style={labelStyle}>Statut</label>
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} style={inputStyle}>
                {STATUTS_COMMISSION.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Notes (preuves, livraisons, reçus…)</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} placeholder="Rapport terrain, référence reçu…" />
            </div>
          </div>
          <button type="submit" disabled={saving} style={{ marginTop: 16, ...btnPrimary }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}

      {!rows ? <Spinner /> : rows.length === 0
        ? <div style={{ color: '#636e72', padding: 20 }}>Aucune commission enregistrée.</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead><tr style={{ background: '#f8f9fa' }}>
                {['Agent', 'Période', 'Nb ventes', 'CA réalisé', 'Taux', 'Commission', 'Statut', 'Notes', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const s = statComm(r.statut);
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{r.agent_nom || r.agent_email}</div>
                        {r.agent_nom && <div style={{ fontSize: 11, color: '#636e72' }}>{r.agent_email}</div>}
                      </td>
                      <td style={tdStyle}>{r.periode}</td>
                      <td style={tdStyle}>{r.nb_ventes}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(r.ca_realise)}</td>
                      <td style={tdStyle}>{r.taux_commission}%</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#9c27b0' }}>{fmt(r.montant_commission)}</td>
                      <td style={tdStyle}>
                        <select value={r.statut}
                          onChange={async e => { await api.updateComptaCommission(r.id, { statut: e.target.value }); load(); }}
                          style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 12, background: s.color + '22', color: s.color, fontWeight: 600, cursor: 'pointer' }}>
                          {STATUTS_COMMISSION.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                        </select>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#636e72', maxWidth: 180 }}>{r.notes || '—'}</td>
                      <td style={tdStyle}>
                        <button onClick={async () => { if (!window.confirm('Supprimer ?')) return; await api.deleteComptaCommission(r.id); load(); }}
                          style={{ padding: '3px 8px', borderRadius: 6, background: '#f8d7da', border: 'none', color: '#721c24', fontSize: 12, cursor: 'pointer' }}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ─── TAB 5 : ANALYSE PRODUITS ─────────────────────────────────────────────────
function TabProduits() {
  const [data, setData] = useState(null);
  useEffect(() => { api.comptaAnalyseProduits().then(setData).catch(console.error); }, []);
  if (!data) return <Spinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TableBlock
        title="🏆 Top produits par CA"
        columns={['#', 'Type', 'Variété', 'Commandes', 'CA total', 'Prix moyen']}
        rows={data.topProduits}
        renderRow={(r, i) => [
          <span style={{ fontWeight: 700, color: ['#f39c12','#95a5a6','#cd7f32'][i] || '#b2bec3' }}>
            {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
          </span>,
          r.type || '—', r.variete || '—', r.nb_ventes,
          <strong style={{ color: '#4caf7d' }}>{fmt(r.ca_total)}</strong>,
          fmt(r.prix_moyen),
        ]}
        emptyMsg="Aucune commande enregistrée."
      />
      <TableBlock
        title="📦 Rotation du stock"
        columns={['Type', 'Variété', 'Total', 'Vendus/Livrés', 'Disponibles', 'Taux vente']}
        rows={data.stockRotation}
        renderRow={r => {
          const taux = r.nb_total > 0 ? Math.round(r.nb_vendus / r.nb_total * 100) : 0;
          const color = taux > 70 ? '#4caf50' : taux > 40 ? '#ff9800' : '#f44336';
          return [
            r.type || '—', r.variete || '—', r.nb_total,
            <span style={{ color: '#4caf50', fontWeight: 600 }}>{r.nb_vendus}</span>,
            <span style={{ color: '#ff9800', fontWeight: 600 }}>{r.nb_dispo}</span>,
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
              <div style={{ flex: 1, background: '#e0e0e0', borderRadius: 4, height: 7 }}>
                <div style={{ width: `${taux}%`, background: color, height: 7, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>{taux}%</span>
            </div>,
          ];
        }}
        emptyMsg="Aucun produit enregistré."
      />
    </div>
  );
}

// ─── TAB 6 : PROMOTIONS ───────────────────────────────────────────────────────
function TabPromotions() {
  const [summary, setSummary] = useState(null);
  useEffect(() => { api.depensesSummary().then(setSummary).catch(console.error); }, []);
  if (!summary) return <Spinner />;

  const promoTotal = summary.totaux.find(t => t.categorie === 'frais_promo')?.total || 0;
  const promoCount = summary.totaux.find(t => t.categorie === 'frais_promo')?.count || 0;
  const gains      = summary.gains;
  const ratio      = gains > 0 ? (promoTotal / gains * 100).toFixed(1) : 0;
  const ratioNum   = parseFloat(ratio);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatsCard label="Budget promos"     value={fmt(promoTotal)}         color="#e91e63" sub={`${promoCount} opérations`} />
        <StatsCard label="CA total"          value={fmt(gains)}              color="#4caf7d" sub="commandes grossiste + revendeur" />
        <StatsCard label="Ratio promo / CA"  value={`${ratio}%`}            color={ratioNum > 20 ? '#f44336' : ratioNum > 10 ? '#ff9800' : '#4caf50'} sub="part des ventes en promos" />
        <StatsCard label="Marge après promo" value={fmt(gains - promoTotal)} color={gains - promoTotal >= 0 ? '#4caf7d' : '#e53935'} />
      </div>

      {summary.promosParNiveau?.length > 0
        ? (
          <div style={cardStyle}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#1e3a2f' }}>Répartition des promos par niveau</h3>
            {summary.promosParNiveau.map(p => {
              const pct    = gains > 0 ? (p.total / gains * 100).toFixed(1) : 0;
              const barPct = promoTotal > 0 ? (p.total / promoTotal * 100) : 0;
              return (
                <div key={p.niveau} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: 13 }}>{p.niveau}</span>
                    <div>
                      <span style={{ fontWeight: 700, color: '#e91e63' }}>{fmt(p.total)}</span>
                      <span style={{ fontSize: 12, color: '#636e72', marginLeft: 10 }}>{pct}% du CA</span>
                    </div>
                  </div>
                  <div style={{ background: '#f1f3f5', borderRadius: 6, height: 9 }}>
                    <div style={{ width: `${barPct}%`, background: '#e91e63', height: 9, borderRadius: 6, transition: 'width .3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )
        : <div style={{ color: '#636e72', padding: '12px 0 20px' }}>Aucune dépense de promo enregistrée.</div>
      }

      <div style={{ background: '#fff3e0', borderRadius: 10, padding: 20, borderLeft: '4px solid #ff9800' }}>
        <div style={{ fontWeight: 700, color: '#e65100', marginBottom: 8, fontSize: 14 }}>⚠️ Règle de vigilance</div>
        <div style={{ fontSize: 13, color: '#495057', lineHeight: 1.7 }}>
          Un ratio promo/CA supérieur à <strong>15–20%</strong> peut indiquer un risque sérieux sur la marge.<br />
          Comparez le CA <em>avant</em> et <em>après</em> chaque campagne pour mesurer l'impact réel.<br />
          Une mauvaise promo peut liquider le stock mais détruire la marge globale.
        </div>
      </div>
    </div>
  );
}

// ─── TAB 7 : DÉPENSES ────────────────────────────────────────────────────────
function TabDepenses() {
  const { user } = useAuth();
  const [summary, setSummary]     = useState(null);
  const [rows, setRows]           = useState(null);
  const [filterCat, setFilterCat] = useState('');
  const [filterCC, setFilterCC]   = useState(false);
  const [formOpen, setFormOpen]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);
  const emptyForm = { categorie: '', montant: '', description: '', beneficiaire: '', niveau: '', date: new Date().toISOString().slice(0, 10) };
  const [form, setForm] = useState(emptyForm);

  const loadAll = useCallback(() => {
    api.depensesSummary().then(setSummary);
    let q = '?';
    if (filterCat) q += `categorie=${filterCat}&`;
    if (filterCC)  q += `niveau=vente&`; // CC expenses have niveau=vente or visite — use broad filter below
    api.depenses(q.length > 1 ? q.slice(0, -1) : '').then(rows => {
      if (filterCC) {
        setRows(Array.isArray(rows) ? rows.filter(r => r.niveau === 'vente' || r.niveau === 'visite') : []);
      } else {
        setRows(Array.isArray(rows) ? rows : []);
      }
    });
  }, [filterCat, filterCC]);
  useEffect(loadAll, [loadAll]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await api.createDepense({ ...form, created_by: user?.email });
      setForm(emptyForm); setFormOpen(false); loadAll();
    } catch { setError('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {summary && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          {DEP_CATEGORIES.map(cat => {
            const found = summary.totaux.find(t => t.categorie === cat.value);
            return (
              <div key={cat.value} style={{ flex: 1, minWidth: 180, background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,.08)', borderLeft: `4px solid ${cat.color}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{cat.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: cat.color }}>{fmt(found?.total || 0)}</div>
                <div style={{ fontSize: 12, color: '#b2bec3', marginTop: 2 }}>{found?.count || 0} entrée(s)</div>
                {cat.value === 'frais_promo' && summary.promosParNiveau?.map(p => (
                  <div key={p.niveau} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4, color: '#636e72' }}>
                    <span>↳ {p.niveau}</span><strong>{fmt(p.total)}</strong>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterBar options={DEP_CATEGORIES.map(c => ({ value: c.value, label: c.label }))} value={filterCat} onChange={v => { setFilterCat(v); setFilterCC(false); }} />
          <button onClick={() => { setFilterCC(v => !v); setFilterCat(''); }} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
            background: filterCC ? '#00897b' : '#e0f2f1', color: filterCC ? '#fff' : '#00897b',
          }}>
            {filterCC ? '✅ Dépenses CC' : '📱 Filtrer Dép. CC'}
          </button>
        </div>
        <button onClick={() => setFormOpen(o => !o)} style={btnPrimary}>
          {formOpen ? '✕ Annuler' : '+ Ajouter une dépense'}
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleAdd} style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Nouvelle dépense</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            <div><label style={labelStyle}>Catégorie *</label>
              <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value, niveau: '' }))} required style={inputStyle}>
                <option value="">— Choisir —</option>
                {DEP_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Montant (FCFA) *</label>
              <input type="number" min="0" step="1" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} required style={inputStyle} placeholder="ex: 5000" />
            </div>
            <div><label style={labelStyle}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Bénéficiaire</label>
              <input value={form.beneficiaire} onChange={e => setForm(f => ({ ...f, beneficiaire: e.target.value }))} style={inputStyle} placeholder="Nom / email" />
            </div>
            {form.categorie === 'frais_promo' && (
              <div><label style={labelStyle}>Niveau</label>
                <select value={form.niveau} onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))} style={inputStyle}>
                  <option value="">— Choisir —</option>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
                </select>
              </div>
            )}
            <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="Détails optionnels" />
            </div>
          </div>
          {error && <div style={{ marginTop: 12, color: '#721c24', fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={saving} style={{ marginTop: 16, ...btnPrimary }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      )}

      {!rows ? <Spinner /> : rows.length === 0
        ? <div style={{ color: '#636e72', padding: 20 }}>Aucune dépense enregistrée.</div>
        : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead><tr style={{ background: '#f8f9fa' }}>
                {['Date', 'Agent', 'Catégorie', 'Montant', 'Bénéficiaire', 'Contexte', 'Description', ''].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                    <td style={tdStyle}>{r.date}</td>
                    <td style={tdStyle}>
                      {r.created_by
                        ? <span style={{ fontSize: 11, background: '#e3f2fd', color: '#1565c0', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>{r.created_by.split('@')[0]}</span>
                        : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={tdStyle}><span style={badge(catColor(r.categorie))}>{catLabel(r.categorie)}</span></td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(r.montant)}</td>
                    <td style={tdStyle}>{r.beneficiaire || '—'}</td>
                    <td style={tdStyle}>
                      {(r.niveau === 'vente' || r.niveau === 'visite')
                        ? <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                            background: r.niveau === 'vente' ? '#e8f5e9' : '#fce4ec',
                            color: r.niveau === 'vente' ? '#2e7d32' : '#c62828' }}>
                            {r.niveau === 'vente' ? '🛒 Vente' : '🏃 Visite'}
                          </span>
                        : r.niveau ? r.niveau.charAt(0).toUpperCase() + r.niveau.slice(1) : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: '#636e72' }}>{r.description || '—'}</td>
                    <td style={tdStyle}>
                      <button onClick={async () => { if (!window.confirm('Supprimer ?')) return; await api.deleteDepense(r.id); loadAll(); }}
                        style={{ padding: '3px 8px', borderRadius: 6, background: '#f8d7da', border: 'none', color: '#721c24', fontSize: 12, cursor: 'pointer' }}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// ─── TAB REVENDEURS ───────────────────────────────────────────────────────────
function TabRevendeurs() {
  const [rows, setRows]     = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.ccAllClients(2)
      .then(d => setRows(d || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r =>
    !search || r.nom?.toLowerCase().includes(search.toLowerCase()) ||
    r.telephone?.includes(search) || r.adresse?.toLowerCase().includes(search.toLowerCase())
  );
  const unclassified = filtered.filter(r => r.cc_groupe === null || r.cc_groupe === undefined);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🛒 Liste des revendeurs</h2>
        <input
          placeholder="Rechercher..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 240 }}
        />
      </div>
      {unclassified.length > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13 }}>
          ⚠️ <strong>{unclassified.length} client(s)</strong> appartiennent à des agents dont le groupe n'a pas encore été assigné par le CEO.
          Ces clients sont listés ici mais leur classification (Grossiste/Revendeur) n'est pas confirmée.
        </div>
      )}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#636e72', fontSize: 13 }}>Chargement…</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Nom', 'Téléphone', 'Adresse', 'Agent CC', 'Date ravitaillement', 'Prochaine date', 'Notes'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#adb5bd' }}>Aucun revendeur trouvé</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nom}</td>
                  <td style={tdStyle}>{r.telephone || '—'}</td>
                  <td style={tdStyle}>{r.adresse || '—'}</td>
                  <td style={tdStyle}>
                    {r.agent_prenom} {r.agent_nom}
                    {(r.cc_groupe === null || r.cc_groupe === undefined) && (
                      <span style={{ ...badge('#ff9800'), marginLeft: 6, fontSize: 10 }}>⚠️ groupe indéfini</span>
                    )}
                    <br /><span style={{ fontSize: 11, color: '#636e72' }}>{r.cc_email}</span>
                  </td>
                  <td style={tdStyle}>{r.date_ravitaillement || '—'}</td>
                  <td style={tdStyle}>{r.prochaine_date || '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#636e72', marginTop: 8 }}>{filtered.length} client(s) — dont {filtered.filter(r => r.cc_groupe === 2).length} groupe Revendeur confirmé(s)</p>
    </div>
  );
}

// ─── TAB GROSSISTES ───────────────────────────────────────────────────────────
function TabGrossistes() {
  const [rows, setRows]     = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.ccAllClients(1)
      .then(d => setRows(d || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r =>
    !search || r.nom?.toLowerCase().includes(search.toLowerCase()) ||
    r.telephone?.includes(search) || r.adresse?.toLowerCase().includes(search.toLowerCase())
  );
  const unclassified = filtered.filter(r => r.cc_groupe === null || r.cc_groupe === undefined);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🏪 Liste des grossistes</h2>
        <input
          placeholder="Rechercher..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 240 }}
        />
      </div>
      {unclassified.length > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13 }}>
          ⚠️ <strong>{unclassified.length} client(s)</strong> appartiennent à des agents dont le groupe n'a pas encore été assigné par le CEO.
          Ces clients sont listés ici mais leur classification (Grossiste/Revendeur) n'est pas confirmée.
        </div>
      )}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#636e72', fontSize: 13 }}>Chargement…</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Nom', 'Téléphone', 'Adresse', 'Agent CC', 'Date ravitaillement', 'Prochaine date', 'Notes'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#adb5bd' }}>Aucun grossiste trouvé</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.nom}</td>
                  <td style={tdStyle}>{r.telephone || '—'}</td>
                  <td style={tdStyle}>{r.adresse || '—'}</td>
                  <td style={tdStyle}>
                    {r.agent_prenom} {r.agent_nom}
                    {(r.cc_groupe === null || r.cc_groupe === undefined) && (
                      <span style={{ ...badge('#ff9800'), marginLeft: 6, fontSize: 10 }}>⚠️ groupe indéfini</span>
                    )}
                    <br /><span style={{ fontSize: 11, color: '#636e72' }}>{r.cc_email}</span>
                  </td>
                  <td style={tdStyle}>{r.date_ravitaillement || '—'}</td>
                  <td style={tdStyle}>{r.prochaine_date || '—'}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#636e72', marginTop: 8 }}>{filtered.length} client(s) — dont {filtered.filter(r => r.cc_groupe === 1).length} groupe Grossiste confirmé(s)</p>
    </div>
  );
}

// ─── TAB AGENTS CC ────────────────────────────────────────────────────────────
function TabAgentsCC() {
  const [rows, setRows]     = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboardUsers()
      .then(d => setRows((d || []).filter(u => u.role === 'call_center')))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r =>
    !search ||
    r.nom?.toLowerCase().includes(search.toLowerCase()) ||
    r.prenom?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase()) ||
    r.username?.toLowerCase().includes(search.toLowerCase())
  );

  const groupeLabel = (g) => g === 1 ? '🏪 Grossiste' : g === 2 ? '🛒 Revendeur' : '—';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📞 Liste des agents CC</h2>
        <input
          placeholder="Rechercher..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 240 }}
        />
      </div>
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, color: '#636e72', fontSize: 13 }}>Chargement…</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Pseudonyme', 'Nom', 'Prénom', 'Email', 'Groupe', 'Statut', 'Créé le'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#adb5bd' }}>Aucun agent CC trouvé</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>@{r.username}</td>
                  <td style={tdStyle}>{r.nom || '—'}</td>
                  <td style={tdStyle}>{r.prenom || '—'}</td>
                  <td style={tdStyle}>{r.email}</td>
                  <td style={tdStyle}>
                    <span style={{ ...badge(r.cc_groupe === 1 ? '#1e3a2f' : '#2196f3') }}>{groupeLabel(r.cc_groupe)}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...badge(r.status === 'active' ? '#4caf50' : '#ff9800') }}>
                      {r.status === 'active' ? 'Actif' : r.status || '—'}
                    </span>
                  </td>
                  <td style={tdStyle}>{r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#636e72', marginTop: 8 }}>{filtered.length} agent(s) Call Center</p>
    </div>
  );
}

// ─── TAB TRÉSORERIE ──────────────────────────────────────────────────────────
const TRESO_CATEGORIES = [
  { value: 'promo_reduction',     label: '🎁 Promo / Réduction prix grossistes',         color: '#e91e63' },
  { value: 'campagne_inscription',label: '📋 Campagne enregistrement revendeurs/grossistes', color: '#9c27b0' },
  { value: 'abonnement',          label: '💳 Frais abonnement revendeurs/grossistes',     color: '#2196f3' },
  { value: 'salaire_cc_revendeur',label: '👤 Salaire agents CC Revendeur',                color: '#00897b' },
  { value: 'salaire_cc_grossiste',label: '👤 Salaire agents CC Grossiste',                color: '#ff9800' },
  { value: 'autre',               label: '📦 Autre',                                      color: '#636e72' },
];

const EMPTY_ENTREE     = { montant: '', description: '' };
const EMPTY_AFFECT     = { categorie: 'promo_reduction', montant: '', description: '', beneficiaire: '' };

function TabTresorerie() {
  const { user } = useAuth();
  const today    = new Date();
  const initMois = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [mois, setMois]               = useState(initMois);
  const [resume, setResume]           = useState(null);
  const [entrees, setEntrees]         = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [showFormEntree, setShowFormEntree]   = useState(false);
  const [showFormAffect, setShowFormAffect]   = useState(false);
  const [formEntree, setFormEntree]   = useState(EMPTY_ENTREE);
  const [formAffect, setFormAffect]   = useState(EMPTY_AFFECT);
  const [editAffect, setEditAffect]   = useState(null);
  const [saving, setSaving]           = useState(false);

  const shiftMois = (d) => {
    const [y, m] = mois.split('-').map(Number);
    const dt = new Date(y, m - 1 + d, 1);
    setMois(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`);
  };
  const moisLabel = new Date(mois + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const load = () => {
    api.tresoResume(mois).then(setResume).catch(console.error);
    api.tresoEntrees(mois).then(setEntrees).catch(console.error);
    api.tresoAffectations(mois).then(setAffectations).catch(console.error);
  };
  useEffect(() => { load(); }, [mois]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddEntree = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.createTresoEntree({ ...formEntree, mois, created_by: user?.username || user?.email });
      setShowFormEntree(false); setFormEntree(EMPTY_ENTREE); load();
    } finally { setSaving(false); }
  };

  const handleDeleteEntree = async (id) => {
    if (!window.confirm('Supprimer cette entrée ?')) return;
    await api.deleteTresoEntree(id); load();
  };

  const handleAddAffect = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editAffect) {
        await api.updateTresoAffectation(editAffect.id, formAffect);
      } else {
        await api.createTresoAffectation({ ...formAffect, mois, created_by: user?.username || user?.email });
      }
      setShowFormAffect(false); setEditAffect(null); setFormAffect(EMPTY_AFFECT); load();
    } finally { setSaving(false); }
  };

  const handleDeleteAffect = async (id) => {
    if (!window.confirm('Supprimer cette affectation ?')) return;
    await api.deleteTresoAffectation(id); load();
  };

  const catInfo = (v) => TRESO_CATEGORIES.find(c => c.value === v) || { label: v, color: '#636e72' };
  const pct = (montant) => resume?.totalEntrees > 0 ? ((parseFloat(montant) / resume.totalEntrees) * 100).toFixed(1) : 0;

  return (
    <div>
      {/* ── Navigation mois ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => shiftMois(-1)} style={{ ...btnPrimary, padding: '6px 14px' }}>‹</button>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1e3a2f', minWidth: 160, textAlign: 'center', textTransform: 'capitalize' }}>{moisLabel}</span>
          <button onClick={() => shiftMois(+1)} style={{ ...btnPrimary, padding: '6px 14px' }}>›</button>
        </div>
      </div>

      {/* ── KPI résumé ── */}
      {resume && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <StatsCard label="💰 Total reçu" value={fmt(resume.totalEntrees)} color="#4caf50" sub="argent confié au comptable" />
          <StatsCard label="📤 Total affecté" value={fmt(resume.totalAffectations)} color="#2196f3" sub="réparti par catégorie" />
          <StatsCard label="🏦 Solde disponible" value={fmt(resume.solde)} color={resume.solde >= 0 ? '#4caf7d' : '#f44336'} sub={resume.solde >= 0 ? 'Disponible' : 'Dépassement !'} />
        </div>
      )}

      {/* ── Répartition par catégorie ── */}
      {resume?.parCategorie?.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#1e3a2f' }}>📊 Répartition des affectations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resume.parCategorie.map(r => {
              const cat = catInfo(r.categorie);
              const p = parseFloat(pct(r.total));
              return (
                <div key={r.categorie}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: cat.color }}>{cat.label}</span>
                    <span style={{ fontWeight: 700 }}>{fmt(r.total)} <span style={{ color: '#adb5bd', fontWeight: 400 }}>({p}%)</span></span>
                  </div>
                  <div style={{ height: 8, background: '#f1f3f5', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(p, 100)}%`, background: cat.color, borderRadius: 4, transition: 'width .3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* ── Entrées ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a2f', margin: 0 }}>💰 Argent reçu</h3>
            <button onClick={() => setShowFormEntree(v => !v)} style={btnPrimary}>+ Ajouter</button>
          </div>

          {showFormEntree && (
            <form onSubmit={handleAddEntree} style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Montant (FCFA) *</label>
                <input style={inputStyle} type="number" min="0" value={formEntree.montant} onChange={e => setFormEntree(f => ({ ...f, montant: e.target.value }))} required placeholder="Ex: 500000" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={formEntree.description} onChange={e => setFormEntree(f => ({ ...f, description: e.target.value }))} placeholder="Source, remarque…" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving} style={btnPrimary}>{saving ? '…' : 'Enregistrer'}</button>
                <button type="button" onClick={() => setShowFormEntree(false)} style={{ ...btnPrimary, background: '#f1f3f5', color: '#495057' }}>Annuler</button>
              </div>
            </form>
          )}

          <div style={cardStyle}>
            {entrees.length === 0
              ? <div style={{ color: '#adb5bd', fontSize: 13 }}>Aucune entrée pour ce mois.</div>
              : entrees.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f3f5' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#4caf50' }}>+{fmt(e.montant)}</div>
                    {e.description && <div style={{ fontSize: 12, color: '#636e72' }}>{e.description}</div>}
                    <div style={{ fontSize: 11, color: '#adb5bd' }}>{(e.created_at || '').slice(0, 10)} · {e.created_by || '—'}</div>
                  </div>
                  <button onClick={() => handleDeleteEntree(e.id)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, border: '1px solid #f44336', background: '#fff5f5', color: '#f44336', cursor: 'pointer' }}>🗑</button>
                </div>
              ))
            }
          </div>
        </div>

        {/* ── Affectations ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e3a2f', margin: 0 }}>📤 Affectations</h3>
            <button onClick={() => { setEditAffect(null); setFormAffect(EMPTY_AFFECT); setShowFormAffect(v => !v); }} style={btnPrimary}>+ Affecter</button>
          </div>

          {showFormAffect && (
            <form onSubmit={handleAddAffect} style={{ ...cardStyle, marginBottom: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Catégorie *</label>
                <select style={inputStyle} value={formAffect.categorie} onChange={e => setFormAffect(f => ({ ...f, categorie: e.target.value }))}>
                  {TRESO_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Montant (FCFA) *</label>
                <input style={inputStyle} type="number" min="0" value={formAffect.montant} onChange={e => setFormAffect(f => ({ ...f, montant: e.target.value }))} required placeholder="Ex: 100000" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Bénéficiaire</label>
                <input style={inputStyle} value={formAffect.beneficiaire} onChange={e => setFormAffect(f => ({ ...f, beneficiaire: e.target.value }))} placeholder="Nom agent, campagne…" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={formAffect.description} onChange={e => setFormAffect(f => ({ ...f, description: e.target.value }))} placeholder="Détails…" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={saving} style={btnPrimary}>{saving ? '…' : editAffect ? 'Modifier' : 'Affecter'}</button>
                <button type="button" onClick={() => { setShowFormAffect(false); setEditAffect(null); }} style={{ ...btnPrimary, background: '#f1f3f5', color: '#495057' }}>Annuler</button>
              </div>
            </form>
          )}

          <div style={cardStyle}>
            {affectations.length === 0
              ? <div style={{ color: '#adb5bd', fontSize: 13 }}>Aucune affectation pour ce mois.</div>
              : affectations.map(a => {
                const cat = catInfo(a.categorie);
                return (
                  <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f3f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: cat.color + '22', color: cat.color }}>{cat.label}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#e53935' }}>-{fmt(a.montant)}</div>
                        {a.beneficiaire && <div style={{ fontSize: 12, color: '#495057' }}>→ {a.beneficiaire}</div>}
                        {a.description  && <div style={{ fontSize: 12, color: '#636e72' }}>{a.description}</div>}
                        <div style={{ fontSize: 11, color: '#adb5bd' }}>{(a.created_at || '').slice(0, 10)} · {a.created_by || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => { setEditAffect(a); setFormAffect({ categorie: a.categorie, montant: String(a.montant), description: a.description || '', beneficiaire: a.beneficiaire || '' }); setShowFormAffect(true); }} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, border: '1px solid #6c757d', background: '#f8f9fa', color: '#6c757d', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleDeleteAffect(a.id)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, border: '1px solid #f44336', background: '#fff5f5', color: '#f44336', cursor: 'pointer' }}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB PLANNING ─────────────────────────────────────────────────────────────
const STATUTS_PLANNING = [
  { value: 'a_faire',   label: 'À faire',   color: '#ff9800' },
  { value: 'en_cours',  label: 'En cours',  color: '#2196f3' },
  { value: 'fait',      label: 'Fait',      color: '#4caf50' },
];
const PRIORITES = [
  { value: 'haute',    label: '🔴 Haute' },
  { value: 'normale',  label: '🟡 Normale' },
  { value: 'basse',    label: '🟢 Basse' },
];

const EMPTY_TASK = { titre: '', description: '', statut: 'a_faire', priorite: 'normale' };

function TabPlanning() {
  const { user } = useAuth();
  const today    = new Date();
  const initMois = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [mois, setMois]         = useState(initMois);
  const [items, setItems]       = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState(EMPTY_TASK);
  const [saving, setSaving]     = useState(false);

  const load = () => api.planning(mois).then(setItems).catch(console.error);
  useEffect(() => { load(); }, [mois]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd  = () => { setEditItem(null); setForm(EMPTY_TASK); setFormOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ titre: item.titre, description: item.description || '', statut: item.statut, priorite: item.priorite }); setFormOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await api.updatePlanning(editItem.id, form);
      } else {
        await api.createPlanning({ ...form, mois, created_by: user?.username || user?.email });
      }
      setFormOpen(false); setEditItem(null); load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    await api.deletePlanning(id); load();
  };

  const handleStatut = async (item, statut) => {
    await api.updatePlanning(item.id, { statut });
    load();
  };

  const statPlan = (v) => STATUTS_PLANNING.find(s => s.value === v) || { label: v, color: '#636e72' };

  // Navigation mois
  const shiftMois = (delta) => {
    const [y, m] = mois.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMois(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const moisLabel = new Date(mois + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const grouped = STATUTS_PLANNING.reduce((acc, s) => {
    acc[s.value] = (items || []).filter(i => i.statut === s.value);
    return acc;
  }, {});

  return (
    <div>
      {/* ── En-tête navigation mois ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => shiftMois(-1)} style={{ ...btnPrimary, padding: '6px 14px' }}>‹</button>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1e3a2f', textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>{moisLabel}</span>
          <button onClick={() => shiftMois(+1)} style={{ ...btnPrimary, padding: '6px 14px' }}>›</button>
        </div>
        <button onClick={openAdd} style={btnPrimary}>+ Ajouter une tâche</button>
      </div>

      {/* ── Formulaire ajout/edit ── */}
      {formOpen && (
        <div style={{ ...cardStyle, border: '1.5px solid #1e3a2f22', marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#1e3a2f' }}>
            {editItem ? '✏️ Modifier la tâche' : '➕ Nouvelle tâche — ' + moisLabel}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Titre *</label>
                <input style={inputStyle} value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} required placeholder="Ex : Clôture des comptes, Déclaration TVA…" />
              </div>
              <div>
                <label style={labelStyle}>Statut</label>
                <select style={inputStyle} value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                  {STATUTS_PLANNING.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priorité</label>
                <select style={inputStyle} value={form.priorite} onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))}>
                  {PRIORITES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Détails, étapes, remarques…" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={btnPrimary}>{saving ? 'Enregistrement…' : editItem ? 'Enregistrer' : 'Ajouter'}</button>
              <button type="button" onClick={() => { setFormOpen(false); setEditItem(null); }} style={{ ...btnPrimary, background: '#f1f3f5', color: '#495057' }}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Kanban par statut ── */}
      {items === null ? <Spinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {STATUTS_PLANNING.map(s => (
            <div key={s.value} style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, minHeight: 120 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</span>
                <span style={{ fontSize: 12, background: s.color + '22', color: s.color, borderRadius: 12, padding: '1px 8px', fontWeight: 700 }}>{grouped[s.value].length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grouped[s.value].length === 0 && (
                  <div style={{ fontSize: 12, color: '#adb5bd', textAlign: 'center', padding: '12px 0' }}>Aucune tâche</div>
                )}
                {grouped[s.value].map(item => {
                  const prio = PRIORITES.find(p => p.value === item.priorite) || PRIORITES[1];
                  return (
                    <div key={item.id} style={{ background: '#fff', borderRadius: 8, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,.07)', border: `1.5px solid ${s.color}33` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a2f', lineHeight: 1.3, flex: 1 }}>{item.titre}</div>
                        <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{prio.label}</span>
                      </div>
                      {item.description && (
                        <div style={{ fontSize: 12, color: '#636e72', marginTop: 6, lineHeight: 1.4 }}>{item.description}</div>
                      )}
                      <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 6 }}>
                        Par {item.created_by || '—'} · {(item.updated_at || item.created_at || '').slice(0, 10)}
                      </div>
                      {/* Actions rapides statut */}
                      <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
                        {STATUTS_PLANNING.filter(st => st.value !== item.statut).map(st => (
                          <button key={st.value} onClick={() => handleStatut(item, st.value)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, border: `1px solid ${st.color}`, background: st.color + '15', color: st.color, cursor: 'pointer', fontWeight: 600 }}>
                            → {st.label}
                          </button>
                        ))}
                        <button onClick={() => openEdit(item)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, border: '1px solid #6c757d', background: '#f8f9fa', color: '#6c757d', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleDelete(item.id)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 12, border: '1px solid #f44336', background: '#fff5f5', color: '#f44336', cursor: 'pointer' }}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Comptabilite() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Module Comptabilité</h1>
      <p style={{ fontSize: 13, color: '#636e72', marginBottom: 20 }}>
        Suivi des ventes · Paiements &amp; crédits · Commissions agents · Analyse financière
      </p>

      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '2px solid #e9ecef', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 16px', border: 'none', background: 'transparent',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            color:        activeTab === tab.id ? '#1e3a2f' : '#636e72',
            borderBottom: `2px solid ${activeTab === tab.id ? '#1e3a2f' : 'transparent'}`,
            marginBottom: -2, transition: 'color .15s',
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'overview'    && <TabOverview />}
      {activeTab === 'ventes'      && <TabSuiviVentes />}
      {activeTab === 'paiements'   && <TabPaiements />}
      {activeTab === 'commissions' && <TabCommissions />}
      {activeTab === 'produits'    && <TabProduits />}
      {activeTab === 'promotions'  && <TabPromotions />}
      {activeTab === 'depenses'    && <TabDepenses />}
      {activeTab === 'revendeurs'  && <TabRevendeurs />}
      {activeTab === 'grossistes'  && <TabGrossistes />}
      {activeTab === 'agents_cc'   && <TabAgentsCC />}
      {activeTab === 'tresorerie'  && <TabTresorerie />}
      {activeTab === 'planning'    && <TabPlanning />}
    </div>
  );
}
