// src/components/docs/studio/TemplatePicker.jsx
// Modal shown when creating a new page — pick a starter template or blank.

import { useEffect } from 'react';
import { TEMPLATES } from './templates.js';

export default function TemplatePicker({ onPick, onClose }) {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        role="presentation"
        style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 400 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a template"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 401,
          width: '640px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          padding: '22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text-primary)' }}>
            Create a new page
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: '22px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Pick a starter template, or begin from a blank page.
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '12px',
          }}
        >
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-page)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'border-color 0.12s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            >
              <span style={{ fontSize: '26px' }}>{t.icon}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {t.name}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {t.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
