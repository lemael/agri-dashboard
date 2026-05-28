import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', password: '', password2: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.nom || !form.prenom || !form.email || !form.password)
      return setError('Tous les champs obligatoires (*) doivent être remplis.');
    if (form.password.length < 6)
      return setError('Mot de passe minimum 6 caractères.');
    if (form.password !== form.password2)
      return setError('Les mots de passe ne correspondent pas.');

    setLoading(true);
    try {
      const res = await api.register({
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        telephone: form.telephone,
        password: form.password,
      });
      if (res.error) throw new Error(res.error);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a2f 0%, #2d5a45 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36 }}>🌱</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 4 }}>Facilitar</div>
          <div style={{ fontSize: 13, color: '#a0c4ad', marginTop: 4 }}>Créer un compte Call Center</div>
        </div>

        <div style={{
          background: '#fff', borderRadius: 16, padding: '28px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          {done ? (
            /* ── Succès ── */
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ margin: '0 0 12px', color: '#1e3a2f', fontSize: 18 }}>Compte créé avec succès !</h2>
              <p style={{ color: '#636e72', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
                Votre demande a été transmise à l'administrateur.<br />
                Vous recevrez une confirmation dès validation de votre compte.
              </p>
              <div style={{
                padding: '12px 16px', background: '#fff8e1', borderRadius: 8,
                fontSize: 13, color: '#856404', marginBottom: 20, textAlign: 'left',
              }}>
                ⏳ <strong>En attente de validation</strong> — L'équipe Facilitar examinera votre demande dans les plus brefs délais.
              </div>
              <Link to="/login" style={{
                display: 'block', padding: '11px 20px', borderRadius: 8, background: '#1e3a2f',
                color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center',
              }}>
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            /* ── Formulaire ── */
            <>
              <h2 style={{ margin: '0 0 20px', fontSize: 17, color: '#1e3a2f' }}>Informations du compte</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="Nom *" value={form.nom} onChange={v => set('nom', v)} placeholder="Nom de famille" />
                    <Field label="Prénom *" value={form.prenom} onChange={v => set('prenom', v)} placeholder="Prénom" />
                  </div>
                  <Field label="Email *" value={form.email} onChange={v => set('email', v)} placeholder="vous@email.com" type="email" />
                  <Field label="Téléphone" value={form.telephone} onChange={v => set('telephone', v)} placeholder="+237 6XX XXX XXX" type="tel" />
                  <Field label="Mot de passe *" value={form.password} onChange={v => set('password', v)} type="password" placeholder="Min. 6 caractères" />
                  <Field label="Confirmer le mot de passe *" value={form.password2} onChange={v => set('password2', v)} type="password" placeholder="Répéter le mot de passe" />
                </div>

                {error && (
                  <div style={{ marginTop: 14, padding: '9px 12px', background: '#fff5f5', borderRadius: 8, color: '#c0392b', fontSize: 13 }}>
                    ⚠️ {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{
                    width: '100%', marginTop: 20, padding: '12px', borderRadius: 8, border: 'none',
                    background: loading ? '#b2bec3' : '#4caf7d', color: '#fff',
                    fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  }}>
                  {loading ? 'Création…' : 'Créer mon compte'}
                </button>
              </form>

              <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#636e72' }}>
                Déjà un compte ?{' '}
                <Link to="/login" style={{ color: '#4caf7d', fontWeight: 600, textDecoration: 'none' }}>
                  Se connecter
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
          border: '1px solid #e0e0e0', outline: 'none', boxSizing: 'border-box',
          background: '#fafafa',
        }}
      />
    </div>
  );
}
