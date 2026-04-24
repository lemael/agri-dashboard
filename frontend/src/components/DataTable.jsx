import React from 'react';

const STATUS_COLORS = {
  'en attente':  { bg: '#fff3cd', color: '#856404' },
  'confirmée':   { bg: '#d1e7dd', color: '#0a5336' },
  'livré':       { bg: '#cff4fc', color: '#055160' },
  'annulée':     { bg: '#f8d7da', color: '#721c24' },
  'disponible':  { bg: '#d1e7dd', color: '#0a5336' },
  'vendu':       { bg: '#e2cffc', color: '#4a148c' },
  'actif':       { bg: '#d1e7dd', color: '#0a5336' },
  'supprimé':    { bg: '#f8d7da', color: '#721c24' },
  'sold out':    { bg: '#f8d7da', color: '#721c24' },
};

export function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: '#e9ecef', color: '#495057' };
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 20,
      padding: '2px 10px', fontSize: 12, fontWeight: 600,
    }}>
      {status}
    </span>
  );
}

export default function DataTable({ columns, rows, emptyMessage = 'Aucune donnée' }) {
  if (!rows) return <div style={{ color: '#636e72', padding: 20 }}>Chargement…</div>;
  if (rows.length === 0) return <div style={{ color: '#636e72', padding: 20 }}>{emptyMessage}</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse', background: '#fff',
        borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.08)',
      }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            {columns.map(c => (
              <th key={c.key} style={{
                padding: '12px 16px', textAlign: 'left', fontSize: 13,
                fontWeight: 600, color: '#495057', borderBottom: '1px solid #dee2e6',
                whiteSpace: 'nowrap',
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} style={{
              borderBottom: '1px solid #f1f3f5',
              transition: 'background .1s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map(c => (
                <td key={c.key} style={{ padding: '12px 16px', fontSize: 13 }}>
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
