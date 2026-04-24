import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Charge automatiquement les données Flutter au premier lancement (mode mock)
import { mockApi } from './mockApi';
if (!import.meta.env.VITE_API_URL && !localStorage.getItem('fac_data_loaded')) {
  mockApi.importFromFiles().then(() => {
    localStorage.setItem('fac_data_loaded', '1');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
