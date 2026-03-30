// src/components/docs/DocImportExportPage.jsx
// Full upgraded Documentation page — replaces the existing DocsPage.
// Assembles DocCard, DocUploader, DocExporter, DocAdminPanel with useDocumentManager.

import { useState, useEffect } from 'react';
import useDocumentManager from '../../hooks/useDocumentManager.js';
import DocCard from './DocCard.jsx';
import DocUploader from './DocUploader.jsx';
import DocAdminPanel from './DocAdminPanel.jsx';
import { bulkZipExport } from './DocExporter.jsx';
import { DOC_CATEGORIES } from '../../mocks/docsMockData.js';

const ALL_CAT_TABS = ['All', ...DOC_CATEGORIES];

// ─── Uploader modal wrapper ────────────────────────────────────────────────────
function UploaderModal({ manager, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: '16px', zIndex: 501, width: '720px', maxWidth: '96vw', maxHeight: '90vh', boxShadow: '0 24px 72px rgba(0,0,0,0.22)', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Lato', sans-serif" }}>
        <div style={{ background: '#1A2B4A', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: '16px' }}>Upload Documents</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: '2px' }}>Drag files or click to browse — PDF, DOCX, MD, TXT, CSV and more</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <DocUploader
            queue={manager.queue}
            addToQueue={manager.addToQueue}
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

  const renderContent = (content) => {
    if (!content) return null;
    return content.split('\n').map((line, i) => {
      if (/^###\s/.test(line)) return <h3 key={i} style={{ fontSize: '16px', fontWeight: 700, color: '#1A2B4A', margin: '20px 0 8px' }}>{line.replace(/^###\s/, '')}</h3>;
      if (/^##\s/.test(line))  return <h2 key={i} style={{ fontSize: '19px', fontWeight: 900, color: '#1A2B4A', margin: '28px 0 10px', borderBottom: '2px solid #E8632A', paddingBottom: '6px' }}>{line.replace(/^##\s/, '')}</h2>;
      if (/^#\s/.test(line))   return null; // title already shown
      if (/^-\s/.test(line))   return <li key={i} style={{ fontSize: '14px', color: '#374151', lineHeight: 1.7, marginBottom: '4px' }}>{line.replace(/^-\s/, '').replace(/\*\*(.+?)\*\*/g, '$1')}</li>;
      if (line.trim() === '')  return <div key={i} style={{ height: '10px' }} />;
      return <p key={i} style={{ fontSize: '14px', color: '#374151', lineHeight: 1.8, marginBottom: '10px' }}>{line.replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
    });
  };

  return (
    <div style={{ display: 'flex', margin: '0 -28px', minHeight: '100%' }}>
      {/* Sidebar */}
      <div style={{ width: '260px', flexShrink: 0, borderRight: '1px solid #E2E8F0', padding: '28px 16px', background: '#F8F9FB' }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#E8632A', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          ← Back to library
        </button>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>All Documents</div>
        {otherDocs.map(d => (
          <button key={d.id} onClick={() => onSelect(d)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 10px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', marginBottom: '2px', fontFamily: "'Lato', sans-serif' " }}
            onMouseEnter={e => e.currentTarget.style.background = '#E8632A14'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A2B4A' }}>{d.icon} {d.title}</div>
            <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>{d.category}</div>
          </button>
        ))}
      </div>

      {/* Article content */}
      <div style={{ flex: 1, padding: '36px 40px', maxWidth: '780px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: '#F1F5F9', color: '#64748B' }}>{doc.category}</span>
          {doc.version && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>v{doc.version}</span>}
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 900, color: '#1A2B4A', marginBottom: '8px', lineHeight: 1.2 }}>{doc.icon} {doc.title}</h1>
        <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '28px' }}>
          {doc.author && `By ${doc.author}`}
          {doc.author && doc.updatedAt && ' · '}
          {doc.updatedAt && `Updated ${new Date(doc.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        </div>
        <div style={{ borderBottom: '2px solid #E2E8F0', marginBottom: '28px' }} />
        {renderContent(doc.content)}
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
function DocsSidebar({ docs, bookmarks, onSelect, isBookmarked }) {
  const bookmarkedDocs = docs.filter(d => isBookmarked(d.id));
  const categories = Array.from(new Set(docs.map(d => d.category)));

  return (
    <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid #E2E8F0', padding: '28px 16px', background: '#F8F9FB' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Categories</div>
      {categories.map(cat => {
        const count = docs.filter(d => d.category === cat).length;
        return (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 8px', borderRadius: '7px', marginBottom: '2px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#E8632A14'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>{cat}</span>
            <span style={{ fontSize: '10px', fontWeight: 700, background: '#E2E8F0', color: '#64748B', padding: '1px 6px', borderRadius: '100px' }}>{count}</span>
          </div>
        );
      })}

      {bookmarkedDocs.length > 0 && (
        <>
          <div style={{ borderTop: '1px solid #E2E8F0', margin: '16px 0 12px' }} />
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>★ Bookmarked</div>
          {bookmarkedDocs.map(d => (
            <button key={d.id} onClick={() => onSelect(d)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 8px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: "'Lato', sans-serif", marginBottom: '2px' }}
              onMouseEnter={e => e.currentTarget.style.background = '#E8632A14'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A2B4A' }}>{d.icon} {d.title}</div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

// ─── DocImportExportPage ───────────────────────────────────────────────────────
export default function DocImportExportPage({ role, suggestions, setSuggestions, currentUser }) {
  const manager = useDocumentManager();

  const [activeTab, setActiveTab]         = useState('library');  // 'library' | 'manage'
  const [catTab, setCatTab]               = useState('All');
  const [fullPageDoc, setFullPageDoc]     = useState(null);
  const [sidebarDoc, setSidebarDoc]       = useState(null);
  const [showUploader, setShowUploader]     = useState(false);
  const [exportingAll, setExportingAll]     = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [exportAllFormat, setExportAllFormat]   = useState('MD');
  const [localSearch, setLocalSearch]       = useState('');

  // Filter docs for display
  const displayDocs = manager.docs.filter(d => {
    if (catTab !== 'All' && d.category !== catTab) return false;
    if (localSearch) {
      const q = localSearch.toLowerCase();
      return d.title.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q) || (d.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

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
        onSelect={setFullPageDoc}
      />
    );
  }

  const isAdmin = role === 'superadmin';

  return (
    <div style={{ display: 'flex', margin: '0 -28px', minHeight: '100%', fontFamily: "'Lato', sans-serif" }}>

      {/* Sidebar */}
      {activeTab === 'library' && (
        <DocsSidebar
          docs={manager.docs}
          bookmarks={manager.bookmarks}
          isBookmarked={manager.isBookmarked}
          onSelect={setSidebarDoc}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, padding: '0 28px 40px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '28px', marginBottom: '6px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#1A2B4A' }}>Documentation Library</div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '2px' }}>Guides, policies, and how-to articles from the IT team.</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search docs…"
              style={{ padding: '8px 12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontFamily: "'Lato', sans-serif", fontSize: '13px', outline: 'none', background: '#F8F9FB', color: '#1A2B4A', minWidth: '180px' }}
            />
            {/* Export All with format picker */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportPicker(v => !v)}
                disabled={exportingAll || displayDocs.length === 0}
                style={{ padding: '8px 16px', background: exportingAll ? '#CBD5E1' : '#1A2B4A', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '13px', cursor: exportingAll || displayDocs.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {exportingAll ? 'Zipping…' : <><span>↓ Export All</span><span style={{ fontSize: '10px', opacity: 0.7 }}>▾</span></>}
              </button>

              {showExportPicker && !exportingAll && (
                <>
                  {/* Backdrop */}
                  <div onClick={() => setShowExportPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                  {/* Picker */}
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100, background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', width: '260px', overflow: 'hidden', fontFamily: "'Lato', sans-serif" }}>
                    <div style={{ background: '#1A2B4A', padding: '12px 16px' }}>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: '13px' }}>Export {displayDocs.length} document{displayDocs.length !== 1 ? 's' : ''} as ZIP</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>Choose a format for all files</div>
                    </div>
                    <div style={{ padding: '8px' }}>
                      {[
                        { id: 'MD',  icon: '⬇️', label: 'Markdown (.md)',    desc: 'Raw markdown text' },
                        { id: 'TXT', icon: '📃', label: 'Plain Text (.txt)', desc: 'Stripped plain text' },
                        { id: 'CSV', icon: '📊', label: 'CSV (metadata)',    desc: 'Title, category, tags, date' },
                      ].map(fmt => (
                        <button key={fmt.id} onClick={() => setExportAllFormat(fmt.id)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', border: `1.5px solid ${exportAllFormat === fmt.id ? '#1A2B4A' : 'transparent'}`, background: exportAllFormat === fmt.id ? '#F0F4FF' : 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: '2px' }}>
                          <span style={{ fontSize: '17px', width: '22px', textAlign: 'center' }}>{fmt.icon}</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A2B4A' }}>{fmt.label}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{fmt.desc}</div>
                          </div>
                          {exportAllFormat === fmt.id && <span style={{ marginLeft: 'auto', color: '#1A2B4A', fontSize: '13px' }}>✓</span>}
                        </button>
                      ))}
                    </div>
                    <div style={{ padding: '0 8px 10px' }}>
                      <button onClick={handleExportAll} style={{ width: '100%', padding: '10px', background: '#E8632A', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                        Download ZIP ({exportAllFormat})
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {isAdmin && (
              <button onClick={() => setShowUploader(true)} style={{ padding: '8px 16px', background: '#E8632A', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                ↑ Upload Documents
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #E2E8F0', paddingBottom: '0' }}>
          <button onClick={() => setActiveTab('library')} style={{ padding: '10px 16px', border: 'none', borderBottom: `2px solid ${activeTab === 'library' ? '#E8632A' : 'transparent'}`, background: 'transparent', color: activeTab === 'library' ? '#E8632A' : '#64748B', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '-2px' }}>
            📚 Library
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('manage')} style={{ padding: '10px 16px', border: 'none', borderBottom: `2px solid ${activeTab === 'manage' ? '#1A2B4A' : 'transparent'}`, background: 'transparent', color: activeTab === 'manage' ? '#1A2B4A' : '#64748B', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '-2px' }}>
              🛠 Manage Docs
            </button>
          )}
        </div>

        {/* ── Library tab ──────────────────────────────────────────────────── */}
        {activeTab === 'library' && (
          <>
            {/* Category filter pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {ALL_CAT_TABS.map(cat => (
                <button key={cat} onClick={() => setCatTab(cat)} style={{ padding: '6px 14px', borderRadius: '100px', border: '1.5px solid', borderColor: catTab === cat ? '#E8632A' : '#E2E8F0', background: catTab === cat ? '#FFF5F0' : '#fff', color: catTab === cat ? '#E8632A' : '#64748B', fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Loading */}
            {manager.loading && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8', fontSize: '14px' }}>Loading documents…</div>
            )}

            {/* Error */}
            {manager.docsError && (
              <div style={{ padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#DC2626', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
                ⚠ {manager.docsError}
              </div>
            )}

            {/* Cards grid */}
            {!manager.loading && displayDocs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', marginBottom: '40px' }}>
                {displayDocs.map(doc => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    role={role}
                    isBookmarked={manager.isBookmarked(doc.id)}
                    onToggleBookmark={manager.toggleBookmark}
                    onOpen={setSidebarDoc}
                    onFullPage={setFullPageDoc}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!manager.loading && displayDocs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 40px', background: '#fff', border: '1px dashed #E2E8F0', borderRadius: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
                <div style={{ fontWeight: 900, fontSize: '16px', color: '#1A2B4A', marginBottom: '6px' }}>No documents found</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
                  {localSearch || catTab !== 'All' ? 'Try clearing your filters.' : 'No documents have been uploaded yet.'}
                </div>
                {isAdmin && catTab === 'All' && !localSearch && (
                  <button onClick={() => setShowUploader(true)} style={{ padding: '10px 22px', background: '#E8632A', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                    ↑ Upload the first document
                  </button>
                )}
              </div>
            )}

            {/* Sidebar doc detail panel */}
            {sidebarDoc && (
              <>
                <div onClick={() => setSidebarDoc(null)} style={{ position: 'fixed', inset: 0, zIndex: 300 }} />
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', maxWidth: '95vw', background: '#fff', borderLeft: '1px solid #E2E8F0', boxShadow: '-8px 0 32px rgba(0,0,0,0.1)', zIndex: 301, overflowY: 'auto', padding: '28px 24px', fontFamily: "'Lato', sans-serif", animation: 'slideIn 0.2s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', background: '#F1F5F9', color: '#64748B' }}>{sidebarDoc.category}</span>
                    </div>
                    <button onClick={() => setSidebarDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '20px', lineHeight: 1, padding: '2px' }}>×</button>
                  </div>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>{sidebarDoc.icon}</div>
                  <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1A2B4A', marginBottom: '8px', lineHeight: 1.2 }}>{sidebarDoc.title}</h2>
                  <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>{sidebarDoc.description || sidebarDoc.summary}</p>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {sidebarDoc.version && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>v{sidebarDoc.version}</span>}
                    {sidebarDoc.author && <span style={{ fontSize: '11px', color: '#64748B' }}>By {sidebarDoc.author}</span>}
                  </div>
                  {(sidebarDoc.tags || []).length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      {sidebarDoc.tags.map(t => (
                        <span key={t} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: '#F1F5F9', color: '#475569' }}>#{t}</span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => { setFullPageDoc(sidebarDoc); setSidebarDoc(null); }} style={{ width: '100%', padding: '12px', background: '#E8632A', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer', marginBottom: '8px' }}>
                    Read full article →
                  </button>
                  <button onClick={() => { manager.toggleBookmark(sidebarDoc.id); }} style={{ width: '100%', padding: '11px', background: 'transparent', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer', color: '#475569' }}>
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
          />
        )}
      </div>

      {/* Uploader modal */}
      {showUploader && (
        <UploaderModal
          manager={manager}
          onClose={() => { setShowUploader(false); manager.loadDocs(); }}
        />
      )}
    </div>
  );
}
