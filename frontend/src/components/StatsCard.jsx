import React from 'react';

export default function StatsCard({ label, value, color = '#4caf7d', sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,.08)', borderTop: `4px solid ${color}`,
      minWidth: 160, flex: 1,
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, color: '#636e72', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#b2bec3', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
