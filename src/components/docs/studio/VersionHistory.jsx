// src/components/docs/studio/VersionHistory.jsx
// Lists saved snapshots for a doc and lets the author preview a diff against
// the current content and restore any version.

import { useState, useEffect, useCallback } from 'react';
import { listDocVersions } from '../../../api/docsApi.js';
import { lineDiff, diffStats } from './diff.js';

const fmt = iso => {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export default function VersionHistory({ docId, currentContent, onRestore, refreshKey }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    if (!docId) {
      setVersions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await listDocVersions(docId);
    setVersions(res.data || []);
    setLoading(false);
  }, [docId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!docId)
    return (
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 4px' }}>
        Save this page to start tracking version history.
      </div>
    );
  if (loading)
    return (
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 4px' }}>
        Loading…
      </div>
    );
  if (versions.length === 0)
    return (
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 4px' }}>
        No previous versions yet. Each save creates a snapshot.
      </div>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {versions.map((v, i) => {
        const isOpen = openId === v.versionId;
        const diff = isOpen ? lineDiff(v.content, currentContent) : null;
        const stats = diff ? diffStats(diff) : null;
        return (
          <div
            key={v.versionId}
            style={{
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : v.versionId)}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: isOpen ? 'var(--bg-hover)' : 'transparent',
                cursor: 'pointer',
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {i === 0 ? 'Most recent' : `Version ${versions.length - i}`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {fmt(v.savedAt)} · {v.author}
              </div>
            </button>
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border-default)' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 10px',
                    fontSize: '11px',
                  }}
                >
                  <span style={{ color: '#16A34A', fontWeight: 700 }}>+{stats.added}</span>
                  <span style={{ color: '#DC2626', fontWeight: 700 }}>−{stats.removed}</span>
                  <span style={{ color: 'var(--text-muted)' }}>vs current</span>
                  <button
                    type="button"
                    onClick={() => onRestore?.(v)}
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--accent-primary)',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-primary)',
                      fontWeight: 700,
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Restore
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: '240px',
                    overflow: 'auto',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, Menlo, monospace',
                    lineHeight: 1.55,
                    background: 'var(--bg-page)',
                  }}
                >
                  {diff.map((d, j) => (
                    <div
                      key={j}
                      style={{
                        padding: '0 10px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        background:
                          d.type === 'add'
                            ? 'rgba(22,163,74,0.12)'
                            : d.type === 'del'
                              ? 'rgba(220,38,38,0.12)'
                              : 'transparent',
                        color:
                          d.type === 'add'
                            ? '#15803D'
                            : d.type === 'del'
                              ? '#B91C1C'
                              : 'var(--text-secondary)',
                      }}
                    >
                      <span style={{ userSelect: 'none', opacity: 0.6, marginRight: '6px' }}>
                        {d.type === 'add' ? '+' : d.type === 'del' ? '−' : ' '}
                      </span>
                      {d.text || ' '}
                    </div>
                  ))}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
