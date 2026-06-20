import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const EMPTY_CLIENT = {
  nom: '', telephone: '', adresse: '', geolocation: '',
  produits: [], date_ravitaillement: '', prochaine_date: '', notes: '',
};

export default function CallCenterDashboard() {
  const { user } = useAuth();
  const isGrossiste = Number(user?.cc_groupe) === 1;

  // Agent sans groupe assigné — afficher un écran d'attente
  if (user?.role === 'call_center' && !user?.cc_groupe) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>⏳ En attente d'assignation</h2>
        <p>Votre compte est actif mais votre groupe (Grossiste / Revendeur) n'a pas encore été assigné par le CEO.</p>
        <p>Veuillez contacter votre responsable.</p>
      </div>
    );
  }

  const [tab, setTab]           = useState('tendances');
  const [trends, setTrends]     = useState(null);
  const [clients, setClients]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [profile, setProfile]   = useState(null);
  const [depenses, setDepenses] = useState([]);
  const [depCtx, setDepCtx]     = useState('vente');
  const [depForm, setDepForm]   = useState({ transport: '', transport_detail: '', communication: '', communication_detail: '', imprevu: '', imprevu_detail: '' });
  const [depSaving, setDepSaving] = useState(false);

  // Cards cliquables — tendances
  const [selectedCard, setSelectedCard]   = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [produitsDetail, setProduitsDetail] = useState([]);
  const [ventesDetail, setVentesDetail]     = useState([]);
  const [souhaits, setSouhaits]             = useState([]);
  const [souhaitForm, setSouhaitForm]       = useState({ client: '', produit: '', quantite: '', notes: '' });
  const [souhaitSaving, setSouhaitSaving]   = useState(false);

  // Stock des grossistes (CC Grossiste) — prix éditables
  const [stockEdits, setStockEdits]         = useState({});
  const [stockSaving, setStockSaving]       = useState(null);
  const [stockSaved, setStockSaved]         = useState({});

  // Souhaits — édition inline quantite + notes (CC Revendeur)
  const [souhaitEdits, setSouhaitEdits]         = useState({});  // { id: { quantite, notes } }
  const [souhaitEditSaving, setSouhaitEditSaving] = useState(null); // id en cours de sauvegarde

  // Grossistes (CC Revendeur) — clients ajoutés par CC Grossiste
  const [grossisteClients, setGrossisteClients]   = useState([]);
  // Revendeurs (CC Grossiste) — clients ajoutés par CC Revendeur
  const [revendeurClients, setRevendeurClients]   = useState([]);

  // Formulaire "Débuter une vente" (CC Revendeur)
  const [venteClient, setVenteClient]   = useState('');
  const [venteVente, setVenteVente]     = useState(null);
  const [venteQte, setVenteQte]         = useState('');
  const [venteSaving, setVenteSaving]   = useState(false);
  const [venteSuccess, setVenteSuccess] = useState(false);

  // Ventes en attente de confirmation (CC Grossiste)
  const [ventesEnAttente, setVentesEnAttente]     = useState([]);
  const [confirmingVenteId, setConfirmingVenteId] = useState(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [t, c, p, d, gc] = await Promise.all([
        api.ccTrends(user.email),
        api.ccClients(user.email),
        api.ccProfile(user.email).catch(() => null),
        api.ccDepenses(user.email).catch(() => []),
        // CC Revendeur : grossistes ; CC Grossiste : revendeurs (compteur de carte 2)
        isGrossiste ? api.revendeurClients().catch(() => []) : api.grossisteClients().catch(() => []),
      ]);
      setTrends(t);
      setClients(c);
      setProfile(p);
      setDepenses(Array.isArray(d) ? d : []);
      if (isGrossiste) setRevendeurClients(Array.isArray(gc) ? gc : []);
      else setGrossisteClients(Array.isArray(gc) ? gc : []);
    } catch (_) {}
    setLoading(false);
  }, [user, isGrossiste]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Charger souhaits depuis le backend
  useEffect(() => {
    if (!user?.email) return;
    // CC Revendeur charge ses propres souhaits; CC Grossiste charge ceux du groupe 2 (revendeurs)
    const q = isGrossiste
      ? '?groupe=2'
      : `?email=${encodeURIComponent(user.email)}`;
    api.ccSouhaits(q).then(d => setSouhaits(Array.isArray(d) ? d : [])).catch(() => {});
  }, [user, isGrossiste]);

  async function handleCardClick(card) {
    if (selectedCard === card) { setSelectedCard(null); return; }
    setSelectedCard(card);
    // Card 1 'souhaits': Grossiste → stock éditables (leurs propres clients); Revendeur → souhaits CRUD
    if (card === 'souhaits' && isGrossiste) {
      // clients déjà chargés dans loadAll, pas de fetch supplémentaire
    }
    // Card 2 'produits': Grossiste → fiches revendeurs clients; Revendeur → fiches grossistes clients
    if (card === 'produits') {
      setDetailLoading(true);
      if (isGrossiste) {
        const data = await api.revendeurClients().catch(() => []);
        setRevendeurClients(Array.isArray(data) ? data : []);
      } else {
        const data = await api.grossisteClients().catch(() => []);
        setGrossisteClients(Array.isArray(data) ? data : []);
      }
      setDetailLoading(false);
    }
    // Card 3 'ventes': Grossiste → orders pending confirmation; Revendeur → form
    if (card === 'ventes') {
      setDetailLoading(true);
      if (isGrossiste) {
        const data = await api.revendeurOrders('?status=attente%20CC%20grossiste').catch(() => []);
        setVentesEnAttente(Array.isArray(data) ? data : []);
      } else {
        const data = await api.ventes('?status=disponible').catch(() => []);
        setVentesDetail(Array.isArray(data) ? data : []);
        setVenteClient(''); setVenteVente(null); setVenteQte(''); setVenteSuccess(false);
      }
      setDetailLoading(false);
    }
  }

  async function addSouhait(e) {
    e.preventDefault();
    setSouhaitSaving(true);
    const created = await api.ccAddSouhait({
      cc_email: user.email,
      client_nom: souhaitForm.client,
      produit:    souhaitForm.produit,
      quantite:   souhaitForm.quantite,
      notes:      souhaitForm.notes,
    }).catch(() => null);
    if (created) {
      setSouhaits(prev => [{
        id: created.id, cc_email: user.email,
        client_nom: souhaitForm.client, produit: souhaitForm.produit,
        quantite: souhaitForm.quantite, notes: souhaitForm.notes,
        created_at: new Date().toISOString(),
      }, ...prev]);
    }
    setSouhaitForm({ client: '', produit: '', quantite: '', notes: '' });
    setSouhaitSaving(false);
  }

  async function deleteSouhait(id) {
    await api.ccDeleteSouhait(id).catch(() => {});
    setSouhaits(prev => prev.filter(s => s.id !== id));
  }

  // ── Édition inline des souhaits (CC Revendeur) ────────────────────────────
  function handleSouhaitEdit(id, field, value) {
    setSouhaitEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function saveSouhait(s) {
    const edits = souhaitEdits[s.id];
    if (!edits) return;
    setSouhaitEditSaving(s.id);
    await api.ccUpdateSouhait(s.id, {
      cc_email: user.email,
      quantite: edits.quantite !== undefined ? edits.quantite : s.quantite,
      notes:    edits.notes    !== undefined ? edits.notes    : s.notes,
    }).catch(() => {});
    // Update local souhaits state
    setSouhaits(prev => prev.map(x =>
      x.id === s.id
        ? { ...x,
            quantite: edits.quantite !== undefined ? edits.quantite : x.quantite,
            notes:    edits.notes    !== undefined ? edits.notes    : x.notes,
          }
        : x
    ));
    setSouhaitEdits(prev => { const n = { ...prev }; delete n[s.id]; return n; });
    setSouhaitEditSaving(null);
  }

  // ── Gestion des prix (CC Grossiste) ────────────────────────────────────────
  function handlePrixChange(clientId, prodIdx, value) {
    setStockEdits(prev => ({ ...prev, [`${clientId}_${prodIdx}`]: value }));
  }

  async function savePrix(client, prodIdx) {
    const key = `${client.id}_${prodIdx}`;
    const newPrix = parseFloat(stockEdits[key]);
    if (isNaN(newPrix) || newPrix <= 0) return;
    const produit = client.produits[prodIdx];
    const ancienPrix = parseFloat(produit.prix) || 0;
    if (newPrix === ancienPrix) return;

    setStockSaving(key);
    // Update the produit price in the client's produits array
    const updatedProduits = client.produits.map((p, i) =>
      i === prodIdx ? { ...p, prix: newPrix } : p
    );
    await api.ccUpdateClient(client.id, { ...client, produits: updatedProduits }).catch(() => {});

    // Record price change history
    await api.addPrixHistory({
      cc_email: user.email,
      grossiste_nom: client.nom,
      produit_nom: produit.nom || produit.type || produit.produit || `Produit ${prodIdx + 1}`,
      ancien_prix: ancienPrix,
      nouveau_prix: newPrix,
    }).catch(() => {});

    // Update local state
    setClients(prev => prev.map(c =>
      c.id === client.id ? { ...c, produits: updatedProduits } : c
    ));
    setStockEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
    setStockSaved(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setStockSaved(prev => { const n = { ...prev }; delete n[key]; return n; }), 3000);
    setStockSaving(null);
  }

  async function handleStartVente(e) {
    e.preventDefault();
    if (!venteClient || !venteVente || !venteQte) return;
    setVenteSaving(true);
    await api.createRevendeurOrder({
      revendeurEmail: venteClient,
      status: 'attente CC grossiste',
      produit: {
        type:            venteVente.type,
        variete:         venteVente.variete,
        prix:            venteVente.prix,
        quantite:        Number(venteQte),
        grossiste_email: venteVente.grossiste_email,
        vente_id:        venteVente.id,
        initiated_by:    user.email,
      },
    });
    setVenteSaving(false);
    setVenteSuccess(true);
    setVenteClient('');
    setVenteVente(null);
    setVenteQte('');
  }

  async function handleConfirmVente(id) {
    setConfirmingVenteId(id);
    await api.updateRevOrderStatus(id, 'validation CEO');
    setVentesEnAttente(p => p.filter(o => o.id !== id));
    setConfirmingVenteId(null);
  }

  async function handleRejectVente(id) {
    setConfirmingVenteId(id);
    await api.updateRevOrderStatus(id, 'annulée');
    setVentesEnAttente(p => p.filter(o => o.id !== id));
    setConfirmingVenteId(null);
  }

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

  async function saveDepense(e) {
    e.preventDefault();
    setDepSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const ctx = depCtx === 'vente' ? 'Vente en cours' : 'Visite client';
    const entries = [
      { k: 'transport', label: 'Transport', detail: depForm.transport_detail },
      { k: 'communication', label: 'Communication', detail: depForm.communication_detail },
      { k: 'imprevu', label: 'Imprévu', detail: depForm.imprevu_detail },
    ];
    for (const e of entries) {
      const montant = parseFloat(depForm[e.k]);
      if (montant > 0) {
        await api.createDepense({
          categorie: e.k,
          montant,
          description: `[${ctx}] ${e.detail || e.label}`,
          niveau: depCtx,
          date: today,
          created_by: user.email,
        });
      }
    }
    setDepForm({ transport: '', transport_detail: '', communication: '', communication_detail: '', imprevu: '', imprevu_detail: '' });
    setDepSaving(false);
    loadAll();
  }

  async function deleteDepense(id) {
    await api.deleteDepense(id);
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
          { key: 'depenses',  label: '💸 Dépenses' },
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            <StatCard
              icon={isGrossiste ? '💰' : '💬'}
              label={isGrossiste ? 'Stock des grossistes' : 'Souhaits des clients'}
              value={isGrossiste ? clients.length : souhaits.length}
              color="#4caf7d"
              onClick={() => handleCardClick('souhaits')} active={selectedCard === 'souhaits'} />
            <StatCard
              icon={isGrossiste ? '🏪' : '✅'}
              label={isGrossiste ? 'Revendeurs clients' : 'Produits disponibles'}
              value={isGrossiste ? revendeurClients.length : grossisteClients.length}
              color="#2196f3"
              onClick={() => handleCardClick('produits')} active={selectedCard === 'produits'} />
            <StatCard
              icon={isGrossiste ? '🔔' : '🚀'}
              label={isGrossiste ? 'Ventes en cours' : 'Débuter une vente'}
              value={isGrossiste ? ventesEnAttente.length || trends.ventes_actives : trends.ventes_actives}
              color="#ff9800"
              onClick={() => handleCardClick('ventes')} active={selectedCard === 'ventes'} />
            <StatCard icon="📊" label="Chiffre d'affaires" value={`${(trends.chiffre_affaires || 0).toLocaleString('fr')} FCFA`} color="#9c27b0"
              onClick={() => handleCardClick('ca')} active={selectedCard === 'ca'} />
          </div>

          {/* ── Panneau détail ── */}
          {selectedCard && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 20, border: '1px solid #f0f0f0' }}>
              {detailLoading && <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>Chargement…</div>}

              {/* CARD 1: 'souhaits'
                  Grossiste → Stock des grossistes (clients.produits, prix éditables)
                  Revendeur → Souhaits des clients (CRUD backend) */}
              {!detailLoading && selectedCard === 'souhaits' && (
                isGrossiste ? (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#1e3a2f' }}>💰 Stock des grossistes</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 12, color: '#636e72' }}>
                      Prix modifiables — toute modification est enregistrée et notifiée au CEO.
                    </p>
                    {clients.length === 0 ? (
                      <div style={{ color: '#bbb', textAlign: 'center', padding: 20, fontSize: 13 }}>
                        Aucun client (grossiste) enregistré. Ajoutez-en dans "Mes clients".
                      </div>
                    ) : (
                      clients.flatMap(c => (c.produits || []).map((p, i) => ({ c, p, i }))).length === 0 ? (
                        <div style={{ color: '#bbb', textAlign: 'center', padding: 20, fontSize: 13 }}>
                          Aucun produit enregistré dans les fiches clients.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead><tr style={{ background: '#f8f9fa' }}>
                            {['Grossiste', 'Produit', 'Qté', 'Prix actuel', 'Nouveau prix', ''].map(h => <th key={h} style={detTh}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {clients.flatMap(c =>
                              (c.produits || []).map((p, i) => {
                                const key = `${c.id}_${i}`;
                                const editVal = stockEdits[key];
                                const isSaved = stockSaved[key];
                                const isSaving = stockSaving === key;
                                const prodNom = p.nom || p.type || p.produit || `Produit ${i + 1}`;
                                return (
                                  <tr key={key} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ ...detTd, fontWeight: 600 }}>{c.nom}</td>
                                    <td style={detTd}>{prodNom}</td>
                                    <td style={detTd}>{p.quantite || '—'}</td>
                                    <td style={{ ...detTd, fontWeight: 700, color: '#e65100' }}>
                                      {p.prix ? `${Number(p.prix).toLocaleString('fr')} FCFA` : '—'}
                                    </td>
                                    <td style={detTd}>
                                      <input
                                        type="number" min="0" step="any"
                                        value={editVal !== undefined ? editVal : (p.prix || '')}
                                        onChange={e => handlePrixChange(c.id, i, e.target.value)}
                                        style={{ width: 110, padding: '5px 8px', borderRadius: 6, border: `1px solid ${editVal !== undefined && parseFloat(editVal) !== parseFloat(p.prix || 0) ? '#ff9800' : '#e0e0e0'}`, fontSize: 13, fontWeight: editVal !== undefined ? 700 : 400 }}
                                      />
                                    </td>
                                    <td style={detTd}>
                                      {isSaved ? (
                                        <span style={{ color: '#4caf7d', fontWeight: 700, fontSize: 12 }}>✓ CEO notifié</span>
                                      ) : editVal !== undefined && parseFloat(editVal) !== parseFloat(p.prix || 0) ? (
                                        <button onClick={() => savePrix(c, i)} disabled={isSaving}
                                          style={{ padding: '5px 10px', borderRadius: 6, background: '#ff9800', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                                          {isSaving ? '…' : '💾 Sauv.'}
                                        </button>
                                      ) : null}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      )
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1e3a2f' }}>💬 Souhaits des clients</h3>
                    {/* Formulaire d'ajout */}
                    <form onSubmit={addSouhait} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20, padding: 16, background: '#f8f9fa', borderRadius: 10 }}>
                      <div>
                        <label style={detLbl}>Nom du client</label>
                        <input required value={souhaitForm.client} onChange={e => setSouhaitForm(f => ({ ...f, client: e.target.value }))} style={detInp} placeholder="ex: Mme Abena" />
                      </div>
                      <div>
                        <label style={detLbl}>Produit souhaité</label>
                        <input required value={souhaitForm.produit} onChange={e => setSouhaitForm(f => ({ ...f, produit: e.target.value }))} style={detInp} placeholder="ex: Tomates fraîches" />
                      </div>
                      <div>
                        <label style={detLbl}>Quantité / Détail</label>
                        <input value={souhaitForm.quantite} onChange={e => setSouhaitForm(f => ({ ...f, quantite: e.target.value }))} style={detInp} placeholder="ex: 10 kg, 2 caisses" />
                      </div>
                      <div>
                        <label style={detLbl}>Notes</label>
                        <input value={souhaitForm.notes} onChange={e => setSouhaitForm(f => ({ ...f, notes: e.target.value }))} style={detInp} placeholder="ex: urgent, avant vendredi" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button type="submit" disabled={souhaitSaving} style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: '#4caf7d', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                          {souhaitSaving ? '…' : '+ Ajouter'}
                        </button>
                      </div>
                    </form>

                    {/* Liste avec édition inline quantité + notes */}
                    {souhaits.length === 0
                      ? <div style={{ color: '#bbb', textAlign: 'center', padding: 20, fontSize: 13 }}>Aucun souhait enregistré.</div>
                      : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead><tr style={{ background: '#f8f9fa' }}>
                            {['Date', 'Client', 'Produit', 'Quantité', 'Notes', ''].map(h => <th key={h} style={detTh}>{h}</th>)}
                          </tr></thead>
                          <tbody>
                            {souhaits.map(s => {
                              const edit = souhaitEdits[s.id] || {};
                              const qVal  = edit.quantite !== undefined ? edit.quantite : (s.quantite || '');
                              const nVal  = edit.notes    !== undefined ? edit.notes    : (s.notes    || '');
                              const dirty = edit.quantite !== undefined || edit.notes !== undefined;
                              const saving = souhaitEditSaving === s.id;
                              return (
                                <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                  <td style={detTd}>{(s.created_at || '').slice(0, 10)}</td>
                                  {/* Client — lecture seule */}
                                  <td style={{ ...detTd, fontWeight: 600 }}>{s.client_nom || '—'}</td>
                                  {/* Produit — lecture seule */}
                                  <td style={detTd}>{s.produit || '—'}</td>
                                  {/* Quantité — éditable */}
                                  <td style={detTd}>
                                    <input
                                      value={qVal}
                                      onChange={e => handleSouhaitEdit(s.id, 'quantite', e.target.value)}
                                      style={{ width: 100, padding: '4px 7px', borderRadius: 6,
                                               border: `1px solid ${edit.quantite !== undefined ? '#ff9800' : '#e0e0e0'}`,
                                               fontSize: 13, fontWeight: edit.quantite !== undefined ? 700 : 400 }}
                                      placeholder="ex: 5 kg"
                                    />
                                  </td>
                                  {/* Notes — éditable */}
                                  <td style={detTd}>
                                    <input
                                      value={nVal}
                                      onChange={e => handleSouhaitEdit(s.id, 'notes', e.target.value)}
                                      style={{ width: 140, padding: '4px 7px', borderRadius: 6,
                                               border: `1px solid ${edit.notes !== undefined ? '#ff9800' : '#e0e0e0'}`,
                                               fontSize: 13, fontWeight: edit.notes !== undefined ? 700 : 400 }}
                                      placeholder="notes…"
                                    />
                                  </td>
                                  <td style={{ ...detTd, display: 'flex', gap: 6, alignItems: 'center' }}>
                                    {dirty && (
                                      <button onClick={() => saveSouhait(s)} disabled={saving}
                                        style={{ padding: '3px 10px', borderRadius: 6, background: '#ff9800', border: 'none', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                                        {saving ? '…' : '💾'}
                                      </button>
                                    )}
                                    <button onClick={() => deleteSouhait(s.id)}
                                      style={{ padding: '3px 8px', borderRadius: 5, background: '#ffebee', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 11 }}>✕</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                    }
                  </div>
                )
              )}

              {/* CARD 2: 'produits'
                  Grossiste → Revendeurs clients (fiches, lecture seule)
                  Revendeur → Grossistes disponibles (fiches, lecture seule) */}
              {!detailLoading && selectedCard === 'produits' && (
                isGrossiste ? (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#1e3a2f' }}>🏪 Revendeurs clients</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 12, color: '#636e72' }}>
                      Liste des clients revendeurs enregistrés par les agents CC Revendeur — lecture seule.
                    </p>
                    {revendeurClients.length === 0
                      ? <div style={{ color: '#bbb', textAlign: 'center', padding: 20, fontSize: 13 }}>Aucun revendeur enregistré par les CC Revendeurs.</div>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {revendeurClients.map(r => (
                            <div key={r.id} style={{
                              border: '1.5px solid #f3e5f5', borderRadius: 12, padding: '14px 16px',
                              background: '#fdf8ff',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e3a2f' }}>{r.nom}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>
                                  Agent : {r.agent_prenom || r.agent_nom || r.cc_email?.split('@')[0] || '—'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 12, color: '#555', marginBottom: r.produits?.length ? 10 : 0 }}>
                                {r.telephone && <span>📞 {r.telephone}</span>}
                                {r.adresse && <span>📍 {r.adresse}</span>}
                                {r.date_ravitaillement && <span>📅 Dernier ravit. : {r.date_ravitaillement}</span>}
                                {r.prochaine_date && <span>🔜 Prochain : {r.prochaine_date}</span>}
                                {r.notes && <span style={{ color: '#636e72', fontStyle: 'italic' }}>💬 {r.notes}</span>}
                              </div>
                              {r.produits?.length > 0 && (
                                <div style={{ marginTop: 6 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9c27b0', textTransform: 'uppercase', marginBottom: 6 }}>
                                    Produits achetés ({r.produits.length})
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {r.produits.map((p, idx) => (
                                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#faf0ff', borderRadius: 8, padding: '6px 10px', border: '1px solid #e8d5f5' }}>
                                        {p.image
                                          ? <img src={p.image} alt={p.nom} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #ce93d8', flexShrink: 0 }} />
                                          : <div style={{ width: 40, height: 40, borderRadius: 6, background: '#e8d5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>
                                        }
                                        <div>
                                          <div style={{ fontWeight: 700, fontSize: 12, color: '#1e3a2f' }}>{p.nom || '—'}</div>
                                          <div style={{ fontSize: 11, color: '#636e72' }}>{p.quantite ?? '—'} u.</div>
                                          <div style={{ fontSize: 11, color: '#7b1fa2', fontWeight: 700 }}>{p.prix ? `${Number(p.prix).toLocaleString('fr')} FCFA` : '—'}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                ) : (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#1e3a2f' }}>✅ Grossistes disponibles</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 12, color: '#636e72' }}>
                      Liste des clients grossistes enregistrés par les agents CC Grossiste — lecture seule.
                    </p>
                    {grossisteClients.length === 0
                      ? <div style={{ color: '#bbb', textAlign: 'center', padding: 20, fontSize: 13 }}>Aucun grossiste enregistré par les CC Grossistes.</div>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {grossisteClients.map(g => (
                            <div key={g.id} style={{
                              border: '1.5px solid #e8f5e9', borderRadius: 12, padding: '14px 16px',
                              background: '#f9fffe',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e3a2f' }}>{g.nom}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>
                                  Agent : {g.agent_prenom || g.agent_nom || g.cc_email?.split('@')[0] || '—'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 12, color: '#555', marginBottom: g.produits?.length ? 10 : 0 }}>
                                {g.telephone && <span>📞 {g.telephone}</span>}
                                {g.adresse && <span>📍 {g.adresse}</span>}
                                {g.date_ravitaillement && <span>📅 Dernier ravit. : {g.date_ravitaillement}</span>}
                                {g.prochaine_date && <span>🔜 Prochain : {g.prochaine_date}</span>}
                                {g.notes && <span style={{ color: '#636e72', fontStyle: 'italic' }}>💬 {g.notes}</span>}
                              </div>
                              {g.produits?.length > 0 && (
                                <div style={{ marginTop: 6 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#4caf7d', textTransform: 'uppercase', marginBottom: 6 }}>
                                    Produits ({g.produits.length})
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {g.produits.map((p, idx) => (
                                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0faf4', borderRadius: 8, padding: '6px 10px', border: '1px solid #c8e6c9' }}>
                                        {p.image
                                          ? <img src={p.image} alt={p.nom} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #a5d6a7', flexShrink: 0 }} />
                                          : <div style={{ width: 40, height: 40, borderRadius: 6, background: '#c8e6c9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>
                                        }
                                        <div>
                                          <div style={{ fontWeight: 700, fontSize: 12, color: '#1e3a2f' }}>{p.nom || '—'}</div>
                                          <div style={{ fontSize: 11, color: '#636e72' }}>{p.quantite ?? '—'} u. restantes</div>
                                          <div style={{ fontSize: 11, color: '#2e7d32', fontWeight: 700 }}>{p.prix ? `${Number(p.prix).toLocaleString('fr')} FCFA` : '—'}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                )
              )}

              {/* CARD 3: 'ventes'
                  Grossiste → Ventes en cours (confirm/reject)
                  Revendeur → Débuter une vente (form) */}
              {!detailLoading && selectedCard === 'ventes' && (
                isGrossiste ? (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#1e3a2f' }}>🔔 Ventes en cours — à confirmer</h3>
                    <p style={{ margin: '0 0 18px', fontSize: 12, color: '#636e72' }}>
                      Ces ventes ont été initiées par un agent CC Revendeur et attendent votre confirmation avant d'aller au CEO.
                    </p>
                    {ventesEnAttente.length === 0
                      ? <div style={{ color: '#bbb', textAlign: 'center', padding: 30, fontSize: 13 }}>Aucune vente en attente de confirmation.</div>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {ventesEnAttente.map(o => {
                            const p = o.produit || {};
                            return (
                              <div key={o.id} style={{
                                padding: '14px 16px', borderRadius: 12, background: '#fff8e1',
                                border: '1.5px solid #ffd54f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
                              }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1e3a2f' }}>
                                    {p.type} — {p.variete}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#636e72', marginTop: 3 }}>
                                    Revendeur : <strong>{o.revendeur_email}</strong> · Qté : <strong>{p.quantite}</strong> · {Number(p.prix || 0).toLocaleString('fr')} FCFA/u
                                  </div>
                                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                                    Agent CC : {p.initiated_by || '—'} · {(o.commande_at || '').slice(0, 10)}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button onClick={() => handleConfirmVente(o.id)} disabled={confirmingVenteId === o.id}
                                    style={{ padding: '8px 18px', borderRadius: 8, background: '#4caf7d', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                    {confirmingVenteId === o.id ? '…' : '✓ Confirmer'}
                                  </button>
                                  <button onClick={() => handleRejectVente(o.id)} disabled={confirmingVenteId === o.id}
                                    style={{ padding: '8px 18px', borderRadius: 8, background: '#ffebee', border: 'none', color: '#c0392b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                                    {confirmingVenteId === o.id ? '…' : '✕ Refuser'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                    }
                  </div>
                ) : (
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, color: '#1e3a2f' }}>🚀 Débuter une vente</h3>
                    <p style={{ margin: '0 0 18px', fontSize: 12, color: '#636e72' }}>
                      La vente sera transmise au CC Grossiste pour confirmation, puis au CEO pour validation finale.
                    </p>

                    {venteSuccess && (
                      <div style={{ padding: '12px 16px', borderRadius: 10, background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#2e7d32', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
                        ✅ Vente soumise — l'agent CC Grossiste concerné va être notifié pour confirmation.
                        <button onClick={() => setVenteSuccess(false)} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#2e7d32', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Nouvelle vente</button>
                      </div>
                    )}

                    {!venteSuccess && (
                      <form onSubmit={handleStartVente}>
                        {/* Étape 1 : Sélection du client revendeur */}
                        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a2f', marginBottom: 10 }}>
                            1️⃣ Sélectionner le client (revendeur)
                          </div>
                          {clients.length === 0
                            ? <div style={{ fontSize: 12, color: '#bbb' }}>Aucun client enregistré. Ajoutez-en dans "Mes clients".</div>
                            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {clients.map(c => (
                                  <button key={c.id} type="button" onClick={() => setVenteClient(`${c.nom} (${c.telephone || 'sans tel'})`)}
                                    style={{
                                      padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                      background: venteClient === `${c.nom} (${c.telephone || 'sans tel'})` ? '#ff9800' : '#fff',
                                      color:      venteClient === `${c.nom} (${c.telephone || 'sans tel'})` ? '#fff' : '#1e3a2f',
                                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                    }}>
                                    {c.nom}
                                    {venteClient === `${c.nom} (${c.telephone || 'sans tel'})` && ' ✓'}
                                  </button>
                                ))}
                              </div>
                          }
                        </div>

                        {/* Étape 2 : Sélection du produit grossiste */}
                        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a2f', marginBottom: 10 }}>
                            2️⃣ Sélectionner le produit du grossiste
                          </div>
                          {ventesDetail.length === 0
                            ? <div style={{ fontSize: 12, color: '#bbb' }}>Aucun produit disponible actuellement.</div>
                            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                                {ventesDetail.map((v, i) => {
                                  const isSelected = venteVente?.id === v.id;
                                  return (
                                    <div key={v.id || i} onClick={() => setVenteVente(v)}
                                      style={{
                                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                                        background: isSelected ? '#fff3e0' : '#fff',
                                        border: isSelected ? '2px solid #ff9800' : '1px solid #e9ecef',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                      }}>
                                      <div>
                                        <span style={{ fontWeight: 700, fontSize: 13 }}>{v.type} — {v.variete}</span>
                                        <span style={{ fontSize: 11, color: '#636e72', marginLeft: 8 }}>Grossiste : {v.grossiste_email?.split('@')[0] || v.grossiste_email}</span>
                                      </div>
                                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, color: '#ff9800', fontSize: 13 }}>{Number(v.prix || 0).toLocaleString('fr')} FCFA</span>
                                        <span style={{ fontSize: 11, color: '#636e72' }}>Stock : {v.quantite ?? '?'}</span>
                                        {isSelected && <span style={{ fontSize: 16 }}>✓</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                          }
                        </div>

                        {/* Étape 3 : Quantité */}
                        <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16, marginBottom: 18 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a2f', marginBottom: 10 }}>
                            3️⃣ Quantité souhaitée par le revendeur
                          </div>
                          <input
                            type="number" min="1" required
                            value={venteQte}
                            onChange={e => setVenteQte(e.target.value)}
                            style={{ width: 160, padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, fontWeight: 700 }}
                            placeholder="ex: 50"
                          />
                          {venteVente && venteQte && (
                            <span style={{ marginLeft: 14, fontSize: 13, color: '#ff9800', fontWeight: 700 }}>
                              Total estimé : {(Number(venteQte) * Number(venteVente.prix || 0)).toLocaleString('fr')} FCFA
                            </span>
                          )}
                        </div>

                        {venteClient && venteVente && venteQte && (
                          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fff8e1', border: '1px solid #ffe082', marginBottom: 16, fontSize: 13 }}>
                            <strong>📋 Récapitulatif :</strong> {venteClient} — {venteVente.type} / {venteVente.variete} — {venteQte} unités @ {Number(venteVente.prix || 0).toLocaleString('fr')} FCFA
                            <span style={{ marginLeft: 8, color: '#e65100', fontWeight: 700 }}>⚠️ Confirmation CC Grossiste + CEO requise</span>
                          </div>
                        )}

                        <button type="submit" disabled={venteSaving || !venteClient || !venteVente || !venteQte}
                          style={{
                            padding: '11px 28px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                            background: (!venteClient || !venteVente || !venteQte) ? '#e0e0e0' : '#ff9800',
                            color: (!venteClient || !venteVente || !venteQte) ? '#aaa' : '#fff',
                          }}>
                          {venteSaving ? 'Envoi en cours…' : '🚀 Démarrer la vente'}
                        </button>
                      </form>
                    )}
                  </div>
                )
              )}

              {/* CHIFFRE D'AFFAIRES */}
              {!detailLoading && selectedCard === 'ca' && (
                <div>
                  <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1e3a2f' }}>📊 Détail du chiffre d'affaires</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    {[
                      { label: 'CA total secteur', value: trends.chiffre_affaires, color: '#9c27b0' },
                      { label: 'Produits actifs', value: trends.produits_actifs, color: '#4caf7d', unit: 'produits' },
                      { label: 'Produits disponibles', value: trends.produits_disponibles, color: '#2196f3', unit: 'produits' },
                      { label: 'Ventes actives', value: trends.ventes_actives, color: '#ff9800', unit: 'ventes' },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#f8f9fa', borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${item.color}` }}>
                        <div style={{ fontSize: 12, color: '#636e72', marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>
                          {item.unit ? `${item.value ?? 0} ${item.unit}` : `${(item.value || 0).toLocaleString('fr')} FCFA`}
                        </div>
                      </div>
                    ))}
                  </div>
                  {trends.top_produits?.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#636e72', marginBottom: 10 }}>🔥 Top produits les plus demandés</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr style={{ background: '#f8f9fa' }}>
                          {['#', 'Type', 'Variété', 'Nb offres', 'Prix moyen'].map(h => <th key={h} style={detTh}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {trends.top_produits.map((p, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                              <td style={detTd}><span style={{ fontWeight: 700, color: '#9c27b0' }}>{i + 1}</span></td>
                              <td style={{ ...detTd, fontWeight: 600 }}>{p.type || '—'}</td>
                              <td style={detTd}>{p.variete || '—'}</td>
                              <td style={detTd}>{p.nb}</td>
                              <td style={detTd}>{p.prix_moy ? `${Number(p.prix_moy).toLocaleString('fr')} FCFA` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selected.produits.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f9fa', borderRadius: 8, padding: '8px 12px', border: '1px solid #e8e8e8', minWidth: 160 }}>
                        {p.image
                          ? <img src={p.image} alt={p.nom} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', flexShrink: 0 }} />
                          : <div style={{ width: 44, height: 44, borderRadius: 6, background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📦</div>
                        }
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a2f' }}>{p.nom}</div>
                          <div style={{ fontSize: 12, color: '#636e72' }}>{p.prix ? `${Number(p.prix).toLocaleString('fr')} FCFA` : '—'}</div>
                          <span style={{
                            padding: '1px 8px', borderRadius: 10, fontSize: 11,
                            background: p.quantite <= 5 ? '#ffebee' : '#f0fff4',
                            color: p.quantite <= 5 ? '#c0392b' : '#2d6a4f',
                            fontWeight: 700,
                          }}>
                            {p.quantite ?? '—'} restants
                          </span>
                        </div>
                    ))}
                  </div>
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

      {/* ── DÉPENSES ── */}
      {!loading && tab === 'depenses' && (
        <div>
          {/* Sélecteur de contexte */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {[
              { k: 'vente',  icon: '🛒', label: 'Vente en cours' },
              { k: 'visite', icon: '🏃', label: 'Visite d\'un client' },
            ].map(c => (
              <button key={c.k} onClick={() => setDepCtx(c.k)} style={{
                padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14,
                background: depCtx === c.k ? '#1e3a2f' : '#f0f0f0',
                color: depCtx === c.k ? '#fff' : '#636e72',
              }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Formulaire de saisie */}
          <form onSubmit={saveDepense} style={{
            background: '#fff', borderRadius: 12, padding: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#1e3a2f' }}>
              {depCtx === 'vente' ? '🛒 Dépenses — Vente en cours' : '🏃 Dépenses — Visite client'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {/* Transport */}
              <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a2f', marginBottom: 10 }}>🚗 Transport</div>
                <div style={{ marginBottom: 8 }}>
                  <label style={depLabel}>Montant (FCFA)</label>
                  <input type="number" min="0" value={depForm.transport} onChange={e => setDepForm(f => ({ ...f, transport: e.target.value }))} style={depInput} placeholder="0" />
                </div>
                <div>
                  <label style={depLabel}>{depCtx === 'vente' ? 'Trajet (de … à …)' : 'Détail trajet'}</label>
                  <input type="text" value={depForm.transport_detail} onChange={e => setDepForm(f => ({ ...f, transport_detail: e.target.value }))} style={depInput} placeholder={depCtx === 'vente' ? 'ex: Marché central → Client Mballa' : 'ex: Quartier Bastos → Client Abena'} />
                </div>
              </div>

              {/* Communication */}
              <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a2f', marginBottom: 10 }}>📱 Communication</div>
                <div style={{ marginBottom: 8 }}>
                  <label style={depLabel}>Montant (FCFA)</label>
                  <input type="number" min="0" value={depForm.communication} onChange={e => setDepForm(f => ({ ...f, communication: e.target.value }))} style={depInput} placeholder="0" />
                </div>
                <div>
                  <label style={depLabel}>{depCtx === 'vente' ? 'Frais internet / appel' : 'Détail (appels, internet…)'}</label>
                  <input type="text" value={depForm.communication_detail} onChange={e => setDepForm(f => ({ ...f, communication_detail: e.target.value }))} style={depInput} placeholder={depCtx === 'vente' ? 'ex: Forfait internet 500 FCFA' : 'ex: Appels clients x3'} />
                </div>
              </div>

              {/* Imprévu */}
              <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#1e3a2f', marginBottom: 10 }}>⚠️ Imprévu</div>
                <div style={{ marginBottom: 8 }}>
                  <label style={depLabel}>Montant (FCFA)</label>
                  <input type="number" min="0" value={depForm.imprevu} onChange={e => setDepForm(f => ({ ...f, imprevu: e.target.value }))} style={depInput} placeholder="0" />
                </div>
                <div>
                  <label style={depLabel}>Description</label>
                  <input type="text" value={depForm.imprevu_detail} onChange={e => setDepForm(f => ({ ...f, imprevu_detail: e.target.value }))} style={depInput} placeholder="ex: Réparation moto, aide urgence…" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={depSaving} style={{
              marginTop: 16, padding: '10px 24px', borderRadius: 8, border: 'none',
              background: '#4caf7d', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>
              {depSaving ? 'Enregistrement…' : '💾 Enregistrer les dépenses'}
            </button>
          </form>

          {/* Historique */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: '#1e3a2f' }}>📋 Historique de mes dépenses</h3>
              {depenses.length > 0 && (
                <span style={{ fontSize: 13, fontWeight: 700, color: '#e53935' }}>
                  Total : {depenses.reduce((s, d) => s + parseFloat(d.montant || 0), 0).toLocaleString('fr')} FCFA
                </span>
              )}
            </div>
            {depenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#bbb', fontSize: 14 }}>Aucune dépense enregistrée.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    {['Date', 'Contexte', 'Catégorie', 'Description', 'Montant', ''].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: '#636e72', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {depenses.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '9px 12px' }}>{d.date}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                          background: d.niveau === 'vente' ? '#e8f5e9' : '#fce4ec',
                          color: d.niveau === 'vente' ? '#2e7d32' : '#c62828',
                        }}>
                          {d.niveau === 'vente' ? '🛒 Vente' : '🏃 Visite'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', textTransform: 'capitalize' }}>{d.categorie}</td>
                      <td style={{ padding: '9px 12px', color: '#636e72' }}>{d.description?.replace(/^\[.*?\] /, '')}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#e53935' }}>
                        {parseFloat(d.montant).toLocaleString('fr')} FCFA
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <button onClick={() => deleteDepense(d.id)} style={{ padding: '2px 7px', borderRadius: 5, background: '#ffebee', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 11 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
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
  const [newProd, setNewProd] = useState({ nom: '', prix: '', quantite: '', image: '' });
  const newProdImgRef = React.useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addProduit() {
    if (!newProd.nom.trim()) return;
    set('produits', [...form.produits, { ...newProd, quantite: Number(newProd.quantite) || 0, prix: Number(newProd.prix) || 0 }]);
    setNewProd({ nom: '', prix: '', quantite: '', image: '' });
    if (newProdImgRef.current) newProdImgRef.current.value = '';
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
    if (!form.nom.trim())              return alert('Le nom est requis.');
    if (!form.telephone.trim())        return alert('Le téléphone est requis.');
    if (!form.adresse.trim())          return alert('L\'adresse est requise.');
    if (!form.date_ravitaillement)     return alert('La date du dernier ravitaillement est requise.');
    if (!form.prochaine_date)          return alert('La date du prochain ravitaillement est requise.');
    if (!form.produits.length)         return alert('Ajoutez au moins un produit vendu.');
    if (!form.notes.trim())            return alert('Les notes commerciales sont requises.');
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
            <MField label="Téléphone *" value={form.telephone} onChange={v => set('telephone', v)} type="tel" />
            <MField label="Adresse *" value={form.adresse} onChange={v => set('adresse', v)} />
          </div>
          <MField label="Géolocalisation (ex: lien WhatsApp)" value={form.geolocation} onChange={v => set('geolocation', v)} placeholder="https://maps.google.com/..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MField label="Dernier ravitaillement *" value={form.date_ravitaillement} onChange={v => set('date_ravitaillement', v)} type="date" />
            <MField label="Prochain ravitaillement *" value={form.prochaine_date} onChange={v => set('prochaine_date', v)} type="date" />
          </div>

          {/* Produits */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#636e72', textTransform: 'uppercase', marginBottom: 8 }}>
              Produits vendus *
            </div>
            {form.produits.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, background: '#f8f9fa', borderRadius: 8, padding: '8px 10px' }}>
                {p.image
                  ? <img src={p.image} alt={p.nom} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #e0e0e0', flexShrink: 0 }} />
                  : <div style={{ width: 44, height: 44, borderRadius: 6, background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📦</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
                  <div style={{ fontSize: 12, color: '#636e72' }}>{p.prix ? `${Number(p.prix).toLocaleString('fr')} FCFA` : '—'}</div>
                </div>
                <input type="number" value={p.quantite} min="0"
                  onChange={e => updateProduitQty(i, e.target.value)}
                  placeholder="Qté"
                  style={{ width: 70, padding: '4px 6px', borderRadius: 6, border: '1px solid #e0e0e0', fontSize: 13 }} />
                <label style={{ cursor: 'pointer', fontSize: 18, title: 'Changer la photo' }} title="Changer la photo">
                  📷
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        const copy = [...form.produits];
                        copy[i] = { ...copy[i], image: ev.target.result };
                        set('produits', copy);
                      };
                      reader.readAsDataURL(file);
                    }} />
                </label>
                <button onClick={() => removeProduit(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            ))}
            {/* Ligne d'ajout nouveau produit */}
            <div style={{ background: '#f0faf4', borderRadius: 8, padding: '10px 10px', marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4caf7d', textTransform: 'uppercase', marginBottom: 8 }}>+ Nouveau produit</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <input value={newProd.nom} onChange={e => setNewProd(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Nom du produit *" style={{ ...inputSm, flex: 1, minWidth: 100 }} />
                <input value={newProd.prix} onChange={e => setNewProd(p => ({ ...p, prix: e.target.value }))}
                  placeholder="Prix" type="number" style={{ ...inputSm, width: 80 }} />
                <input value={newProd.quantite} onChange={e => setNewProd(p => ({ ...p, quantite: e.target.value }))}
                  placeholder="Qté" type="number" style={{ ...inputSm, width: 65 }} />
                <button onClick={addProduit} style={{ padding: '6px 14px', borderRadius: 6, background: '#4caf7d', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+</button>
              </div>
              {/* Photo échantillon */}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#4caf7d', fontWeight: 600, padding: '5px 10px', borderRadius: 6, border: '1.5px dashed #4caf7d', background: '#fff' }}>
                  📷 Photo échantillon
                  <input ref={newProdImgRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => setNewProd(p => ({ ...p, image: ev.target.result }));
                      reader.readAsDataURL(file);
                    }} />
                </label>
                {newProd.image && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img src={newProd.image} alt="échantillon" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #c8e6c9' }} />
                    <button onClick={() => { setNewProd(p => ({ ...p, image: '' })); if (newProdImgRef.current) newProdImgRef.current.value = ''; }}
                      style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <MField label="Notes commerciales *" value={form.notes} onChange={v => set('notes', v)}
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
function StatCard({ icon, label, value, color, onClick, active }) {
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 12, padding: '16px 18px',
      boxShadow: active ? `0 0 0 2px ${color}, 0 4px 16px rgba(0,0,0,0.12)` : '0 2px 8px rgba(0,0,0,0.06)',
      borderLeft: `4px solid ${color}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow .15s, transform .1s',
      transform: active ? 'translateY(-2px)' : 'none',
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#636e72', marginTop: 2 }}>{label}</div>
      {onClick && <div style={{ fontSize: 10, color: active ? color : '#bbb', marginTop: 4, fontWeight: 600 }}>{active ? '▲ Masquer' : '▼ Voir détail'}</div>}
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
const depLabel = { fontSize: 11, fontWeight: 600, color: '#636e72', display: 'block', marginBottom: 3 };
const depInput = { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, boxSizing: 'border-box' };
const detLbl = { fontSize: 11, fontWeight: 600, color: '#636e72', display: 'block', marginBottom: 3 };
const detInp = { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e0e0e0', fontSize: 13, boxSizing: 'border-box' };
const detTh  = { textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#636e72', fontSize: 12 };
const detTd  = { padding: '8px 12px' };
