// src/components/docs/DocEditModal.jsx
// Full document editor — metadata + markdown content with live preview.

import { useState, useEffect } from 'react';
import { updateDoc } from '../../api/docsApi.js';
import { DOC_CATEGORIES } from '../../mocks/docsMockData.js';

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

// ─── Minimal inline markdown renderer (reused from DocFullPage) ─────────────
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
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
    return part;
  });
}

function PreviewPane({ content }) {
  if (!content)
    return (
      <div style={{ color: '#94A3B8', fontSize: '13px', padding: '20px', textAlign: 'center' }}>
        Nothing to preview yet.
      </div>
    );
  const lines = content.split('\n');
  const elements = [];
  let listBuffer = [];
  let inCode = false;
  let codeLines = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    elements.push(
      <ul key={`ul-${elements.length}`} style={{ paddingLeft: '20px', margin: '6px 0 12px' }}>
        {listBuffer.map((item, j) => (
          <li
            key={j}
            style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, marginBottom: '3px' }}
          >
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };
  const flushCode = () => {
    if (!codeLines.length) return;
    elements.push(
      <pre
        key={`pre-${elements.length}`}
        style={{
          background: '#F8F9FB',
          border: '1px solid #E2E8F0',
          borderRadius: '6px',
          padding: '10px 12px',
          overflowX: 'auto',
          fontSize: '12px',
          fontFamily: 'monospace',
          margin: '8px 0',
        }}
      >
        {codeLines.join('\n')}
      </pre>
    );
    codeLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    if (/^###\s/.test(line)) {
      flushList();
      elements.push(
        <h3
          key={i}
          style={{ fontSize: '14px', fontWeight: 700, color: '#111111', margin: '16px 0 4px' }}
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
          key={i}
          style={{
            fontSize: '17px',
            fontWeight: 900,
            color: '#111111',
            margin: '22px 0 8px',
            borderBottom: '2px solid #7C3AED',
            paddingBottom: '4px',
          }}
        >
          {renderInline(line.replace(/^##\s/, ''))}
        </h2>
      );
      continue;
    }
    if (/^#\s/.test(line)) {
      flushList();
      elements.push(
        <h1
          key={i}
          style={{ fontSize: '21px', fontWeight: 900, color: '#111111', margin: '0 0 14px' }}
        >
          {renderInline(line.replace(/^#\s/, ''))}
        </h1>
      );
      continue;
    }
    if (/^>\s/.test(line)) {
      flushList();
      elements.push(
        <blockquote
          key={i}
          style={{
            borderLeft: '3px solid #7C3AED',
            paddingLeft: '12px',
            margin: '8px 0',
            color: '#64748B',
            fontStyle: 'italic',
            fontSize: '13px',
          }}
        >
          {renderInline(line.replace(/^>\s/, ''))}
        </blockquote>
      );
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      listBuffer.push(line.replace(/^[-*]\s/, ''));
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      listBuffer.push(line.replace(/^\d+\.\s/, ''));
      continue;
    }
    if (/^\|[-| :]+\|$/.test(line.trim())) continue;
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
    if (/^[-_*]{3,}$/.test(line.trim())) {
      flushList();
      elements.push(
        <hr key={i} style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '16px 0' }} />
      );
      continue;
    }
    if (line.trim() === '') {
      flushList();
      elements.push(<div key={i} style={{ height: '8px' }} />);
      continue;
    }
    flushList();
    elements.push(
      <p
        key={i}
        style={{ fontSize: '13px', color: '#374151', lineHeight: 1.8, marginBottom: '8px' }}
      >
        {renderInline(line)}
      </p>
    );
  }
  flushList();
  flushCode();
  return <div>{elements}</div>;
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
    border: '1.5px solid #E2E8F0',
    fontFamily: "'Lato', sans-serif",
    fontSize: '13px',
    color: '#1E293B',
    background: '#F8F9FB',
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    color: '#475569',
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
        borderBottom: `2px solid ${tab === id ? '#7C3AED' : 'transparent'}`,
        background: 'transparent',
        color: tab === id ? '#7C3AED' : '#64748B',
        fontFamily: "'Lato', sans-serif",
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
          background: '#fff',
          borderRadius: '16px',
          zIndex: 701,
          width: '860px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          boxShadow: '0 28px 80px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Lato', sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#111111',
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
                      background: '#fff',
                      border: '1px solid #E2E8F0',
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
                          border: `2px solid ${form.icon === icon ? '#7C3AED' : 'transparent'}`,
                          background: form.icon === icon ? '#F5F3FF' : 'transparent',
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
        <div style={{ borderBottom: '1px solid #E2E8F0', padding: '0 24px', flexShrink: 0 }}>
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
                      background: '#F1F5F9',
                      color: '#94A3B8',
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
                      color: '#94A3B8',
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
                            background: '#F1F5F9',
                            color: '#475569',
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
                        border: `2px solid ${form.visibility === val ? '#111111' : '#E2E8F0'}`,
                        background: form.visibility === val ? '#111111' : '#F8F9FB',
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
                          color: form.visibility === val ? '#fff' : '#111111',
                          fontFamily: "'Lato', sans-serif",
                        }}
                      >
                        {val}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: form.visibility === val ? 'rgba(255,255,255,0.6)' : '#94A3B8',
                          fontFamily: "'Lato', sans-serif",
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
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
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
                        background: '#F8F9FB',
                        border: '1px solid #E2E8F0',
                        borderRadius: '5px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        cursor: 'pointer',
                        color: '#475569',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                  <div style={{ width: '1px', background: '#E2E8F0', margin: '0 4px' }} />
                  <button
                    onClick={() => setPreview(v => !v)}
                    style={{
                      padding: '4px 12px',
                      background: preview ? '#111111' : 'transparent',
                      color: preview ? '#fff' : '#111111',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '6px',
                      fontFamily: "'Lato', sans-serif",
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
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '20px 24px',
                    minHeight: '400px',
                    background: '#fff',
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
                    border: '1.5px solid #E2E8F0',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: 1.7,
                    color: '#1E293B',
                    background: '#F8F9FB',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  placeholder="# Document title&#10;&#10;## Section&#10;&#10;Write your content here in Markdown..."
                />
              )}

              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
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
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
            background: '#FAFBFC',
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
                border: '1.5px solid #E2E8F0',
                borderRadius: '8px',
                fontFamily: "'Lato', sans-serif",
                fontSize: '13px',
                cursor: 'pointer',
                color: '#64748B',
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
                background: saving ? '#CBD5E1' : '#7C3AED',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontFamily: "'Lato', sans-serif",
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
