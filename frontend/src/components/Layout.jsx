import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ALL_LINKS = [
  { to: '/dashboard',           label: '🏠 Dashboard',          roles: ['ceo','comptable','call_center','marketing','rh'], cc_groupe: null },
  { to: '/producteurs',         label: '👨‍🌾 Producteurs',        roles: ['ceo','marketing','call_center'], cc_groupe: 1 },
  { to: '/produits',            label: '🌿 Produits',            roles: ['ceo','marketing','call_center'], cc_groupe: 1 },
  { to: '/commandes-grossiste', label: '📦 Cmds Grossiste',      roles: ['ceo','call_center'], cc_groupe: 1 },
  { to: '/ventes',              label: '💰 Ventes',              roles: ['ceo','marketing','call_center'], cc_groupe: 2 },
  { to: '/commandes-revendeur', label: '🛒 Cmds Revendeur',      roles: ['ceo','call_center'], cc_groupe: 2 },
  { to: '/comptabilite',        label: '📊 Comptabilité',        roles: ['ceo','comptable'], cc_groupe: null },
  { to: '/utilisateurs',        label: '👥 Utilisateurs',        roles: ['ceo','rh'], cc_groupe: null },
  { to: '/import',              label: '⬆️ Import',              roles: ['ceo'], cc_groupe: null },
];

const ROLE_LABELS = {
  ceo:         'CEO',
  comptable:   'Comptable',
  call_center: 'Call Center',
  marketing:   'Marketing',
  rh:          'Ressources Humaines',
};

function getLinks(user) {
  if (!user) return [];
  return ALL_LINKS.filter(l => {
    if (!l.roles.includes(user.role)) return false;
    // Pour call_center, filtrer selon le groupe
    if (user.role === 'call_center' && l.cc_groupe !== null) {
      return l.cc_groupe === user.cc_groupe;
    }
    return true;
  });
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = getLinks(user);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = user
    ? ROLE_LABELS[user.role] + (user.role === 'call_center' ? ` G${user.cc_groupe}` : '')
    : '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: '#1e3a2f', color: '#fff',
        display: 'flex', flexDirection: 'column', padding: '24px 0',
        position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #2d5a45' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4caf7d' }}>🌱 Facilitar</div>
          <div style={{ fontSize: 11, color: '#8ab89a', marginTop: 2 }}>Tableau de bord</div>
        </div>

        {/* Info utilisateur */}
        {user && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #2d5a45', background: 'rgba(76,175,125,0.08)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f5e9' }}>{user.prenom} {user.nom}</div>
            <div style={{ fontSize: 11, color: '#4caf7d', marginTop: 2, fontWeight: 600 }}>{roleLabel}</div>
          </div>
        )}

        <nav style={{ marginTop: 12, flex: 1 }}>
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              style={({ isActive }) => ({
                display: 'block',
                padding: '11px 20px',
                color: isActive ? '#4caf7d' : '#c5d9ce',
                background: isActive ? 'rgba(76,175,125,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #4caf7d' : '3px solid transparent',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                transition: 'all .15s',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #2d5a45' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px', borderRadius: 8,
              background: 'rgba(255,255,255,0.08)', border: '1px solid #2d5a45',
              color: '#c5d9ce', fontSize: 13, cursor: 'pointer',
            }}
          >
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

