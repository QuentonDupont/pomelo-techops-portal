// src/components/docs/DocEditModal.jsx
// Full document editor — metadata + markdown content with live preview.

import { useState, useEffect } from 'react';
import { updateDoc } from '../../api/docsApi.js';
import { DOC_CATEGORIES } from '../../mocks/docsMockData.js';
import { MarkdownView } from './MarkdownView.jsx';

const ICON_OPTIONS = [
  '📄',
  '📝',
  '⬇️',
  '📃',
  '📊',
  '📈',
  '📑',
  '🔒',
  '🛡️',
  '💻',
  '🖥️',
  '☁️',
  '🔐',
  '💬',
  '📋',
  '📡',
  '🏷️',
  '🚀',
  '📂',
  '📌',
];

// Live preview — delegates to the shared MarkdownView renderer.
function PreviewPane({ content }) {
  if (!content)
    return (
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: '13px',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        Nothing to preview yet.
      </div>
    );
  return <MarkdownView content={content} />;
}

// ─── DocEditModal ──────────────────────────────────────────────────────────────
export default function DocEditModal({ doc, onSave, onClose }) {
  const [form, setForm] = useState({
    title: doc.title || '',
    description: doc.description || '',
    category: doc.category || 'Other',
    tags: (doc.tags || []).join(', '),
    author: doc.author || '',
    version: doc.version || '1.0',
    visibility: doc.visibility || 'Public',
    icon: doc.icon || '📄',
    content: doc.content || '',
  });
  const [tab, setTab] = useState('details'); // 'details' | 'content'
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    const updates = {
      ...form,
      tags: form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    };
    const { error: apiError } = await updateDoc(doc.id, updates);
    setSaving(false);
    if (apiError) {
      setError(apiError);
      return;
    }
    onSave();
    onClose();
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1.5px solid var(--border-default)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '13px',
    color: 'var(--text-primary)',
    background: 'var(--bg-page)',
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '5px',
  };
  const tabBtn = (id, label) => (
    <button
      onClick={() => setTab(id)}
      style={{
        padding: '8px 18px',
        border: 'none',
        borderBottom: `2px solid ${tab === id ? 'var(--accent-primary)' : 'transparent'}`,
        background: 'transparent',
        color: tab === id ? 'var(--accent-primary)' : 'var(--text-secondary)',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
        marginBottom: '-1px',
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 700 }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'var(--bg-elevated)',
          borderRadius: '16px',
          zIndex: 701,
          width: '860px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          boxShadow: '0 28px 80px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--text-primary)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Icon picker */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowIconPicker(v => !v)}
                style={{
                  fontSize: '26px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  width: '48px',
                  height: '48px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {form.icon}
              </button>
              {showIconPicker && (
                <>
                  <div
                    onClick={() => setShowIconPicker(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 800 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      zIndex: 801,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      padding: '10px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      width: '220px',
                    }}
                  >
                    {ICON_OPTIONS.map(icon => (
                      <button
                        key={icon}
                        onClick={() => {
                          setForm(f => ({ ...f, icon }));
                          setShowIconPicker(false);
                        }}
                        style={{
                          fontSize: '22px',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: `2px solid ${form.icon === icon ? 'var(--accent-primary)' : 'transparent'}`,
                          background: form.icon === icon ? 'var(--accent-soft)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: '16px' }}>Edit Document</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' }}>
                {doc.id}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            borderBottom: '1px solid var(--border-default)',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          {tabBtn('details', '📋 Details')}
          {tabBtn('content', '✏️ Content')}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* ── Details tab ──────────────────────────────────────────────── */}
          {tab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Title */}
              <div>
                <label style={labelStyle}>Title</label>
                <input
                  value={form.title}
                  onChange={set('title')}
                  style={inputStyle}
                  placeholder="Document title"
                />
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={form.description}
                  onChange={set('description')}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                  placeholder="Short description shown on the card"
                />
              </div>

              {/* 2-col grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={form.category}
                    onChange={set('category')}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {DOC_CATEGORIES.map(c => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Version</label>
                  <input
                    value={form.version}
                    onChange={set('version')}
                    style={inputStyle}
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Author</label>
                  <input
                    value={form.author}
                    onChange={set('author')}
                    style={inputStyle}
                    placeholder="Author name"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Format</label>
                  <input
                    value={doc.format || '—'}
                    readOnly
                    style={{
                      ...inputStyle,
                      background: 'var(--bg-hover)',
                      color: 'var(--text-muted)',
                      cursor: 'default',
                    }}
                    title="Format is set at upload time"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label style={labelStyle}>
                  Tags{' '}
                  <span
                    style={{
                      fontWeight: 400,
                      textTransform: 'none',
                      letterSpacing: 0,
                      color: 'var(--text-muted)',
                    }}
                  >
                    (comma-separated)
                  </span>
                </label>
                <input
                  value={form.tags}
                  onChange={set('tags')}
                  style={inputStyle}
                  placeholder="vpn, security, onboarding"
                />
                {/* Tag preview */}
                {form.tags && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {form.tags
                      .split(',')
                      .map(t => t.trim())
                      .filter(Boolean)
                      .map(t => (
                        <span
                          key={t}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '100px',
                            background: 'var(--bg-hover)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          #{t}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div>
                <label style={labelStyle}>Visibility</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    ['Public', '🌐', 'Visible to all staff'],
                    ['IT Team Only', '🔒', 'Visible to IT team only'],
                  ].map(([val, icon, desc]) => (
                    <button
                      key={val}
                      onClick={() => setForm(f => ({ ...f, visibility: val }))}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '10px',
                        border: `2px solid ${form.visibility === val ? 'var(--text-primary)' : 'var(--border-default)'}`,
                        background:
                          form.visibility === val ? 'var(--text-primary)' : 'var(--bg-page)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: form.visibility === val ? '#fff' : 'var(--text-primary)',
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {val}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color:
                            form.visibility === val ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                          fontFamily: "'Inter', sans-serif",
                          marginTop: '2px',
                        }}
                      >
                        {desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Content tab ───────────────────────────────────────────────── */}
          {tab === 'content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  MARKDOWN EDITOR
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  {/* Quick-insert toolbar */}
                  {[
                    ['##', '## Heading'],
                    ['**b**', '**bold**'],
                    ['`c`', '`code`'],
                    ['- ', '- list item'],
                  ].map(([label, insert]) => (
                    <button
                      key={label}
                      onClick={() => {
                        const ta = document.getElementById('doc-content-editor');
                        if (!ta) return;
                        const start = ta.selectionStart;
                        const end = ta.selectionEnd;
                        const sel = form.content.slice(start, end);
                        const replacement = sel ? insert.replace(/\s*$/, ' ' + sel) : insert + ' ';
                        const next =
                          form.content.slice(0, start) + replacement + form.content.slice(end);
                        setForm(f => ({ ...f, content: next }));
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'var(--bg-page)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '5px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                  <div
                    style={{ width: '1px', background: 'var(--border-default)', margin: '0 4px' }}
                  />
                  <button
                    onClick={() => setPreview(v => !v)}
                    style={{
                      padding: '4px 12px',
                      background: preview ? 'var(--text-primary)' : 'transparent',
                      color: preview ? '#fff' : 'var(--text-primary)',
                      border: '1.5px solid var(--border-default)',
                      borderRadius: '6px',
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {preview ? '✎ Edit' : '👁 Preview'}
                  </button>
                </div>
              </div>

              {/* Editor / Preview */}
              {preview ? (
                <div
                  style={{
                    border: '1.5px solid var(--border-default)',
                    borderRadius: '10px',
                    padding: '20px 24px',
                    minHeight: '400px',
                    background: 'var(--bg-elevated)',
                    overflowY: 'auto',
                  }}
                >
                  <PreviewPane content={form.content} />
                </div>
              ) : (
                <textarea
                  id="doc-content-editor"
                  value={form.content}
                  onChange={set('content')}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    minHeight: '420px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-default)',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: 1.7,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-page)',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  placeholder="# Document title&#10;&#10;## Section&#10;&#10;Write your content here in Markdown..."
                />
              )}

              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {form.content.length.toLocaleString()} characters ·{' '}
                {form.content.split('\n').length} lines
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
            background: 'var(--bg-page)',
          }}
        >
          {error && (
            <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: 700, flex: 1 }}>
              ⚠ {error}
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 22px',
                background: 'transparent',
                border: '1.5px solid var(--border-default)',
                borderRadius: '8px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 28px',
                background: saving ? 'var(--border-strong)' : 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: '13px',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {saving ? (
                <>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />{' '}
                  Saving…
                </>
              ) : (
                '✓ Save changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
