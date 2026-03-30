// src/components/docs/DocCard.jsx
// Upgraded document card with export, download, format badge, bookmarks, version, timestamps.

import { useState } from 'react';
import DocExporter from './DocExporter.jsx';
import { FORMAT_COLORS } from '../../mocks/docsMockData.js';

const relativeTime = (iso) => {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (diff === 0) return 'Updated today';
  if (diff === 1) return 'Updated yesterday';
  if (diff < 30) return `Updated ${diff} days ago`;
  if (diff < 365) return `Updated ${Math.floor(diff / 30)} mo ago`;
  return `Updated ${Math.floor(diff / 365)}y ago`;
};

const fmtFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

export default function DocCard({ doc, role, isBookmarked, onToggleBookmark, onOpen, onFullPage }) {
  const [hovering, setHovering]         = useState(false);
  const [showExporter, setShowExporter] = useState(false);

  const fmt      = FORMAT_COLORS[doc.format] || FORMAT_COLORS.TXT;
  const catColor = '#64748B';

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${hovering ? '#E8632A' : '#E2E8F0'}`,
        borderRadius: '10px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: hovering ? '0 4px 18px rgba(232,99,42,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
        position: 'relative',
        fontFamily: "'Lato', sans-serif",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => onOpen?.(doc)}
    >
      {/* Top row: icon + title + format badge + bookmark */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '26px', lineHeight: 1, flexShrink: 0 }}>{doc.icon || '📄'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A2B4A', lineHeight: 1.3 }}>{doc.title}</span>
            {/* Format badge */}
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: fmt.bg, color: fmt.color, border: `1px solid ${fmt.border}`, flexShrink: 0 }}>
              {doc.format || 'DOC'}
            </span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: '#F1F5F9', color: catColor }}>
            {doc.category}
          </span>
        </div>

        {/* Bookmark toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleBookmark?.(doc.id); }}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '2px', flexShrink: 0, lineHeight: 1, opacity: isBookmarked ? 1 : hovering ? 0.5 : 0.25, transition: 'opacity 0.15s' }}
        >
          {isBookmarked ? '★' : '☆'}
        </button>
      </div>

      {/* Description */}
      <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {doc.description || doc.summary}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {doc.version && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#1A2B4A', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', padding: '2px 6px' }}>
            v{doc.version}
          </span>
        )}
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>{relativeTime(doc.updatedAt)}</span>
        {doc.viewCount > 0 && (
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>👁 {doc.viewCount.toLocaleString()}</span>
        )}
        {doc.fileSize > 0 && (
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{fmtFileSize(doc.fileSize)}</span>
        )}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }} onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onFullPage?.(doc)}
          style={{ flex: 1, padding: '7px 0', background: 'none', border: 'none', color: '#E8632A', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
        >
          Read article →
        </button>

        {/* Export */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowExporter(v => !v); }}
            title="Export"
            style={{ padding: '6px 10px', background: '#F8F9FB', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#475569', fontFamily: "'Lato', sans-serif", fontWeight: 700 }}
          >
            ↗ Export
          </button>
          {showExporter && (
            <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, zIndex: 200 }}>
              <DocExporter doc={doc} onClose={() => setShowExporter(false)} />
            </div>
          )}
        </div>

        {/* Admin actions — visible on hover */}
        {role === 'superadmin' && hovering && (
          <>
            <button
              title="Edit"
              style={{ padding: '6px 10px', background: '#F8F9FB', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#1A2B4A', fontFamily: "'Lato', sans-serif", fontWeight: 700 }}
            >
              ✎ Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
