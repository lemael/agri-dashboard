import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const ROLE_LABELS = {
  ceo:         'CEO',
  comptable:   'Comptable',
  call_center: 'Call Center',
  marketing:   'Marketing',
  rh:          'Ressources Humaines',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (!res.ok) { setError(res.error); return; }
      login(res.user);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Impossible de contacter le serveur. Vérifiez que le backend tourne.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a2f 0%, #2d5a45 100%)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 48px', width: 380,
        boxShadow: '0 8px 32px rgba(0,0,0,.18)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40 }}>🌱</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3a2f', marginTop: 8 }}>Facilitar</div>
          <div style={{ fontSize: 13, color: '#636e72', marginTop: 4 }}>Tableau de bord — Connexion</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@facilitar.cm"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
                border: '1px solid #dee2e6', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#495057', display: 'block', marginBottom: 6 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
                border: '1px solid #dee2e6', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 8,
              background: '#f8d7da', color: '#721c24', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              background: loading ? '#b2bec3' : '#1e3a2f', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 28, padding: 16, background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#636e72' }}>
          <strong style={{ color: '#495057' }}>Comptes de démonstration :</strong>
          <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
            {[
              ['ceo@facilitar.cm', 'Admin1234', 'CEO'],
              ['comptable@facilitar.cm', 'Compta1234', 'Comptable'],
              ['cc1@facilitar.cm', 'CC1234', 'Call Center G1'],
              ['cc2@facilitar.cm', 'CC1234', 'Call Center G2'],
              ['marketing@facilitar.cm', 'Mkt1234', 'Marketing'],
              ['rh@facilitar.cm', 'RH1234', 'RH'],
            ].map(([e, p, label]) => (
              <div
                key={e}
                onClick={() => { setEmail(e); setPassword(p); }}
                style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6, background: '#e9ecef' }}
              >
                <strong>{label}</strong> — {e}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
