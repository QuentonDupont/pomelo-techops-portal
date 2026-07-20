// src/components/catalog/ServiceCatalogPage.jsx
// Requester-facing service catalog — the front door of the submit experience.
// Shows active request types as cards grouped by category; picking one opens
// its structured form (RequestTypeForm); the "Something else" tile falls back
// to the legacy generic submit form which the host passes in as a prop.
//
// Backend mode only: in mock mode (API disabled) the host renders the generic
// form directly and never mounts this page.

import { useEffect, useState } from 'react';
import { PenLine, ChevronRight } from 'lucide-react';
import { S } from '../../lib/styles.js';
import { listRequestTypes } from '../../api/requestTypesApi.js';
import { catalogIcon } from './catalogIcons.js';
import RequestTypeForm from './RequestTypeForm.jsx';

const tile = {
  ...S.card,
  padding: '18px',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '14px',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  transition: 'border-color 120ms ease, transform 120ms ease',
};

function CatalogTile({ icon: Icon, name, description, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      style={{
        ...tile,
        ...(hover ? { borderColor: 'var(--accent-primary)', transform: 'translateY(-1px)' } : {}),
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={19} color="var(--accent-primary)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {name}
          <ChevronRight size={14} color="var(--text-muted)" />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
          {description}
        </div>
      </div>
    </button>
  );
}

export default function ServiceCatalogPage({ currentUser, onToast, genericForm }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  // view: {mode:'grid'} | {mode:'type', type} | {mode:'generic'}
  const [view, setView] = useState({ mode: 'grid' });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await listRequestTypes();
      if (!alive) return;
      if (error) setLoadError(error);
      else setTypes(data.requestTypes || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (view.mode === 'generic') {
    return (
      <div>
        <button
          style={{ ...S.ghostBtn, marginBottom: '14px' }}
          onClick={() => setView({ mode: 'grid' })}
        >
          ← Back to catalog
        </button>
        {genericForm}
      </div>
    );
  }

  if (view.mode === 'type') {
    return (
      <RequestTypeForm
        type={view.type}
        currentUser={currentUser}
        onToast={onToast}
        onBack={() => setView({ mode: 'grid' })}
      />
    );
  }

  // Grid — group active types by category, stable order from the API (sort).
  const byCategory = new Map();
  for (const t of types) {
    if (!byCategory.has(t.category)) byCategory.set(t.category, []);
    byCategory.get(t.category).push(t);
  }

  return (
    <div>
      <div style={S.pageTitle}>What do you need help with?</div>
      <div style={S.pageSub}>
        Pick a request type for faster routing, or use the general form at the bottom.
      </div>

      {loading && (
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading catalog…</div>
      )}
      {loadError && (
        <div style={{ fontSize: '13px', color: '#DC2626', marginBottom: '14px' }}>
          Couldn't load the catalog ({loadError}). You can still use the general form below.
        </div>
      )}

      {[...byCategory.entries()].map(([category, list]) => (
        <div key={category} style={{ marginBottom: '22px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '10px',
            }}
          >
            {category}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px',
            }}
          >
            {list.map(t => (
              <CatalogTile
                key={t.id}
                icon={catalogIcon(t.icon)}
                name={t.name}
                description={t.description}
                onClick={() => setView({ mode: 'type', type: t })}
              />
            ))}
          </div>
        </div>
      ))}

      {!loading && (
        <div style={{ marginTop: '6px' }}>
          <CatalogTile
            icon={PenLine}
            name="Something else"
            description="None of these fit? Open the full ticket form with every field."
            onClick={() => setView({ mode: 'generic' })}
          />
        </div>
      )}
    </div>
  );
}
