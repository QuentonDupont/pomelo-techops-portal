// src/components/docs/studio/RichTextarea.jsx
// A Markdown <textarea> with a Confluence-style formatting toolbar, a slash (/)
// command menu, and keyboard shortcuts. Produces Markdown — no contentEditable,
// no new dependencies. Used by the Documentation Studio editor.

import { useRef, useEffect, useState, useCallback } from 'react';
import { wrapSelection, prefixLines, insertBlock, BLOCK_SNIPPETS } from './editorActions.js';

// Every command can be triggered from the toolbar and/or the slash menu.
// run(value, start, end) → { value, selStart, selEnd }
const COMMANDS = [
  {
    id: 'h1',
    label: 'Heading 1',
    icon: 'H1',
    group: 'text',
    slash: true,
    run: (v, s, e) => prefixLines(v, s, e, '# '),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: 'H2',
    group: 'text',
    slash: true,
    run: (v, s, e) => prefixLines(v, s, e, '## '),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: 'H3',
    group: 'text',
    slash: true,
    run: (v, s, e) => prefixLines(v, s, e, '### '),
  },
  {
    id: 'bold',
    label: 'Bold',
    icon: 'B',
    group: 'inline',
    tip: '⌘B',
    run: (v, s, e) => wrapSelection(v, s, e, '**', '**', 'bold text'),
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: 'I',
    group: 'inline',
    tip: '⌘I',
    run: (v, s, e) => wrapSelection(v, s, e, '*', '*', 'italic text'),
  },
  {
    id: 'underline',
    label: 'Underline',
    icon: 'U',
    group: 'inline',
    run: (v, s, e) => wrapSelection(v, s, e, '++', '++', 'underline'),
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    icon: 'S̶',
    group: 'inline',
    run: (v, s, e) => wrapSelection(v, s, e, '~~', '~~', 'strikethrough'),
  },
  {
    id: 'code',
    label: 'Inline code',
    icon: '</>',
    group: 'inline',
    run: (v, s, e) => wrapSelection(v, s, e, '`', '`', 'code'),
  },
  {
    id: 'link',
    label: 'Link',
    icon: '🔗',
    group: 'inline',
    tip: '⌘K',
    slash: true,
    run: (v, s, e) => {
      const sel = v.slice(s, e) || 'link text';
      const txt = `[${sel}](https://)`;
      return {
        value: v.slice(0, s) + txt + v.slice(e),
        selStart: s + sel.length + 3,
        selEnd: s + sel.length + 11,
      };
    },
  },
  {
    id: 'bullet',
    label: 'Bulleted list',
    icon: '•',
    group: 'list',
    slash: true,
    run: (v, s, e) => prefixLines(v, s, e, '- '),
  },
  {
    id: 'numbered',
    label: 'Numbered list',
    icon: '1.',
    group: 'list',
    slash: true,
    run: (v, s, e) => prefixLines(v, s, e, '', true),
  },
  {
    id: 'task',
    label: 'Task list',
    icon: '☑',
    group: 'list',
    slash: true,
    run: (v, s, e) => prefixLines(v, s, e, '- [ ] '),
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: '❝',
    group: 'block',
    slash: true,
    run: (v, s, e) => prefixLines(v, s, e, '> '),
  },
  {
    id: 'codeblock',
    label: 'Code block',
    icon: '{ }',
    group: 'block',
    slash: true,
    run: (v, s, e) => insertBlock(v, s, e, BLOCK_SNIPPETS.codeblock),
  },
  {
    id: 'table',
    label: 'Table',
    icon: '▦',
    group: 'block',
    slash: true,
    run: (v, s, e) => insertBlock(v, s, e, BLOCK_SNIPPETS.table),
  },
  {
    id: 'info',
    label: 'Info panel',
    icon: 'ℹ️',
    group: 'callout',
    slash: true,
    run: (v, s, e) => insertBlock(v, s, e, BLOCK_SNIPPETS.info),
  },
  {
    id: 'warning',
    label: 'Warning panel',
    icon: '⚠️',
    group: 'callout',
    slash: true,
    run: (v, s, e) => insertBlock(v, s, e, BLOCK_SNIPPETS.warning),
  },
  {
    id: 'success',
    label: 'Success panel',
    icon: '✅',
    group: 'callout',
    slash: true,
    run: (v, s, e) => insertBlock(v, s, e, BLOCK_SNIPPETS.success),
  },
  {
    id: 'tip',
    label: 'Tip panel',
    icon: '💡',
    group: 'callout',
    slash: true,
    run: (v, s, e) => insertBlock(v, s, e, BLOCK_SNIPPETS.tip),
  },
  {
    id: 'image',
    label: 'Image',
    icon: '🖼️',
    group: 'block',
    slash: true,
    run: (v, s, e) => insertBlock(v, s, e, BLOCK_SNIPPETS.image),
  },
  {
    id: 'divider',
    label: 'Divider',
    icon: '―',
    group: 'block',
    slash: true,
    run: (v, s, e) => insertBlock(v, s, e, BLOCK_SNIPPETS.divider),
  },
];
const CMD = Object.fromEntries(COMMANDS.map(c => [c.id, c]));
const SLASH_COMMANDS = COMMANDS.filter(c => c.slash);

const TOOLBAR_GROUPS = [
  ['h1', 'h2', 'h3'],
  ['bold', 'italic', 'underline', 'strike', 'code'],
  ['bullet', 'numbered', 'task'],
  ['link', 'quote', 'codeblock', 'table'],
  ['info', 'warning', 'success', 'image', 'divider'],
];

const btnStyle = {
  minWidth: '28px',
  height: '28px',
  padding: '0 7px',
  borderRadius: '6px',
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Inter', sans-serif",
};

export default function RichTextarea({ value, onChange, placeholder, style, taRef: externalRef }) {
  const innerRef = useRef(null);
  const taRef = externalRef || innerRef;
  const pendingSel = useRef(null);
  const [slash, setSlash] = useState(null); // { query, from, top, left, index } | null

  // Restore caret/selection after a programmatic value change.
  useEffect(() => {
    if (pendingSel.current && taRef.current) {
      const { selStart, selEnd } = pendingSel.current;
      taRef.current.focus();
      taRef.current.setSelectionRange(selStart, selEnd);
      pendingSel.current = null;
    }
  });

  const apply = useCallback(
    cmd => {
      const ta = taRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const res = cmd.run(value, start, end);
      pendingSel.current = { selStart: res.selStart, selEnd: res.selEnd };
      onChange(res.value);
    },
    [value, onChange, taRef]
  );

  const filtered = slash
    ? SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slash.query.toLowerCase()))
    : [];

  const runSlash = useCallback(
    cmd => {
      const ta = taRef.current;
      if (!ta || !slash) return;
      // Remove the "/query" trigger text, then run the command at that spot.
      const caret = ta.selectionStart;
      const cleaned = value.slice(0, slash.from) + value.slice(caret);
      const res = cmd.run(cleaned, slash.from, slash.from);
      pendingSel.current = { selStart: res.selStart, selEnd: res.selEnd };
      onChange(res.value);
      setSlash(null);
    },
    [slash, value, onChange, taRef]
  );

  const onKeyDown = e => {
    // Slash-menu navigation takes priority when open.
    if (slash && filtered.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlash(s => ({ ...s, index: (s.index + 1) % filtered.length }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlash(s => ({ ...s, index: (s.index - 1 + filtered.length) % filtered.length }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        runSlash(filtered[slash.index] || filtered[0]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlash(null);
        return;
      }
    }
    // Keyboard shortcuts.
    if (e.metaKey || e.ctrlKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') {
        e.preventDefault();
        apply(CMD.bold);
        return;
      }
      if (k === 'i') {
        e.preventDefault();
        apply(CMD.italic);
        return;
      }
      if (k === 'k') {
        e.preventDefault();
        apply(CMD.link);
        return;
      }
    }
  };

  // Detect / update the slash trigger as the user types.
  const handleChange = e => {
    const ta = e.target;
    const caret = ta.selectionStart;
    const val = ta.value;
    onChange(val);
    // Find a "/" that starts a command token: preceded by start-of-line or space.
    const uptoCaret = val.slice(0, caret);
    const m = uptoCaret.match(/(^|\s)\/([\w]*)$/);
    if (m) {
      const from = caret - m[2].length - 1; // position of "/"
      const coords = caretCoords(ta, from);
      setSlash({ query: m[2], from, index: 0, top: coords.top, left: coords.left });
    } else if (slash) {
      setSlash(null);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        position: 'relative',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2px',
          alignItems: 'center',
          padding: '6px 8px',
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-surface)',
        }}
      >
        {TOOLBAR_GROUPS.map((group, gi) => (
          <div
            key={gi}
            style={{
              display: 'flex',
              gap: '1px',
              alignItems: 'center',
              paddingRight: '6px',
              marginRight: '4px',
              borderRight:
                gi < TOOLBAR_GROUPS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            {group.map(id => {
              const c = CMD[id];
              return (
                <button
                  key={id}
                  type="button"
                  title={c.label + (c.tip ? ` (${c.tip})` : '')}
                  onMouseDown={e => {
                    e.preventDefault();
                    apply(c);
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  style={{
                    ...btnStyle,
                    fontStyle: id === 'italic' ? 'italic' : 'normal',
                    textDecoration: id === 'strike' ? 'line-through' : 'none',
                  }}
                >
                  {c.icon}
                </button>
              );
            })}
          </div>
        ))}
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Type <b>/</b> for blocks
        </span>
      </div>

      {/* Editing surface */}
      <textarea
        ref={taRef}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onScroll={() => slash && setSlash(null)}
        placeholder={placeholder}
        spellCheck
        style={{
          flex: 1,
          resize: 'none',
          border: 'none',
          outline: 'none',
          padding: '18px 20px',
          fontSize: '13px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          lineHeight: 1.7,
          background: 'var(--bg-page)',
          color: 'var(--text-primary)',
          ...style,
        }}
      />

      {/* Slash command menu */}
      {slash && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: Math.min(slash.top + 4, 360),
            left: Math.min(slash.left, 280),
            zIndex: 50,
            width: '230px',
            maxHeight: '280px',
            overflowY: 'auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            padding: '6px',
          }}
        >
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => {
                e.preventDefault();
                runSlash(c);
              }}
              onMouseEnter={() => setSlash(s => ({ ...s, index: i }))}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 9px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                background: i === slash.index ? 'var(--accent-soft)' : 'transparent',
              }}
            >
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: 'var(--bg-hover)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                }}
              >
                {c.icon}
              </span>
              <span
                style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  fontWeight: i === slash.index ? 700 : 500,
                }}
              >
                {c.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Rough caret pixel position inside the textarea using a mirror element.
// Good enough to anchor the slash menu near the cursor.
function caretCoords(textarea, position) {
  const div = document.createElement('div');
  const style = window.getComputedStyle(textarea);
  const props = [
    'boxSizing',
    'width',
    'paddingTop',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'borderWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'whiteSpace',
    'wordWrap',
  ];
  props.forEach(p => {
    div.style[p] = style[p];
  });
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.textContent = textarea.value.slice(0, position);
  const span = document.createElement('span');
  span.textContent = textarea.value.slice(position) || '.';
  div.appendChild(span);
  document.body.appendChild(div);
  const top = span.offsetTop - textarea.scrollTop;
  const left = span.offsetLeft;
  document.body.removeChild(div);
  return { top: top + 30, left: left + 8 };
}
