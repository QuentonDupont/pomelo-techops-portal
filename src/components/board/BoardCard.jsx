// src/components/board/BoardCard.jsx
// One ticket card, mirroring the real PESD1 card anatomy: title, label chips,
// due-date chip (red when overdue), priority glyph, issue-type icon, human
// key, assignee avatar. Presentational — all behavior arrives via props.

import {
  PRIORITY_COLORS,
  ISSUE_TYPE_ICONS,
  labelColorFor,
  DONE_STATUSES,
} from '../../lib/constants.js';

const PRIORITY_GLYPHS = { Critical: '⇈', High: '↑', Medium: '=', Low: '↓' };

const initialsOf = name =>
  String(name)
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function DueChip({ dueDate, status }) {
  if (!dueDate) return null;
  const overdue = !DONE_STATUSES.has(status) && dueDate < new Date().toISOString().slice(0, 10);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 7px',
        borderRadius: '5px',
        fontSize: '11px',
        fontWeight: 700,
        background: overdue ? '#FEF2F2' : 'var(--bg-hover)',
        color: overdue ? '#B91C1C' : 'var(--text-secondary)',
        border: overdue ? '1px solid #FECACA' : '1px solid transparent',
      }}
    >
      {overdue ? '⚠' : '🕒'} {dueDate.slice(5)}
    </span>
  );
}

export function LabelChip({ label }) {
  const { bg, fg } = labelColorFor(label);
  return (
    <span
      style={{
        padding: '2px 7px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        background: bg,
        color: fg,
        whiteSpace: 'nowrap',
        maxWidth: '160px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </span>
  );
}

export default function BoardCard({ ticket, dragging, draggable, onDragStart, onDragEnd, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={e => onDragStart(e, ticket.id)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(ticket)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onOpen(ticket)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        padding: '10px 12px',
        cursor: draggable ? 'grab' : 'pointer',
        opacity: dragging ? 0.45 : 1,
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {ticket.title}
      </div>

      {(ticket.labels?.length > 0 || ticket.dueDate) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          {(ticket.labels || []).map(l => (
            <LabelChip key={l} label={l} />
          ))}
          <DueChip dueDate={ticket.dueDate} status={ticket.status} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          title={`Priority: ${ticket.priority}`}
          style={{
            color: PRIORITY_COLORS[ticket.priority] || 'var(--text-muted)',
            fontWeight: 900,
            fontSize: '13px',
            width: '14px',
            textAlign: 'center',
          }}
        >
          {PRIORITY_GLYPHS[ticket.priority] || '='}
        </span>
        <span title={ticket.issueType || 'Task'} style={{ fontSize: '12px' }}>
          {ISSUE_TYPE_ICONS[ticket.issueType] || ISSUE_TYPE_ICONS.Task}
        </span>
        <span
          title={ticket.id}
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            letterSpacing: '0.02em',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {ticket.id}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          {ticket.assignee ? (
            <span
              title={ticket.assignee}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 800,
              }}
            >
              {initialsOf(ticket.assignee)}
            </span>
          ) : (
            <span
              title="Unassigned"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'var(--bg-hover)',
                border: '1px dashed var(--border-default)',
                color: 'var(--text-muted)',
                fontSize: '10px',
              }}
            >
              ?
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
