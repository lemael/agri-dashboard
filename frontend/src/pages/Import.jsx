import React, { useState } from 'react';
import { api } from '../api';

const IS_MOCK = !import.meta.env.VITE_API_URL;

export default function Import() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleReloadFlutter = async () => {
    setLoading(true);
    setStatus(null);
    localStorage.removeItem('fac_data_loaded');
    try {
      const result = await api.importFromFiles();
      localStorage.setItem('fac_data_loaded', '1');
      setStatus({ success: true, ...result });
    } catch (e) {
      setStatus({ success: false, error: e.message });
    }
    setLoading(false);
  };

  const handleImport = async () => {
    setLoading(true);
    setStatus(null);
    try {
      let result;
      if (api.importFromFiles) {
        // Mode mock : utilise le mockApi directement (base URL correcte)
        result = await api.importFromFiles();
      } else {
        // Mode backend réel
        const base = import.meta.env.BASE_URL || '/';
        const d = (f) => `${base}data/${f}`;
        const [orders, revendeurOrders, ventes, products, profiles, users] = await Promise.all([
          fetch(d('orders.json')).then(r => r.json()).catch(() => null),
          fetch(d('revendeur_orders.json')).then(r => r.json()).catch(() => null),
          fetch(d('ventes.json')).then(r => r.json()).catch(() => null),
          fetch(d('products.json')).then(r => r.json()).catch(() => null),
          fetch(d('profiles.json')).then(r => r.json()).catch(() => null),
          fetch(d('users.json')).then(r => r.json()).catch(() => null),
        ]);
        result = await api.importData({ orders, revendeurOrders, ventes, products, profiles, users });
      }
      setStatus({ success: true, ...result });
    } catch (e) {
      setStatus({ success: false, error: e.message });
    }
    setLoading(false);
  };

  const handleFileImport = async (e) => {
    const files = Array.from(e.target.files);
    const data = {};
    for (const file of files) {
      const text = await file.text();
      const json = JSON.parse(text);
      const name = file.name.replace('.json', '');
      const keyMap = {
        orders: 'orders',
        revendeur_orders: 'revendeurOrders',
        ventes: 'ventes',
        products: 'products',
        profiles: 'profiles',
        users: 'users',
      };
      if (keyMap[name]) data[keyMap[name]] = json;
    }
    if (Object.keys(data).length === 0) {
      setStatus({ success: false, error: 'Aucun fichier reconnu (orders.json, ventes.json, etc.)' });
      return;
    }
    setLoading(true);
    try {
      const result = await api.importData(data);
      setStatus({ success: true, ...result });
    } catch (err) {
      setStatus({ success: false, error: err.message });
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Import des données Flutter</h1>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Option 1 : upload manuel */}
        <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h3 style={{ marginBottom: 8, fontSize: 15 }}>📂 Upload fichiers JSON</h3>
          <p style={{ color: '#636e72', fontSize: 13, marginBottom: 16 }}>
            Sélectionnez un ou plusieurs fichiers depuis le dossier <code>data/</code> de l'app Flutter.
            Fichiers acceptés : <code>orders.json</code>, <code>revendeur_orders.json</code>, <code>ventes.json</code>, <code>products.json</code>, <code>profiles.json</code>, <code>users.json</code>
          </p>
          <input
            type="file"
            accept=".json"
            multiple
            onChange={handleFileImport}
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Option 2 : import automatique */}
        <div style={{ flex: 1, minWidth: 300, background: '#fff', borderRadius: 10, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          {IS_MOCK ? (
            <>
              <h3 style={{ marginBottom: 8, fontSize: 15 }}>🔄 Recharger les données Flutter</h3>
              <p style={{ color: '#636e72', fontSize: 13, marginBottom: 16 }}>
                Recharge automatiquement les données depuis les fichiers JSON du projet <code>flutter_application_1</code> intégrés dans l'application.
                Les données existantes dans le navigateur seront remplacées.
              </p>
              <button
                onClick={handleReloadFlutter}
                disabled={loading}
                style={{
                  padding: '10px 20px', background: '#4caf7d', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                }}
              >
                {loading ? 'Rechargement…' : '🌿 Recharger depuis Flutter'}
              </button>
            </>
          ) : (
            <>
              <h3 style={{ marginBottom: 8, fontSize: 15 }}>⚡ Import automatique</h3>
              <p style={{ color: '#636e72', fontSize: 13, marginBottom: 16 }}>
                Si vous servez le dossier <code>data/</code> de l'app Flutter via un serveur statique accessible, cliquez ci-dessous pour importer directement.
              </p>
              <button
                onClick={handleImport}
                disabled={loading}
                style={{
                  padding: '10px 20px', background: '#1e3a2f', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                }}
              >
                {loading ? 'Import en cours…' : 'Importer depuis /data/'}
              </button>
            </>
          )}
        </div>
      </div>

      {status && (
        <div style={{
          marginTop: 20, padding: 16, borderRadius: 8,
          background: status.success ? '#d1e7dd' : '#f8d7da',
          color: status.success ? '#0a5336' : '#721c24',
        }}>
          {status.success ? (
            <div>
              <strong>✅ Import réussi !</strong>
              <ul style={{ marginTop: 8, fontSize: 13 }}>
                {Object.entries(status.imported || {}).map(([k, v]) => (
                  <li key={k}>{k} : {v} entrée(s)</li>
                ))}
              </ul>
            </div>
          ) : (
            <div><strong>❌ Erreur :</strong> {status.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
