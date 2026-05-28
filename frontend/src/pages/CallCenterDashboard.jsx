import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const EMPTY_CLIENT = {
  nom: '', telephone: '', adresse: '', geolocation: '',
  produits: [], date_ravitaillement: '', prochaine_date: '', notes: '',
};

export default function CallCenterDashboard() {
  const { user } = useAuth();
  const [tab, setTab]           = useState('tendances');
  const [trends, setTrends]     = useState(null);
  const [clients, setClients]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [profile, setProfile]   = useState(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [t, c, p] = await Promise.all([
        api.ccTrends(user.email),
        api.ccClients(user.email),
        api.ccProfile(user.email).catch(() => null),
      ]);
      setTrends(t);
      setClients(c);
      setProfile(p);
    } catch (_) {}
    setLoading(false);
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function saveClient(data) {
    if (editClient?.id) {
      await api.ccUpdateClient(editClient.id, data);
    } else {
      await api.ccAddClient({ ...data, cc_email: user.email });
    }
    setShowForm(false);
    setEditClient(null);
    loadAll();
  }

  async function deleteClient(id) {
    if (!window.confirm('Supprimer ce client ?')) return;
    await api.ccDeleteClient(id);
    setSelected(null);
    loadAll();
  }

  const secteur = profile?.secteur_principal || user?.prenom ? `${profile?.secteur_principal || ''} › ${profile?.secteur_secondaire || ''}` : '—';

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: '#1e3a2f' }}>
          👤 {profile?.prenom || user?.prenom || 'Agent'} — Espace Call Center
        </h1>
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          {profile && (
            <>
              <Chip>📍 {profile.ville || '—'}</Chip>
              <Chip>🏷️ {profile.secteur_principal} › {profile.secteur_secondaire}</Chip>
              <Chip style={{ background: profile.orientation === 'Grossiste' ? '#e3f2fd' : '#f3e5f5', color: '#333' }}>
                {profile.orientation === 'Grossiste' ? '🏭' : '🏪'} {profile.orientation}
              </Chip>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #f0f0f0' }}>
        {[
          { key: 'tendances', label: '📈 Tendances du marché' },
          { key: 'clients',   label: `👥 Mes clients (${clients.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '10px 18px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: 'transparent',
              color: tab === t.key ? '#4caf7d' : '#636e72',
              borderBottom: tab === t.key ? '2px solid #4caf7d' : '2px solid transparent',
              marginBottom: -2, transition: 'all .15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Chargement…</div>}

      {/* ── TENDANCES ── */}
      {!loading && tab === 'tendances' && trends && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard icon="📦" label="Produits actifs" value={trends.produits_actifs} color="#4caf7d" />
            <StatCard icon="✅" label="Produits disponibles" value={trends.produits_disponibles} color="#2196f3" />
            <StatCard icon="💰" label="Ventes en cours" value={trends.ventes_actives} color="#ff9800" />
            <StatCard icon="📊" label="Chiffre d'affaires" value={`${(trends.chiffre_affaires || 0).toLocaleString('fr')} FCFA`} color="#9c27b0" />
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 15, color: '#1e3a2f' }}>
              🔥 Produits les plus demandés
            </h3>
            {trends.top_produits?.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0', color: '#999', fontSize: 12 }}>
                    <th style={th}>#</th>
                    <th style={th}>Type</th>
                    <th style={th}>Variété</th>
                    <th style={th}>Nb offres</th>
                    <th style={th}>Prix moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.top_produits.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f9f9f9' }}>
                      <td style={td}><span style={{ fontWeight: 700, color: '#4caf7d' }}>{i + 1}</span></td>
                      <td style={td}>{p.type || '—'}</td>
                      <td style={td}>{p.variete || '—'}</td>
                      <td style={td}>{p.nb}</td>
                      <td style={td}>{p.prix_moy ? `${Number(p.prix_moy).toLocaleString('fr')} FCFA` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 20 }}>Aucune donnée disponible pour le moment.</div>
            )}
          </div>

          <div style={{ background: '#f0fff4', borderRadius: 12, padding: 16, border: '1px solid #c8e6c9' }}>
            <h4 style={{ margin: '0 0 6px', color: '#1e3a2f', fontSize: 14 }}>💡 Votre secteur : {profile?.secteur_principal}</h4>
            <p style={{ margin: 0, fontSize: 13, color: '#2d6a4f', lineHeight: 1.5 }}>
              Suivez les tendances de votre marché <strong>{profile?.secteur_secondaire}</strong> et anticipez les besoins de vos clients {profile?.orientation === 'Grossiste' ? 'revendeurs' : 'consommateurs'}.
            </p>
          </div>
        </div>
      )}

      {/* ── CLIENTS ── */}
      {!loading && tab === 'clients' && (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '320px 1fr' : '1fr', gap: 20 }}>
          {/* Liste */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#1e3a2f' }}>Liste des clients</h3>
              <button onClick={() => { setEditClient(null); setShowForm(true); }} style={btnAdd}>
                + Ajouter
              </button>
            </div>
            {clients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#bbb', fontSize: 14 }}>
                Aucun client enregistré.<br />
                <button onClick={() => { setEditClient(null); setShowForm(true); }}
                  style={{ marginTop: 10, ...btnAdd }}>+ Ajouter le premier client</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
                {clients.map(c => (
                  <div key={c.id} onClick={() => setSelected(c)}
                    style={{
                      padding: '12px 14px', background: selected?.id === c.id ? '#f0fff4' : '#fff',
                      borderRadius: 10, cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                      border: selected?.id === c.id ? '1.5px solid #4caf7d' : '1.5px solid transparent',
                      transition: 'all .15s',
                    }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a2f' }}>{c.nom}</div>
                    <div style={{ fontSize: 12, color: '#636e72', marginTop: 2 }}>
                      {c.telephone && <span>📞 {c.telephone}  </span>}
                      {c.ville && <span>📍 {c.adresse}</span>}
                    </div>
                    {c.prochaine_date && (
                      <div style={{ fontSize: 11, marginTop: 4, color: isUrgent(c.prochaine_date) ? '#e74c3c' : '#4caf7d', fontWeight: 600 }}>
                        🗓 Prochain ravitaillement : {c.prochaine_date}
                        {isUrgent(c.prochaine_date) && ' ⚠️'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Détail client */}
          {selected && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#1e3a2f' }}>{selected.nom}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditClient(selected); setShowForm(true); }} style={btnEdit}>✏️ Modifier</button>
                  <button onClick={() => deleteClient(selected.id)} style={btnDelete}>🗑️</button>
                  <button onClick={() => setSelected(null)} style={btnClose}>✕</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InfoRow icon="📞" label="Téléphone" value={selected.telephone} />
                <InfoRow icon="📍" label="Adresse" value={selected.adresse} />
                {selected.geolocation && <InfoRow icon="🗺️" label="Géolocalisation" value={selected.geolocation} />}
                <InfoRow icon="🔄" label="Dernier ravitaillement" value={selected.date_ravitaillement} />
                <InfoRow icon="📅" label="Prochain ravitaillement" value={selected.prochaine_date}
                  highlight={isUrgent(selected.prochaine_date) ? '#fff5f5' : undefined} />
              </div>

              {/* Produits */}
              {selected.produits?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#636e72', textTransform: 'uppercase', marginBottom: 8 }}>Produits vendus</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ color: '#999', fontSize: 11 }}>
                        <th style={th}>Produit</th>
                        <th style={th}>Prix unitaire</th>
                        <th style={th}>Quantité restante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.produits.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={td}>{p.nom}</td>
                          <td style={td}>{p.prix ? `${Number(p.prix).toLocaleString('fr')} FCFA` : '—'}</td>
                          <td style={td}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 12, fontSize: 12,
                              background: p.quantite <= 5 ? '#ffebee' : '#f0fff4',
                              color: p.quantite <= 5 ? '#c0392b' : '#2d6a4f',
                              fontWeight: 700,
                            }}>
                              {p.quantite ?? '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selected.notes && (
                <div style={{ marginTop: 16, padding: 12, background: '#fffde7', borderRadius: 8, fontSize: 13, color: '#5d4037' }}>
                  <strong>📝 Notes :</strong> {selected.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL FORMULAIRE CLIENT ── */}
      {showForm && (
        <ClientModal
          initial={editClient || EMPTY_CLIENT}
          onSave={saveClient}
          onClose={() => { setShowForm(false); setEditClient(null); }}
        />
      )}
    </div>
  );
}

/* ─── Composant Modal Client ─── */
function ClientModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    nom: initial.nom || '',
    telephone: initial.telephone || '',
    adresse: initial.adresse || '',
    geolocation: initial.geolocation || '',
    produits: initial.produits || [],
    date_ravitaillement: initial.date_ravitaillement || '',
    prochaine_date: initial.prochaine_date || '',
    notes: initial.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [newProd, setNewProd] = useState({ nom: '', prix: '', quantite: '' });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addProduit() {
    if (!newProd.nom.trim()) return;
    set('produits', [...form.produits, { ...newProd, quantite: Number(newProd.quantite) || 0, prix: Number(newProd.prix) || 0 }]);
    setNewProd({ nom: '', prix: '', quantite: '' });
  }

  function removeProduit(i) {
    set('produits', form.produits.filter((_, idx) => idx !== i));
  }

  function updateProduitQty(i, val) {
    const copy = [...form.produits];
    copy[i] = { ...copy[i], quantite: Number(val) || 0 };
    set('produits', copy);
  }

  async function handleSave() {
    if (!form.nom.trim()) return alert('Le nom est requis.');
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24, width: '100%',
        maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: '#1e3a2f' }}>
            {initial.id ? '✏️ Modifier le client' : '➕ Nouveau client'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <MField label="Nom *" value={form.nom} onChange={v => set('nom', v)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MField label="Téléphone" value={form.telephone} onChange={v => set('telephone', v)} type="tel" />
            <MField label="Adresse" value={form.adresse} onChange={v => set('adresse', v)} />
          </div>
          <MField label="Géolocalisation (ex: lien WhatsApp)" value={form.geolocation} onChange={v => set('geolocation', v)} placeholder="https://maps.google.com/..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MField label="Dernier ravitaillement" value={form.date_ravitaillement} onChange={v => set('date_ravitaillement', v)} type="date" />
            <MField label="Prochain ravitaillement" value={form.prochaine_date} onChange={v => set('prochaine_date', v)} type="date" />
          </div>

          {/* Produits */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#636e72', textTransform: 'uppercase', marginBottom: 8 }}>
              Produits vendus
            </div>
            {form.produits.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{p.nom}</span>
                <span style={{ fontSize: 13, color: '#636e72' }}>{p.prix ? `${Number(p.prix).toLocaleString('fr')} FCFA` : '—'}</span>
                <input type="number" value={p.quantite} min="0"
                  onChange={e => updateProduitQty(i, e.target.value)}
                  placeholder="Qté restante"
                  style={{ width: 90, padding: '4px 6px', borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 13 }} />
                <button onClick={() => removeProduit(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input value={newProd.nom} onChange={e => setNewProd(p => ({ ...p, nom: e.target.value }))}
                placeholder="Nom du produit" style={inputSm} />
              <input value={newProd.prix} onChange={e => setNewProd(p => ({ ...p, prix: e.target.value }))}
                placeholder="Prix" type="number" style={{ ...inputSm, width: 80 }} />
              <input value={newProd.quantite} onChange={e => setNewProd(p => ({ ...p, quantite: e.target.value }))}
                placeholder="Qté" type="number" style={{ ...inputSm, width: 70 }} />
              <button onClick={addProduit} style={{ padding: '6px 12px', borderRadius: 6, background: '#4caf7d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
            </div>
          </div>

          <MField label="Notes commerciales" value={form.notes} onChange={v => set('notes', v)}
            multiline placeholder="Observations, préférences client..." />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#f0f0f0', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#495057' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 10, borderRadius: 8, background: '#4caf7d', border: 'none', cursor: 'pointer', fontWeight: 700, color: '#fff' }}>
            {saving ? 'Enregistrement…' : initial.id ? '✓ Mettre à jour' : '✓ Ajouter le client'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Petits composants ─── */
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#636e72', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function InfoRow({ icon, label, value, highlight }) {
  if (!value) return null;
  return (
    <div style={{ background: highlight || '#f8f9fa', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{icon} {label}</div>
      <div style={{ fontSize: 14, color: '#1e3a2f', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function Chip({ children, style }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, background: '#e8f5e9', color: '#2d6a4f',
      fontSize: 12, fontWeight: 600, ...style,
    }}>
      {children}
    </span>
  );
}

function MField({ label, value, onChange, type = 'text', placeholder, multiline }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#636e72', display: 'block', marginBottom: 3 }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, boxSizing: 'border-box' }} />
      )}
    </div>
  );
}

function isUrgent(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
}

const th = { textAlign: 'left', padding: '6px 10px', fontWeight: 600 };
const td = { padding: '8px 10px' };
const btnAdd = { padding: '7px 14px', borderRadius: 8, background: '#4caf7d', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 };
const btnEdit = { padding: '5px 10px', borderRadius: 7, background: '#e3f2fd', color: '#1565c0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnDelete = { padding: '5px 10px', borderRadius: 7, background: '#ffebee', color: '#c0392b', border: 'none', cursor: 'pointer', fontSize: 13 };
const btnClose = { padding: '5px 10px', borderRadius: 7, background: '#f0f0f0', color: '#636e72', border: 'none', cursor: 'pointer', fontSize: 13 };
const inputSm = { flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 13 };
