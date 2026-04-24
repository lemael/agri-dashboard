import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CommandesGrossiste from './pages/CommandesGrossiste';
import CommandesRevendeur from './pages/CommandesRevendeur';
import Ventes from './pages/Ventes';
import Produits from './pages/Produits';
import Producteurs from './pages/Producteurs';
import Import from './pages/Import';
import Comptabilite from './pages/Comptabilite';
import GestionUtilisateurs from './pages/GestionUtilisateurs';

// Pages accessibles par rôle (ceo voit tout)
const ROLE_PATHS = {
  call_center_1: ['/dashboard', '/producteurs', '/produits', '/commandes-grossiste'],
  call_center_2: ['/dashboard', '/ventes', '/commandes-revendeur'],
  marketing:     ['/dashboard', '/produits', '/producteurs', '/ventes'],
  comptable:     ['/dashboard', '/comptabilite'],
  rh:            ['/dashboard', '/utilisateurs'],
  ceo:           null, // accès total
};

function canAccess(user, path) {
  if (!user) return false;
  if (user.role === 'ceo') return true;
  if (user.role === 'call_center') {
    const allowed = ROLE_PATHS[`call_center_${user.cc_groupe}`] || [];
    return allowed.includes(path);
  }
  const allowed = ROLE_PATHS[user.role];
  return allowed ? allowed.includes(path) : false;
}

function Guard({ path, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user, path)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/" element={<LayoutGuard />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"           element={<Guard path="/dashboard"><Dashboard /></Guard>} />
            <Route path="commandes-grossiste" element={<Guard path="/commandes-grossiste"><CommandesGrossiste /></Guard>} />
            <Route path="commandes-revendeur" element={<Guard path="/commandes-revendeur"><CommandesRevendeur /></Guard>} />
            <Route path="ventes"              element={<Guard path="/ventes"><Ventes /></Guard>} />
            <Route path="produits"            element={<Guard path="/produits"><Produits /></Guard>} />
            <Route path="producteurs"         element={<Guard path="/producteurs"><Producteurs /></Guard>} />
            <Route path="comptabilite"        element={<Guard path="/comptabilite"><Comptabilite /></Guard>} />
            <Route path="utilisateurs"        element={<Guard path="/utilisateurs"><GestionUtilisateurs /></Guard>} />
            <Route path="import"              element={<Guard path="/import"><Import /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

function LoginRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <Login />;
}

function LayoutGuard() {
  const { user } = useAuth();
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

