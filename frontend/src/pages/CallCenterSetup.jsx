import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const SECTORS = {
  'Cosmétique':              ['Femme', 'Homme', 'Huile', 'Parfum', 'Maquillage'],
  'Alimentaire':             ['Produits frais', 'Conserves', 'Pâtisserie', 'Boissons'],
  'Appareils électroniques': ['Téléphone', 'Télévision', 'Électroménager', 'Accessoires'],
  'Vêtements':               ['Femme', 'Homme', 'Chaussures', 'Robes', 'Pantalons', 'Ceintures'],
  'Accessoires maison':      ['Cuisine', 'Salon', 'Douche', 'Savon ménager'],
};

const STEPS = ['Informations', 'Secteur commercial', 'Orientation'];

export default function CallCenterSetup() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    prenom: user?.prenom || '',
    telephone: '',
    ville: '',
    password: '',
    password2: '',
    secteur_principal: '',
    secteur_secondaire: '',
    orientation: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validateStep() {
    if (step === 0) {
      if (!form.prenom.trim())    return 'Le prénom est requis.';
      if (!form.telephone.trim()) return 'Le téléphone est requis.';
      if (!form.ville.trim())     return 'La ville est requise.';
      if (form.password && form.password.length < 6) return 'Mot de passe minimum 6 caractères.';
      if (form.password !== form.password2)           return 'Les mots de passe ne correspondent pas.';
    }
    if (step === 1) {
      if (!form.secteur_principal)  return 'Choisissez un secteur principal.';
      if (!form.secteur_secondaire) return 'Choisissez une sous-catégorie.';
    }
    if (step === 2) {
      if (!form.orientation) return 'Choisissez une orientation commerciale.';
    }
    return '';
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  }

  async function submit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      await api.ccSaveProfile({
        email: user.email,
        prenom: form.prenom,
        telephone: form.telephone,
        ville: form.ville,
        secteur_principal: form.secteur_principal,
        secteur_secondaire: form.secteur_secondaire,
        orientation: form.orientation,
        password: form.password || undefined,
      });
      login({ ...user, prenom: form.prenom, profile_complete: true });
      navigate('/cc-dashboard', { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const subcategories = SECTORS[form.secteur_principal] || [];

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a2f 0%,#2d5a45 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36 }}>🌱</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 4 }}>Facilitar</div>
          <div style={{ fontSize: 14, color: '#a0c4ad', marginTop: 4 }}>Configuration de votre profil</div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, fontWeight: 700,
                background: i < step ? '#4caf7d' : i === step ? '#fff' : 'rgba(255,255,255,0.2)',
                color: i < step ? '#fff' : i === step ? '#1e3a2f' : 'rgba(255,255,255,0.5)',
                border: i === step ? '2px solid #4caf7d' : 'none',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 10, color: i === step ? '#4caf7d' : 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'center' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: '28px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 18, color: '#1e3a2f' }}>
            {step === 0 && '👤 Informations personnelles'}
            {step === 1 && '🏷️ Secteur commercial'}
            {step === 2 && '🎯 Orientation commerciale'}
          </h2>

          {/* Step 0 */}
          {step === 0 && (
            <div style={{ display: 'grid', gap: 14 }}>
              <Field label="Prénom *" value={form.prenom} onChange={v => set('prenom', v)} placeholder="Votre prénom" />
              <Field label="Téléphone *" value={form.telephone} onChange={v => set('telephone', v)} placeholder="+237 6XX XXX XXX" type="tel" />
              <Field label="Ville *" value={form.ville} onChange={v => set('ville', v)} placeholder="Ex: Yaoundé, Douala..." />
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: '#636e72', marginBottom: 10 }}>
                  Changer de mot de passe (optionnel)
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <Field label="Nouveau mot de passe" value={form.password} onChange={v => set('password', v)} type="password" placeholder="Laisser vide pour garder l'actuel" autoComplete="new-password" />
                  <Field label="Confirmer" value={form.password2} onChange={v => set('password2', v)} type="password" placeholder="Répéter le mot de passe" autoComplete="new-password" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={labelStyle}>Secteur principal *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                  {Object.keys(SECTORS).map(s => (
                    <button key={s} onClick={() => { set('secteur_principal', s); set('secteur_secondaire', ''); }}
                      style={{
                        padding: '10px 8px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                        border: form.secteur_principal === s ? '2px solid #4caf7d' : '1px solid #e0e0e0',
                        background: form.secteur_principal === s ? '#f0fff4' : '#fafafa',
                        color: form.secteur_principal === s ? '#1e3a2f' : '#495057',
                        fontWeight: form.secteur_principal === s ? 700 : 400,
                        textAlign: 'center', transition: 'all .15s',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {form.secteur_principal && (
                <div>
                  <label style={labelStyle}>Sous-catégorie *</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {subcategories.map(sc => (
                      <button key={sc} onClick={() => set('secteur_secondaire', sc)}
                        style={{
                          padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                          border: form.secteur_secondaire === sc ? '2px solid #4caf7d' : '1px solid #e0e0e0',
                          background: form.secteur_secondaire === sc ? '#4caf7d' : '#fff',
                          color: form.secteur_secondaire === sc ? '#fff' : '#495057',
                          fontWeight: form.secteur_secondaire === sc ? 700 : 400,
                          transition: 'all .15s',
                        }}>
                        {sc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#636e72' }}>
                Choisissez votre orientation commerciale principale.
              </p>
              {[
                { val: 'Revendeur', icon: '🏪', desc: 'Vous vendez directement aux consommateurs finaux' },
                { val: 'Grossiste', icon: '🏭', desc: 'Vous vendez en grandes quantités à des revendeurs' },
              ].map(o => (
                <button key={o.val} onClick={() => set('orientation', o.val)}
                  style={{
                    padding: 16, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: form.orientation === o.val ? '2px solid #4caf7d' : '1px solid #e0e0e0',
                    background: form.orientation === o.val ? '#f0fff4' : '#fafafa',
                    transition: 'all .15s',
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{o.icon}</div>
                  <div style={{ fontWeight: 700, color: '#1e3a2f', fontSize: 15 }}>{o.val}</div>
                  <div style={{ fontSize: 12, color: '#636e72', marginTop: 2 }}>{o.desc}</div>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: '8px 12px', background: '#fff5f5', borderRadius: 8, color: '#c0392b', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button onClick={() => { setError(''); setStep(s => s - 1); }} style={btnSecondary}>
                ← Retour
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={next} style={{ ...btnPrimary, flex: 1 }}>
                Suivant →
              </button>
            ) : (
              <button onClick={submit} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
                {saving ? 'Enregistrement…' : '✓ Terminer la configuration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', autoComplete = 'off' }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14, marginTop: 4,
          border: '1px solid #e0e0e0', outline: 'none', boxSizing: 'border-box',
          background: '#fafafa',
        }}
      />
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 600, color: '#495057', textTransform: 'uppercase', letterSpacing: '0.5px' };

const btnPrimary = {
  padding: '11px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14,
  background: '#4caf7d', color: '#fff', border: 'none', cursor: 'pointer',
};

const btnSecondary = {
  padding: '11px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14,
  background: '#f0f0f0', color: '#495057', border: 'none', cursor: 'pointer',
};
