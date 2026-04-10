// src/components/docs/DocImportExportPage.jsx
// Full upgraded Documentation page — replaces the existing DocsPage.
// Assembles DocCard, DocUploader, DocExporter, DocAdminPanel with useDocumentManager.

import { useState, useEffect, useRef } from 'react';
import useDocumentManager from '../../hooks/useDocumentManager.js';
import DocCard from './DocCard.jsx';
import DocUploader from './DocUploader.jsx';
import DocAdminPanel from './DocAdminPanel.jsx';
import { bulkZipExport } from './DocExporter.jsx';
import { DOC_CATEGORIES } from '../../mocks/docsMockData.js';
import { bulkArchive, updateDoc } from '../../api/docsApi.js';
import DocEditModal from './DocEditModal.jsx';

const ALL_CAT_TABS = ['All', ...DOC_CATEGORIES];
const VISIBILITY_OPTIONS = ['Public', 'IT Team Only'];

// ─── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(90deg, #F1F5F9 25%, #E8EDF5 50%, #F1F5F9 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: '14px',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, #F1F5F9 25%, #E8EDF5 50%, #F1F5F9 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
              marginBottom: '8px',
              width: '70%',
            }}
          />
          <div
            style={{
              height: '10px',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, #F1F5F9 25%, #E8EDF5 50%, #F1F5F9 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
              width: '40%',
            }}
          />
        </div>
      </div>
      <div
        style={{
          height: '12px',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #F1F5F9 25%, #E8EDF5 50%, #F1F5F9 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          width: '100%',
        }}
      />
      <div
        style={{
          height: '12px',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #F1F5F9 25%, #E8EDF5 50%, #F1F5F9 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          width: '80%',
        }}
      />
    </div>
  );
}

// ─── Command Palette ───────────────────────────────────────────────────────────
function CmdPalette({ docs, onSelectDoc, onAction, onClose }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const QUICK_ACTIONS = [
    { id: 'upload', label: '↑ Upload documents', icon: '📤' },
    { id: 'manage', label: '⚙ Manage docs (admin)', icon: '🗂️' },
    { id: 'select', label: '☑ Enter selection mode', icon: '✅' },
  ];

  const matchedDocs =
    query.length > 0
      ? docs
          .filter(
            d =>
              d.title.toLowerCase().includes(query.toLowerCase()) ||
              (d.description || '').toLowerCase().includes(query.toLowerCase()) ||
              (d.content || '').toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 6)
      : [];

  const actions =
    query.length === 0
      ? QUICK_ACTIONS
      : QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));
  const allItems = [
    ...matchedDocs.map(d => ({ type: 'doc', ...d })),
    ...actions.map(a => ({ type: 'action', ...a })),
  ];

  const handleKey = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, allItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    }
    if (e.key === 'Enter' && allItems[cursor]) {
      const item = allItems[cursor];
      if (item.type === 'doc') onSelectDoc(item);
      else onAction(item.id);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '560px',
        maxWidth: '95vw',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 24px 72px rgba(0,0,0,0.28)',
        zIndex: 801,
        overflow: 'hidden',
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 18px',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <span style={{ fontSize: '18px' }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={handleKey}
          placeholder="Search docs or type a command…"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '15px',
            color: '#1A2B4A',
            fontFamily: "'Lato', sans-serif",
            background: 'transparent',
          }}
        />
        <kbd
          style={{
            fontSize: '11px',
            color: '#94A3B8',
            background: '#F1F5F9',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
          }}
        >
          ESC
        </kbd>
      </div>
      <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
        {allItems.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
            No results for "{query}"
          </div>
        )}
        {matchedDocs.length > 0 && (
          <div style={{ padding: '8px 0 4px', borderBottom: '1px solid #F1F5F9' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0 18px 6px',
              }}
            >
              Documents
            </div>
            {matchedDocs.map((doc, idx) => (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 18px',
                  cursor: 'pointer',
                  background: cursor === idx ? '#FFF4EE' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={() => setCursor(idx)}
              >
                <span style={{ fontSize: '20px' }}>{doc.icon || '📄'}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A2B4A' }}>
                    {doc.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {doc.category} · {doc.format}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {actions.length > 0 && (
          <div style={{ padding: '8px 0' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '0 18px 6px',
              }}
            >
              Quick Actions
            </div>
            {actions.map((action, idx) => {
              const globalIdx = matchedDocs.length + idx;
              return (
                <div
                  key={action.id}
                  onClick={() => onAction(action.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    background: cursor === globalIdx ? '#FFF4EE' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={() => setCursor(globalIdx)}
                >
                  <span style={{ fontSize: '18px' }}>{action.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                    {action.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div
        style={{
          padding: '8px 18px',
          borderTop: '1px solid #F1F5F9',
          background: '#F8F9FB',
          display: 'flex',
          gap: '16px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          <kbd style={{ fontFamily: 'monospace' }}>↑↓</kbd> navigate
        </span>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          <kbd style={{ fontFamily: 'monospace' }}>↵</kbd> select
        </span>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          <kbd style={{ fontFamily: 'monospace' }}>⌘K</kbd> toggle
        </span>
      </div>
    </div>
  );
}

// ─── Uploader modal wrapper ────────────────────────────────────────────────────
function UploaderModal({ manager, onClose, currentUser }) {
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
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500 }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          background: '#fff',
          borderRadius: '16px',
          zIndex: 501,
          width: '720px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          boxShadow: '0 24px 72px rgba(0,0,0,0.22)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Lato', sans-serif",
        }}
      >
        <div
          style={{
            background: '#1A2B4A',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: '16px' }}>Upload Documents</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: '2px' }}>
              Drag files or click to browse — PDF, DOCX, MD, TXT, CSV and more
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '22px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <DocUploader
            queue={manager.queue}
            addToQueue={manager.addToQueue}
            currentUser={currentUser}
            removeFromQueue={manager.removeFromQueue}
            clearQueue={manager.clearQueue}
            updateQueueItem={manager.updateQueueItem}
            setBulkCategory={manager.setBulkCategory}
            removeErrored={manager.removeErrored}
            uploading={manager.uploading}
            uploadProgress={manager.uploadProgress}
            uploadSummary={manager.uploadSummary}
            uploadAll={manager.uploadAll}
          />
        </div>
      </div>
    </>
  );
}

// ─── Full-page article reader ──────────────────────────────────────────────────
function DocFullPage({ doc, allDocs, onClose, onSelect }) {
  const otherDocs = allDocs.filter(d => d.id !== doc.id);
  const [scrollPct, setScrollPct] = useState(0);
  const contentRef = useRef(null);

  const wordCount = (doc.content || '').split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleScroll = e => {
    const el = e.currentTarget;
    const pct = Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100);
    setScrollPct(Math.min(100, pct || 0));
  };

  const tocItems = (doc.content || '').split('\n').reduce((acc, line, idx) => {
    if (/^##\s/.test(line)) acc.push({ level: 2, text: line.replace(/^##\s/, ''), id: `h-${idx}` });
    if (/^###\s/.test(line))
      acc.push({ level: 3, text: line.replace(/^###\s/, ''), id: `h-${idx}` });
    return acc;
  }, []);

  const [sidebarTab, setSidebarTab] = useState(tocItems.length > 0 ? 'toc' : 'docs');

  const docIndex = allDocs.findIndex(d => d.id === doc.id);
  const prevDoc = docIndex > 0 ? allDocs[docIndex - 1] : null;
  const nextDoc = docIndex < allDocs.length - 1 ? allDocs[docIndex + 1] : null;

  // Inline renderer: handles **bold**, `code`, ![img](url), and plain text
  const renderInline = text => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|!\[[^\]]*\]\([^)]+\))/g);
    return parts.map((part, j) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={j}>{part.slice(2, -2)}</strong>;
      if (/^`[^`]+`$/.test(part))
        return (
          <code
            key={j}
            style={{
              background: '#F1F5F9',
              padding: '1px 5px',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      const imgM = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgM)
        return (
          <img
            key={j}
            src={imgM[2]}
            alt={imgM[1]}
            style={{
              maxWidth: '100%',
              borderRadius: '6px',
              verticalAlign: 'middle',
              margin: '2px 0',
            }}
          />
        );
      return part;
    });
  };

  const renderContent = content => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements = [];
    let listBuffer = [];
    let inCodeBlock = false;
    let codeLines = [];

    const flushList = () => {
      if (listBuffer.length === 0) return;
      elements.push(
        <ul key={`ul-${elements.length}`} style={{ paddingLeft: '20px', margin: '8px 0 14px' }}>
          {listBuffer.map((item, j) => (
            <li
              key={j}
              style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, marginBottom: '4px' }}
            >
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    };

    const flushCode = () => {
      if (codeLines.length === 0) return;
      elements.push(
        <pre
          key={`code-${elements.length}`}
          style={{
            background: '#F8F9FB',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '14px 16px',
            overflowX: 'auto',
            fontSize: '13px',
            fontFamily: 'monospace',
            color: '#1A2B4A',
            margin: '10px 0 16px',
            lineHeight: 1.6,
          }}
        >
          {codeLines.join('\n')}
        </pre>
      );
      codeLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code fence toggle
      if (/^```/.test(line)) {
        if (inCodeBlock) {
          inCodeBlock = false;
          flushCode();
        } else {
          flushList();
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Headings
      if (/^###\s/.test(line)) {
        flushList();
        elements.push(
          <h3
            id={`h-${i}`}
            key={i}
            style={{ fontSize: '15px', fontWeight: 700, color: '#1A2B4A', margin: '20px 0 6px' }}
          >
            {renderInline(line.replace(/^###\s/, ''))}
          </h3>
        );
        continue;
      }
      if (/^##\s/.test(line)) {
        flushList();
        elements.push(
          <h2
            id={`h-${i}`}
            key={i}
            style={{
              fontSize: '19px',
              fontWeight: 900,
              color: '#1A2B4A',
              margin: '28px 0 10px',
              borderBottom: '2px solid #E8632A',
              paddingBottom: '6px',
            }}
          >
            {renderInline(line.replace(/^##\s/, ''))}
          </h2>
        );
        continue;
      }
      if (/^#\s/.test(line)) {
        flushList();
        continue;
      } // title already shown above

      // Blockquote
      if (/^>\s/.test(line)) {
        flushList();
        elements.push(
          <blockquote
            key={i}
            style={{
              borderLeft: '4px solid #E8632A',
              paddingLeft: '14px',
              margin: '10px 0',
              color: '#64748B',
              fontStyle: 'italic',
              fontSize: '13px',
              lineHeight: 1.7,
            }}
          >
            {renderInline(line.replace(/^>\s/, ''))}
          </blockquote>
        );
        continue;
      }

      // List items (- or *)
      if (/^[-*]\s/.test(line)) {
        listBuffer.push(line.replace(/^[-*]\s/, ''));
        continue;
      }

      // Numbered list (1. 2. etc)
      if (/^\d+\.\s/.test(line)) {
        listBuffer.push(line.replace(/^\d+\.\s/, ''));
        continue;
      }

      // Table separator row — skip silently
      if (/^\|[-| :]+\|$/.test(line.trim())) continue;

      // Table data row — render as bullet list item
      if (/^\|.+\|$/.test(line.trim())) {
        const cells = line
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map(c => c.trim())
          .filter(Boolean);
        listBuffer.push(cells.join(' — '));
        continue;
      }

      // Horizontal rule
      if (/^[-_*]{3,}$/.test(line.trim())) {
        flushList();
        elements.push(
          <hr
            key={i}
            style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '20px 0' }}
          />
        );
        continue;
      }

      // Standalone image line: ![alt](url) or ![alt](data:...)
      const imgBlock = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgBlock) {
        flushList();
        elements.push(
          <div key={i} style={{ margin: '16px 0', textAlign: 'center' }}>
            <img
              src={imgBlock[2]}
              alt={imgBlock[1]}
              style={{
                maxWidth: '100%',
                maxHeight: '520px',
                objectFit: 'contain',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
              onError={e => {
                e.target.style.display = 'none';
              }}
            />
            {imgBlock[1] && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#94A3B8',
                  marginTop: '6px',
                  fontStyle: 'italic',
                }}
              >
                {imgBlock[1]}
              </p>
            )}
          </div>
        );
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        flushList();
        elements.push(<div key={i} style={{ height: '10px' }} />);
        continue;
      }

      // Paragraph
      flushList();
      elements.push(
        <p
          key={i}
          style={{ fontSize: '14px', color: '#374151', lineHeight: 1.8, marginBottom: '10px' }}
        >
          {renderInline(line)}
        </p>
      );
    }

    flushList();
    flushCode();
    return elements;
  };

  return (
    <div style={{ display: 'flex', margin: '0 -28px', minHeight: '100%' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '260px',
          flexShrink: 0,
          borderRight: '1px solid #E2E8F0',
          padding: '28px 16px',
          background: '#F8F9FB',
        }}
      >
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: '#E8632A',
            fontFamily: "'Lato', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '20px',
            padding: 0,
          }}
        >
          ← Back to library
        </button>

        {/* Sidebar tabs */}
        {tocItems.length > 0 && (
          <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '12px' }}>
            <button
              onClick={() => setSidebarTab('toc')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                background: 'none',
                fontSize: '11px',
                fontWeight: 700,
                color: sidebarTab === 'toc' ? '#E8632A' : '#94A3B8',
                borderBottom: sidebarTab === 'toc' ? '2px solid #E8632A' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: "'Lato', sans-serif",
              }}
            >
              Contents
            </button>
            <button
              onClick={() => setSidebarTab('docs')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                background: 'none',
                fontSize: '11px',
                fontWeight: 700,
                color: sidebarTab === 'docs' ? '#E8632A' : '#94A3B8',
                borderBottom: sidebarTab === 'docs' ? '2px solid #E8632A' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: "'Lato', sans-serif",
              }}
            >
              All Docs
            </button>
          </div>
        )}

        {sidebarTab === 'toc' &&
          tocItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              style={{
                display: 'block',
                padding: `6px 8px 6px ${item.level === 3 ? '20px' : '8px'}`,
                fontSize: '12px',
                color: '#374151',
                fontWeight: item.level === 2 ? 700 : 400,
                textDecoration: 'none',
                borderRadius: '6px',
                marginBottom: '2px',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E8632A14')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.text}
            </a>
          ))}

        {(sidebarTab === 'docs' || tocItems.length === 0) && (
          <>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '10px',
              }}
            >
              All Documents
            </div>
            {otherDocs.map(d => (
              <button
                key={d.id}
                onClick={() => onSelect(d)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  fontFamily: "'Lato', sans-serif",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#E8632A14')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A2B4A' }}>
                  {d.icon} {d.title}
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                  {d.category}
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Article content */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', height: 'calc(100vh - 120px)', position: 'relative' }}
      >
        {/* Scroll progress bar */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: '#E2E8F0',
            zIndex: 10,
          }}
        >
          <div
            style={{
              height: '3px',
              background: '#E8632A',
              width: `${scrollPct}%`,
              transition: 'width 0.1s',
            }}
          />
        </div>

        <div style={{ padding: '36px 40px', maxWidth: '780px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '100px',
                background: '#F1F5F9',
                color: '#64748B',
              }}
            >
              {doc.category}
            </span>
            {doc.version && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: '#EFF6FF',
                  color: '#2563EB',
                  border: '1px solid #BFDBFE',
                }}
              >
                v{doc.version}
              </span>
            )}
          </div>
          <h1
            style={{
              fontSize: '30px',
              fontWeight: 900,
              color: '#1A2B4A',
              marginBottom: '8px',
              lineHeight: 1.2,
            }}
          >
            {doc.icon} {doc.title}
          </h1>
          <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '4px' }}>
            {doc.author && `By ${doc.author}`}
            {doc.author && doc.updatedAt && ' · '}
            {doc.updatedAt &&
              `Updated ${new Date(doc.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </div>
          {/* Reading time + scroll progress badge */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginTop: '6px',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>📖 {readingTime} min read</span>
            {scrollPct > 5 && (
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>· {scrollPct}% read</span>
            )}
          </div>
          <div style={{ borderBottom: '2px solid #E2E8F0', marginBottom: '28px' }} />
          {renderContent(doc.content)}

          {/* Prev/Next navigation */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '48px',
              paddingTop: '20px',
              borderTop: '2px solid #E2E8F0',
              gap: '12px',
            }}
          >
            {prevDoc ? (
              <button
                onClick={() => onSelect(prevDoc)}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: '#F8F9FB',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif",
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#94A3B8',
                    marginBottom: '4px',
                  }}
                >
                  ← PREVIOUS
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A2B4A' }}>
                  {prevDoc.icon} {prevDoc.title}
                </div>
              </button>
            ) : (
              <div style={{ flex: 1 }} />
            )}
            {nextDoc ? (
              <button
                onClick={() => onSelect(nextDoc)}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: '#F8F9FB',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontFamily: "'Lato', sans-serif",
                  textAlign: 'right',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#94A3B8',
                    marginBottom: '4px',
                  }}
                >
                  NEXT →
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A2B4A' }}>
                  {nextDoc.icon} {nextDoc.title}
                </div>
              </button>
            ) : (
              <div style={{ flex: 1 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function DocsSidebar({ docs, bookmarks, onSelect, isBookmarked }) {
  const bookmarkedDocs = docs.filter(d => isBookmarked(d.id));
  const categories = Array.from(new Set(docs.map(d => d.category)));

  return (
    <div
      style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid #E2E8F0',
        padding: '28px 16px',
        background: '#F8F9FB',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#94A3B8',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '10px',
        }}
      >
        Categories
      </div>
      {categories.map(cat => {
        const count = docs.filter(d => d.category === cat).length;
        return (
          <div
            key={cat}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 8px',
              borderRadius: '7px',
              marginBottom: '2px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#E8632A14')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>{cat}</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                background: '#E2E8F0',
                color: '#64748B',
                padding: '1px 6px',
                borderRadius: '100px',
              }}
            >
              {count}
            </span>
          </div>
        );
      })}

      {bookmarkedDocs.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid #E2E8F0', margin: '16px 0 12px' }} />
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#94A3B8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
            }}
          >
            ★ Bookmarked
          </div>
          {bookmarkedDocs.map(d => (
            <button
              key={d.id}
              onClick={() => onSelect(d)}
              aria-label={`Open bookmark: ${d.title}`}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '7px 8px',
                borderRadius: '7px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: "'Lato', sans-serif",
                marginBottom: '2px',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E8632A14')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A2B4A' }}>
                {d.icon} {d.title}
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Archive confirm modal ─────────────────────────────────────────────────────
function ArchiveConfirmModal({ count, onCancel, onConfirm, working }) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600 }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          background: '#fff',
          borderRadius: '14px',
          zIndex: 601,
          width: '420px',
          maxWidth: '94vw',
          boxShadow: '0 24px 72px rgba(0,0,0,0.22)',
          padding: '28px 28px 24px',
          fontFamily: "'Lato', sans-serif",
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '12px', textAlign: 'center' }}>🗑️</div>
        <div
          style={{
            fontSize: '18px',
            fontWeight: 900,
            color: '#1A2B4A',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          Archive {count} document{count !== 1 ? 's' : ''}?
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#64748B',
            textAlign: 'center',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          Archived docs are hidden from the library but can be restored in Manage Docs.
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            disabled={working}
            style={{
              flex: 1,
              padding: '11px',
              background: 'transparent',
              border: '1.5px solid #E2E8F0',
              borderRadius: '8px',
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={working}
            style={{
              flex: 1,
              padding: '11px',
              background: working ? '#CBD5E1' : '#DC2626',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: '14px',
              cursor: working ? 'not-allowed' : 'pointer',
            }}
          >
            {working ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── DocImportExportPage ───────────────────────────────────────────────────────
export default function DocImportExportPage({ role, suggestions, setSuggestions, currentUser }) {
  const manager = useDocumentManager(role);

  const [activeTab, setActiveTab] = useState('library');
  const [catTab, setCatTab] = useState('All');
  const [fullPageDoc, setFullPageDoc] = useState(null);
  const [sidebarDoc, setSidebarDoc] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [exportAllFormat, setExportAllFormat] = useState('MD');

  // ── Enhanced search state ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchDebounceTimer = useRef(null);

  const handleSearchChange = val => {
    setSearchQuery(val);
    clearTimeout(searchDebounceTimer.current);
    searchDebounceTimer.current = setTimeout(() => setDebouncedQuery(val), 200);
  };

  // Clear the debounce timer on unmount to prevent state updates on an
  // unmounted component.
  useEffect(() => () => clearTimeout(searchDebounceTimer.current), []);

  // Keep localSearch as alias for backward compat
  const localSearch = debouncedQuery;

  // ── Sort state ───────────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState('newest');

  // ── Multi-select state ──────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [bulkExportFmt, setBulkExportFmt] = useState('MD');
  const [showBulkExportPicker, setShowBulkExportPicker] = useState(false);
  const [bulkCat, setBulkCat] = useState('');
  const [bulkVis, setBulkVis] = useState('');
  const [editingDoc, setEditingDoc] = useState(null);

  // ── Toast system ─────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const toastTimer = useRef({});

  const showToast = (type, msg) => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-2), { id, type, msg }]);
    toastTimer.current[id] = setTimeout(
      () => setToasts(prev => prev.filter(t => t.id !== id)),
      4000
    );
  };

  const dismissToast = id => {
    clearTimeout(toastTimer.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // ── Command palette state ─────────────────────────────────────────────────────
  const [showCmdPalette, setShowCmdPalette] = useState(false);

  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCmdPalette(v => !v);
      }
      if (e.key === 'Escape') setShowCmdPalette(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Recently viewed ──────────────────────────────────────────────────────────
  const [recentIds, setRecentIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pomelo_recent_docs')) || [];
    } catch {
      return [];
    }
  });

  const openFullPage = doc => {
    setFullPageDoc(doc);
    const next = [doc.id, ...recentIds.filter(id => id !== doc.id)].slice(0, 5);
    setRecentIds(next);
    localStorage.setItem('pomelo_recent_docs', JSON.stringify(next));
  };

  const exitSelection = () => {
    setSelectionMode(false);
    manager.clearSelection();
    setShowBulkExportPicker(false);
  };

  // ── Category counts ──────────────────────────────────────────────────────────
  const catCounts = manager.docs.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {});
  const bookmarkCount = manager.bookmarks ? manager.bookmarks.length : 0;

  // ── Filter docs for display ──────────────────────────────────────────────────
  // contentMatchIds tracks docs that matched only via their content body (not
  // title/desc/tags). Stored in a Set rather than mutating the state objects.
  const contentMatchIds = new Set();
  const displayDocs = manager.docs.filter(d => {
    if (catTab !== 'All' && catTab !== '★ Bookmarked' && d.category !== catTab) return false;
    if (catTab === '★ Bookmarked' && !manager.isBookmarked(d.id)) return false;
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      const inTitle = d.title.toLowerCase().includes(q);
      const inDesc = (d.description || '').toLowerCase().includes(q);
      const inTags = (d.tags || []).some(t => t.toLowerCase().includes(q));
      const inContent = (d.content || '').toLowerCase().includes(q);
      if (!inTitle && !inDesc && !inTags && !inContent) return false;
      if (!inTitle && !inDesc && !inTags && inContent) contentMatchIds.add(d.id);
    }
    return true;
  });

  // ── Sort docs ────────────────────────────────────────────────────────────────
  const sortedDocs = [...displayDocs].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.updatedAt) - new Date(a.updatedAt);
    if (sortBy === 'oldest') return new Date(a.updatedAt) - new Date(b.updatedAt);
    if (sortBy === 'views') return (b.viewCount || 0) - (a.viewCount || 0);
    if (sortBy === 'az') return a.title.localeCompare(b.title);
    if (sortBy === 'za') return b.title.localeCompare(a.title);
    return 0;
  });

  const selectedIds = manager.selectedIds || [];
  const selectedDocs = displayDocs.filter(d => selectedIds.includes(d.id));
  const selectedCount = selectedIds.length;

  // ── Bulk operations ──────────────────────────────────────────────────────────

  const handleBulkArchive = async () => {
    setBulkWorking(true);
    const { error } = await bulkArchive(selectedIds);
    setBulkWorking(false);
    setShowArchiveConfirm(false);
    if (error) {
      showToast('error', `Archive failed: ${error}`);
    } else {
      showToast('success', `${selectedCount} document${selectedCount !== 1 ? 's' : ''} archived.`);
      await manager.loadDocs();
      manager.clearSelection();
    }
  };

  const handleBulkExportZip = async () => {
    setShowBulkExportPicker(false);
    setBulkWorking(true);
    await bulkZipExport(selectedDocs, bulkExportFmt);
    setBulkWorking(false);
    showToast(
      'success',
      `Exported ${selectedCount} document${selectedCount !== 1 ? 's' : ''} as ZIP (${bulkExportFmt}).`
    );
  };

  const handleBulkChangeCategory = async () => {
    if (!bulkCat) return;
    setBulkWorking(true);
    const results = await Promise.all(selectedIds.map(id => updateDoc(id, { category: bulkCat })));
    setBulkWorking(false);
    const failed = results.filter(r => r.error).length;
    if (failed > 0) {
      showToast('error', `${failed} update(s) failed.`);
    } else {
      showToast(
        'success',
        `Category updated to "${bulkCat}" for ${selectedCount} doc${selectedCount !== 1 ? 's' : ''}.`
      );
    }
    await manager.loadDocs();
    manager.clearSelection();
    setBulkCat('');
  };

  const handleBulkChangeVisibility = async () => {
    if (!bulkVis) return;
    setBulkWorking(true);
    const results = await Promise.all(
      selectedIds.map(id => updateDoc(id, { visibility: bulkVis }))
    );
    setBulkWorking(false);
    const failed = results.filter(r => r.error).length;
    if (failed > 0) {
      showToast('error', `${failed} update(s) failed.`);
    } else {
      showToast(
        'success',
        `Visibility set to "${bulkVis}" for ${selectedCount} doc${selectedCount !== 1 ? 's' : ''}.`
      );
    }
    await manager.loadDocs();
    manager.clearSelection();
    setBulkVis('');
  };

  const handleBulkBookmark = () => {
    let added = 0;
    selectedIds.forEach(id => {
      if (!manager.isBookmarked(id)) {
        manager.toggleBookmark(id);
        added++;
      }
    });
    showToast(
      'success',
      added > 0
        ? `${added} document${added !== 1 ? 's' : ''} bookmarked.`
        : 'All selected docs already bookmarked.'
    );
    manager.clearSelection();
  };

  // ── Export All ───────────────────────────────────────────────────────────────
  const handleExportAll = async () => {
    setShowExportPicker(false);
    setExportingAll(true);
    await bulkZipExport(displayDocs, exportAllFormat);
    setExportingAll(false);
  };

  if (fullPageDoc) {
    return (
      <DocFullPage
        doc={fullPageDoc}
        allDocs={manager.docs}
        onClose={() => setFullPageDoc(null)}
        onSelect={openFullPage}
      />
    );
  }

  const isAdmin = role === 'superadmin';

  // Inline styles for select/button reuse
  const selectStyle = {
    padding: '6px 10px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontFamily: "'Lato', sans-serif",
    fontSize: '12px',
    color: '#1A2B4A',
    background: '#fff',
    cursor: 'pointer',
    outline: 'none',
  };
  const applyBtnStyle = disabled => ({
    padding: '6px 12px',
    background: disabled ? '#E2E8F0' : '#1A2B4A',
    color: disabled ? '#94A3B8' : '#fff',
    border: 'none',
    borderRadius: '6px',
    fontFamily: "'Lato', sans-serif",
    fontWeight: 700,
    fontSize: '12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  });

  return (
    <>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        *:focus-visible { outline: 2px solid #E8632A !important; outline-offset: 2px !important; }
      `}</style>

      <div
        style={{
          display: 'flex',
          margin: '0 -28px',
          minHeight: '100%',
          fontFamily: "'Lato', sans-serif",
        }}
      >
        {/* Sidebar */}
        {activeTab === 'library' && !selectionMode && (
          <DocsSidebar
            docs={manager.docs}
            bookmarks={manager.bookmarks}
            isBookmarked={manager.isBookmarked}
            onSelect={setSidebarDoc}
          />
        )}

        <div style={{ flex: 1, minWidth: 0, padding: '0 28px 40px' }}>
          {/* Top bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '28px',
              marginBottom: '6px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#1A2B4A' }}>
                Documentation Library
              </div>
              <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>
                Guides, policies, and how-to articles from the IT team.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Enhanced search with debounce + clear */}
              <div style={{ position: 'relative' }}>
                <input
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="Search docs… (⌘K for more)"
                  aria-label="Search documents"
                  style={{
                    padding: '8px 32px 8px 12px',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '8px',
                    fontFamily: "'Lato', sans-serif",
                    fontSize: '13px',
                    outline: 'none',
                    background: '#F8F9FB',
                    color: '#1A2B4A',
                    minWidth: '200px',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedQuery('');
                    }}
                    aria-label="Clear search"
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      fontSize: '16px',
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Command palette button */}
              <button
                onClick={() => setShowCmdPalette(true)}
                title="Open command palette (⌘K)"
                style={{
                  padding: '7px 10px',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '7px',
                  fontSize: '11px',
                  color: '#64748B',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ⌘K
              </button>

              {/* Select mode toggle */}
              {activeTab === 'library' && (
                <>
                  <button
                    onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
                    aria-pressed={selectionMode}
                    style={{
                      padding: '8px 14px',
                      background: selectionMode ? '#F1F5F9' : 'transparent',
                      color: selectionMode ? '#DC2626' : '#475569',
                      border: `1.5px solid ${selectionMode ? '#FCA5A5' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {selectionMode ? '✕ Cancel' : '☑ Select'}
                  </button>
                  {selectionMode && (
                    <button
                      onClick={() => {
                        displayDocs.forEach(d => {
                          if (!selectedIds.includes(d.id)) manager.toggleSelected(d.id);
                        });
                      }}
                      style={{
                        padding: '8px 0',
                        background: 'none',
                        border: 'none',
                        color: '#1A2B4A',
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                      }}
                    >
                      Select All ({displayDocs.length})
                    </button>
                  )}
                </>
              )}

              {/* Export All with format picker */}
              {!selectionMode && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowExportPicker(v => !v)}
                    disabled={exportingAll || displayDocs.length === 0}
                    style={{
                      padding: '8px 16px',
                      background: exportingAll ? '#CBD5E1' : '#1A2B4A',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: exportingAll || displayDocs.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {exportingAll ? (
                      'Zipping…'
                    ) : (
                      <>
                        <span>↓ Export All</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span>
                      </>
                    )}
                  </button>

                  {showExportPicker && !exportingAll && (
                    <>
                      <div
                        onClick={() => setShowExportPicker(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          right: 0,
                          zIndex: 100,
                          background: '#fff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                          width: '260px',
                          overflow: 'hidden',
                          fontFamily: "'Lato', sans-serif",
                        }}
                      >
                        <div style={{ background: '#1A2B4A', padding: '12px 16px' }}>
                          <div style={{ color: '#fff', fontWeight: 900, fontSize: '13px' }}>
                            Export {displayDocs.length} document
                            {displayDocs.length !== 1 ? 's' : ''} as ZIP
                          </div>
                          <div
                            style={{
                              color: 'rgba(255,255,255,0.5)',
                              fontSize: '11px',
                              marginTop: '2px',
                            }}
                          >
                            Choose a format for all files
                          </div>
                        </div>
                        <div style={{ padding: '8px' }}>
                          {[
                            {
                              id: 'MD',
                              icon: '⬇️',
                              label: 'Markdown (.md)',
                              desc: 'Raw markdown text',
                            },
                            {
                              id: 'TXT',
                              icon: '📃',
                              label: 'Plain Text (.txt)',
                              desc: 'Stripped plain text',
                            },
                            {
                              id: 'CSV',
                              icon: '📊',
                              label: 'CSV (metadata)',
                              desc: 'Title, category, tags, date',
                            },
                          ].map(fmt => (
                            <button
                              key={fmt.id}
                              onClick={() => setExportAllFormat(fmt.id)}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 10px',
                                borderRadius: '8px',
                                border: `1.5px solid ${exportAllFormat === fmt.id ? '#1A2B4A' : 'transparent'}`,
                                background: exportAllFormat === fmt.id ? '#F0F4FF' : 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                                marginBottom: '2px',
                              }}
                            >
                              <span
                                style={{ fontSize: '17px', width: '22px', textAlign: 'center' }}
                              >
                                {fmt.icon}
                              </span>
                              <div>
                                <div
                                  style={{ fontSize: '12px', fontWeight: 700, color: '#1A2B4A' }}
                                >
                                  {fmt.label}
                                </div>
                                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{fmt.desc}</div>
                              </div>
                              {exportAllFormat === fmt.id && (
                                <span
                                  style={{ marginLeft: 'auto', color: '#1A2B4A', fontSize: '13px' }}
                                >
                                  ✓
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        <div style={{ padding: '0 8px 10px' }}>
                          <button
                            onClick={handleExportAll}
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: '#E8632A',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              fontFamily: "'Lato', sans-serif",
                              fontWeight: 700,
                              fontSize: '13px',
                              cursor: 'pointer',
                            }}
                          >
                            Download ZIP ({exportAllFormat})
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {isAdmin && !selectionMode && (
                <button
                  onClick={() => setShowUploader(true)}
                  style={{
                    padding: '8px 16px',
                    background: '#E8632A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  ↑ Upload Documents
                </button>
              )}
            </div>
          </div>

          {/* Admin stats header */}
          {isAdmin && activeTab === 'library' && (
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '10px',
                marginBottom: '4px',
                flexWrap: 'wrap',
              }}
            >
              {[
                { icon: '📄', label: 'Total', value: manager.totalDocs },
                {
                  icon: '✅',
                  label: 'Active',
                  value: manager.docs.filter(d => d.status === 'Active').length,
                },
                {
                  icon: '🔒',
                  label: 'IT Only',
                  value: manager.docs.filter(d => d.visibility === 'IT Team Only').length,
                },
                {
                  icon: '📦',
                  label: 'Archived',
                  value: manager.docs.filter(d => d.status === 'Archived').length,
                },
              ].map(stat => (
                <div
                  key={stat.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    background: '#F8F9FB',
                    border: '1px solid #E2E8F0',
                    borderRadius: '100px',
                    fontSize: '11px',
                    color: '#475569',
                    fontWeight: 600,
                  }}
                >
                  <span>{stat.icon}</span>
                  <span>
                    {stat.value} {stat.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '20px',
              borderBottom: '2px solid #E2E8F0',
              paddingBottom: '0',
              marginTop: '12px',
            }}
          >
            <button
              onClick={() => {
                setActiveTab('library');
                exitSelection();
              }}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'library' ? '#E8632A' : 'transparent'}`,
                background: 'transparent',
                color: activeTab === 'library' ? '#E8632A' : '#64748B',
                fontFamily: "'Lato', sans-serif",
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                marginBottom: '-2px',
              }}
            >
              📚 Library
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('manage');
                  exitSelection();
                }}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === 'manage' ? '#1A2B4A' : 'transparent'}`,
                  background: 'transparent',
                  color: activeTab === 'manage' ? '#1A2B4A' : '#64748B',
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginBottom: '-2px',
                }}
              >
                🛠 Manage Docs
              </button>
            )}
          </div>

          {/* ── Library tab ──────────────────────────────────────────────────── */}
          {activeTab === 'library' && (
            <>
              {/* Category filter pills with counts */}
              <div
                role="tablist"
                style={{
                  display: 'flex',
                  gap: '4px',
                  flexWrap: 'wrap',
                  marginBottom: selectedCount > 0 ? '12px' : '8px',
                  overflowX: 'auto',
                  paddingBottom: '2px',
                }}
              >
                {['All', '★ Bookmarked', ...DOC_CATEGORIES].map(cat => {
                  const count =
                    cat === 'All'
                      ? manager.docs.length
                      : cat === '★ Bookmarked'
                        ? bookmarkCount
                        : catCounts[cat] || 0;
                  const isActive = catTab === cat;
                  return (
                    <button
                      key={cat}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        setCatTab(cat);
                        manager.setPage(1);
                      }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '100px',
                        border: `1.5px solid ${isActive ? '#E8632A' : '#E2E8F0'}`,
                        background: isActive ? '#E8632A' : '#fff',
                        color: isActive ? '#fff' : '#475569',
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.12s',
                      }}
                    >
                      {cat}{' '}
                      {count > 0 && (
                        <span
                          style={{
                            background: isActive ? 'rgba(255,255,255,0.3)' : '#F1F5F9',
                            color: isActive ? '#fff' : '#64748B',
                            padding: '0px 5px',
                            borderRadius: '100px',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sort bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Sort:
                </span>
                {[
                  ['newest', 'Newest'],
                  ['oldest', 'Oldest'],
                  ['views', 'Most Viewed'],
                  ['az', 'A–Z'],
                  ['za', 'Z–A'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSortBy(val)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '3px 0',
                      fontSize: '12px',
                      fontWeight: sortBy === val ? 700 : 400,
                      color: sortBy === val ? '#E8632A' : '#64748B',
                      cursor: 'pointer',
                      fontFamily: "'Lato', sans-serif",
                      borderBottom: sortBy === val ? '2px solid #E8632A' : '2px solid transparent',
                    }}
                  >
                    {label}
                  </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94A3B8' }}>
                  {displayDocs.length} document{displayDocs.length !== 1 ? 's' : ''}
                  {manager.totalDocs > displayDocs.length ? ` of ${manager.totalDocs}` : ''}
                </span>
              </div>

              {/* Search result count */}
              {debouncedQuery && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748B',
                    marginBottom: '12px',
                    paddingLeft: '2px',
                  }}
                >
                  {displayDocs.length === 0
                    ? 'No results'
                    : `${displayDocs.length} result${displayDocs.length !== 1 ? 's' : ''}`}{' '}
                  for "<strong>{debouncedQuery}</strong>"
                </div>
              )}

              {/* ── Bulk action bar ─────────────────────────────────────────────── */}
              {selectionMode && selectedCount > 0 && (
                <div
                  role="toolbar"
                  aria-label="Bulk actions"
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderLeft: '4px solid #1A2B4A',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Count label */}
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 900,
                      color: '#1A2B4A',
                      whiteSpace: 'nowrap',
                      marginRight: '4px',
                    }}
                  >
                    {selectedCount} of {displayDocs.length} selected
                  </span>

                  <div
                    style={{ width: '1px', height: '24px', background: '#E2E8F0', flexShrink: 0 }}
                  />

                  {/* Archive — admin only */}
                  {isAdmin && (
                    <button
                      onClick={() => setShowArchiveConfirm(true)}
                      disabled={bulkWorking}
                      style={{
                        padding: '7px 14px',
                        background: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FCA5A5',
                        borderRadius: '7px',
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: bulkWorking ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🗑 Archive
                    </button>
                  )}

                  {/* Export ZIP */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowBulkExportPicker(v => !v)}
                      disabled={bulkWorking}
                      style={{
                        padding: '7px 14px',
                        background: '#F0F4FF',
                        color: '#1A2B4A',
                        border: '1px solid #BFDBFE',
                        borderRadius: '7px',
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: bulkWorking ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ↓ Export ZIP <span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span>
                    </button>
                    {showBulkExportPicker && (
                      <>
                        <div
                          onClick={() => setShowBulkExportPicker(false)}
                          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            zIndex: 100,
                            background: '#fff',
                            border: '1px solid #E2E8F0',
                            borderRadius: '10px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                            width: '230px',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ background: '#1A2B4A', padding: '10px 14px' }}>
                            <div style={{ color: '#fff', fontWeight: 900, fontSize: '12px' }}>
                              Export {selectedCount} doc{selectedCount !== 1 ? 's' : ''} as ZIP
                            </div>
                          </div>
                          <div style={{ padding: '6px' }}>
                            {[
                              { id: 'MD', label: 'Markdown (.md)' },
                              { id: 'TXT', label: 'Plain Text (.txt)' },
                              { id: 'CSV', label: 'CSV (metadata)' },
                            ].map(fmt => (
                              <button
                                key={fmt.id}
                                onClick={() => setBulkExportFmt(fmt.id)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '7px',
                                  border: `1.5px solid ${bulkExportFmt === fmt.id ? '#1A2B4A' : 'transparent'}`,
                                  background: bulkExportFmt === fmt.id ? '#F0F4FF' : 'transparent',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontSize: '12px',
                                  fontFamily: "'Lato', sans-serif",
                                  fontWeight: 700,
                                  color: '#1A2B4A',
                                  marginBottom: '2px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                {fmt.label}
                                {bulkExportFmt === fmt.id && (
                                  <span style={{ color: '#1A2B4A' }}>✓</span>
                                )}
                              </button>
                            ))}
                          </div>
                          <div style={{ padding: '0 6px 8px' }}>
                            <button
                              onClick={handleBulkExportZip}
                              style={{
                                width: '100%',
                                padding: '9px',
                                background: '#E8632A',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '7px',
                                fontFamily: "'Lato', sans-serif",
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Download ZIP ({bulkExportFmt})
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Change Category — admin only */}
                  {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <select
                        value={bulkCat}
                        onChange={e => setBulkCat(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">Category…</option>
                        {DOC_CATEGORIES.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleBulkChangeCategory}
                        disabled={!bulkCat || bulkWorking}
                        style={applyBtnStyle(!bulkCat || bulkWorking)}
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {/* Change Visibility — admin only */}
                  {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <select
                        value={bulkVis}
                        onChange={e => setBulkVis(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">Visibility…</option>
                        {VISIBILITY_OPTIONS.map(v => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleBulkChangeVisibility}
                        disabled={!bulkVis || bulkWorking}
                        style={applyBtnStyle(!bulkVis || bulkWorking)}
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {/* Bookmark All */}
                  <button
                    onClick={handleBulkBookmark}
                    disabled={bulkWorking}
                    style={{
                      padding: '7px 14px',
                      background: '#FFFBEB',
                      color: '#D97706',
                      border: '1px solid #FDE68A',
                      borderRadius: '7px',
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: bulkWorking ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ★ Bookmark All
                  </button>

                  {/* Clear */}
                  <button
                    onClick={() => manager.clearSelection()}
                    style={{
                      padding: '7px 14px',
                      background: 'transparent',
                      color: '#94A3B8',
                      border: '1px solid #E2E8F0',
                      borderRadius: '7px',
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginLeft: 'auto',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ✕ Clear
                  </button>
                </div>
              )}

              {/* Selection mode hint when nothing selected yet */}
              {selectionMode && selectedCount === 0 && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F0F4FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    color: '#2563EB',
                    fontWeight: 700,
                  }}
                >
                  Click any document card to select it. Use "Select All" to select all visible
                  documents.
                </div>
              )}

              {/* Recently Viewed strip */}
              {!debouncedQuery && catTab === 'All' && recentIds.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#94A3B8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '10px',
                    }}
                  >
                    🕐 Recently Viewed
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {recentIds.slice(0, 3).map(id => {
                      const doc = manager.docs.find(d => d.id === id);
                      if (!doc) return null;
                      return (
                        <button
                          key={id}
                          onClick={() => openFullPage(doc)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 14px',
                            background: '#fff',
                            border: '1px solid #E2E8F0',
                            borderRadius: '100px',
                            cursor: 'pointer',
                            fontFamily: "'Lato', sans-serif",
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = '#E8632A')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
                        >
                          <span>{doc.icon}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A2B4A' }}>
                            {doc.title}
                          </span>
                          <span style={{ fontSize: '10px', color: '#94A3B8' }}>{doc.category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skeleton loading */}
              {manager.loading && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '14px',
                    marginBottom: '40px',
                  }}
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}

              {/* Error */}
              {manager.docsError && (
                <div
                  style={{
                    padding: '14px 18px',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px',
                    color: '#DC2626',
                    fontSize: '13px',
                    fontWeight: 700,
                    marginBottom: '16px',
                  }}
                >
                  ⚠ {manager.docsError}
                </div>
              )}

              {/* Cards grid */}
              {!manager.loading && sortedDocs.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '14px',
                    marginBottom: '40px',
                  }}
                >
                  {sortedDocs.map(doc => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      role={role}
                      isBookmarked={manager.isBookmarked(doc.id)}
                      onToggleBookmark={manager.toggleBookmark}
                      onOpen={setSidebarDoc}
                      onFullPage={openFullPage}
                      onEdit={setEditingDoc}
                      selectionMode={selectionMode}
                      isSelected={selectedIds.includes(doc.id)}
                      onToggleSelect={manager.toggleSelected}
                      searchQuery={debouncedQuery}
                      matchedContent={contentMatchIds.has(doc.id)}
                    />
                  ))}
                </div>
              )}

              {/* Load more */}
              {manager.totalDocs > sortedDocs.length + (manager.page - 1) * 20 &&
                !manager.loading && (
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                      onClick={() => manager.setPage(p => p + 1)}
                      style={{
                        padding: '10px 28px',
                        background: '#fff',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: '100px',
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: '#475569',
                      }}
                    >
                      Load more documents
                    </button>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                      Showing {sortedDocs.length} of {manager.totalDocs}
                    </div>
                  </div>
                )}

              {/* Empty state */}
              {!manager.loading && displayDocs.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 40px',
                    background: '#fff',
                    border: '1px dashed #E2E8F0',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: '16px',
                      color: '#1A2B4A',
                      marginBottom: '6px',
                    }}
                  >
                    No documents found
                  </div>
                  <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
                    {localSearch || catTab !== 'All'
                      ? 'Try clearing your filters.'
                      : 'No documents have been uploaded yet.'}
                  </div>
                  {isAdmin && catTab === 'All' && !localSearch && (
                    <button
                      onClick={() => setShowUploader(true)}
                      style={{
                        padding: '10px 22px',
                        background: '#E8632A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      ↑ Upload the first document
                    </button>
                  )}
                </div>
              )}

              {/* Sidebar doc detail panel */}
              {sidebarDoc && !selectionMode && (
                <>
                  <div
                    onClick={() => setSidebarDoc(null)}
                    style={{ position: 'fixed', inset: 0, zIndex: 300 }}
                  />
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      width: '400px',
                      maxWidth: '95vw',
                      background: '#fff',
                      borderLeft: '1px solid #E2E8F0',
                      boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
                      zIndex: 301,
                      overflowY: 'auto',
                      padding: '28px 24px',
                      fontFamily: "'Lato', sans-serif",
                      animation: 'slideUp 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '18px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '100px',
                            background: '#F1F5F9',
                            color: '#64748B',
                          }}
                        >
                          {sidebarDoc.category}
                        </span>
                      </div>
                      <button
                        onClick={() => setSidebarDoc(null)}
                        aria-label="Close"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94A3B8',
                          fontSize: '20px',
                          lineHeight: 1,
                          padding: '2px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ fontSize: '30px', marginBottom: '10px' }}>{sidebarDoc.icon}</div>
                    <h2
                      style={{
                        fontSize: '20px',
                        fontWeight: 900,
                        color: '#1A2B4A',
                        marginBottom: '8px',
                        lineHeight: 1.2,
                      }}
                    >
                      {sidebarDoc.title}
                    </h2>
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#64748B',
                        lineHeight: 1.6,
                        marginBottom: '20px',
                      }}
                    >
                      {sidebarDoc.description || sidebarDoc.summary}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {sidebarDoc.version && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          v{sidebarDoc.version}
                        </span>
                      )}
                      {sidebarDoc.author && (
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          By {sidebarDoc.author}
                        </span>
                      )}
                    </div>
                    {(sidebarDoc.tags || []).length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '4px',
                          flexWrap: 'wrap',
                          marginBottom: '20px',
                        }}
                      >
                        {sidebarDoc.tags.map(t => (
                          <span
                            key={t}
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '100px',
                              background: '#F1F5F9',
                              color: '#475569',
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        openFullPage(sidebarDoc);
                        setSidebarDoc(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#E8632A',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        marginBottom: '8px',
                      }}
                    >
                      Read full article →
                    </button>
                    <button
                      onClick={() => {
                        manager.toggleBookmark(sidebarDoc.id);
                      }}
                      aria-label={
                        manager.isBookmarked(sidebarDoc.id) ? 'Remove bookmark' : 'Add bookmark'
                      }
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'transparent',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: '8px',
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        color: '#475569',
                      }}
                    >
                      {manager.isBookmarked(sidebarDoc.id) ? '★ Bookmarked' : '☆ Bookmark'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Manage Docs tab (admin only) ──────────────────────────────── */}
          {activeTab === 'manage' && isAdmin && (
            <DocAdminPanel
              docs={manager.docs}
              onRefresh={manager.loadDocs}
              onEdit={setEditingDoc}
            />
          )}
        </div>

        {/* Uploader modal */}
        {showUploader && (
          <UploaderModal
            manager={manager}
            currentUser={currentUser}
            onClose={() => {
              setShowUploader(false);
              manager.loadDocs();
            }}
          />
        )}

        {/* Edit modal */}
        {editingDoc && (
          <DocEditModal
            doc={editingDoc}
            onSave={() => {
              manager.loadDocs();
              setEditingDoc(null);
            }}
            onClose={() => setEditingDoc(null)}
          />
        )}

        {/* Archive confirm modal */}
        {showArchiveConfirm && (
          <ArchiveConfirmModal
            count={selectedCount}
            onCancel={() => setShowArchiveConfirm(false)}
            onConfirm={handleBulkArchive}
            working={bulkWorking}
          />
        )}

        {/* Command palette */}
        {showCmdPalette && (
          <>
            <div
              onClick={() => setShowCmdPalette(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 800 }}
            />
            <CmdPalette
              docs={manager.docs}
              onSelectDoc={doc => {
                openFullPage(doc);
                setShowCmdPalette(false);
              }}
              onAction={action => {
                setShowCmdPalette(false);
                if (action === 'upload') setShowUploader(true);
                if (action === 'manage') {
                  setActiveTab('manage');
                  exitSelection();
                }
                if (action === 'select') setSelectionMode(true);
              }}
              onClose={() => setShowCmdPalette(false)}
            />
          </>
        )}
      </div>

      {/* Toast stack */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 900,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
        aria-live="polite"
        role="status"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              minWidth: '280px',
              maxWidth: '380px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              background:
                t.type === 'success' ? '#F0FDF4' : t.type === 'error' ? '#FEF2F2' : '#EFF6FF',
              border: `1px solid ${t.type === 'success' ? '#BBF7D0' : t.type === 'error' ? '#FCA5A5' : '#BFDBFE'}`,
              fontFamily: "'Lato', sans-serif",
              animation: 'slideUp 0.2s ease',
            }}
          >
            <span style={{ fontSize: '16px' }}>
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: '13px',
                fontWeight: 600,
                color: '#1A2B4A',
                lineHeight: 1.4,
              }}
            >
              {t.msg}
            </span>
            <button
              onClick={() => dismissToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                fontSize: '16px',
                lineHeight: 1,
                padding: '0 0 0 4px',
              }}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
