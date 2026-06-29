// src/components/docs/studio/TableOfContents.jsx
// Auto-generated page outline from Markdown headings. Click to scroll the
// preview pane to the matching heading (anchored by slug id from MarkdownView).

import { extractHeadings } from '../MarkdownView.jsx';

export default function TableOfContents({ content, onJump }) {
  const headings = extractHeadings(content);
  if (headings.length === 0) {
    return (
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 4px' }}>
        No headings yet. Add <b># Heading</b> lines to build an outline.
      </div>
    );
  }
  return (
    <nav aria-label="Page outline" style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {headings.map((h, i) => (
        <button
          key={`${h.id}-${i}`}
          type="button"
          onClick={() => onJump?.(h.id)}
          title={h.text}
          style={{
            textAlign: 'left',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '5px 8px',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: h.level === 1 ? 700 : 500,
            paddingLeft: `${8 + (h.level - 1) * 14}px`,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--accent-primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          {h.text || '(untitled)'}
        </button>
      ))}
    </nav>
  );
}
