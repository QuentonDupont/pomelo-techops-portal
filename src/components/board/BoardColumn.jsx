// src/components/board/BoardColumn.jsx
// One workflow column: header (colored dot, name, count), drop target, cards.
// Done-category columns collapse older items behind a "See older" expander,
// like the real PESD1 board.

import { useState } from 'react';
import { History } from 'lucide-react';
import BoardCard from './BoardCard.jsx';

const RECENT_DAYS = 14;

export default function BoardColumn({
  column,
  tickets,
  isDragTarget,
  onDragOver,
  onDrop,
  dnd,
  canDrag,
  onOpenTicket,
  headerAction,
}) {
  const [showOlder, setShowOlder] = useState(false);

  let visible = tickets;
  let olderCount = 0;
  if (column.category === 'done' && !showOlder) {
    const cutoff = new Date(Date.now() - RECENT_DAYS * 86400000).toISOString().slice(0, 10);
    visible = tickets.filter(t => (t.updated || t.created || '') >= cutoff);
    olderCount = tickets.length - visible.length;
  }

  return (
    <div
      onDragOver={e => onDragOver(e, column.name)}
      onDrop={e => onDrop(e, column.name)}
      style={{
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: isDragTarget ? 'var(--accent-soft)' : 'var(--bg-surface)',
        border: isDragTarget
          ? '1.5px dashed var(--accent-primary)'
          : '1px solid var(--border-subtle)',
        // The status color does structural work: each lane carries its
        // workflow color as a top rail.
        borderTop: isDragTarget ? '3px solid var(--accent-primary)' : `3px solid ${column.color}`,
        borderRadius: '10px',
        maxHeight: '100%',
        opacity: tickets.length === 0 && !isDragTarget ? 0.55 : 1,
        transition: 'opacity 0.15s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '7px',
          padding: '10px 12px 8px',
          position: 'sticky',
          top: 0,
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            lineHeight: 1.3,
            minWidth: 0,
            flex: '0 1 auto',
          }}
        >
          {column.name}
        </span>
        {tickets.length > 0 && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--text-muted)',
              background: 'var(--bg-hover)',
              borderRadius: '100px',
              padding: '1px 7px',
              flexShrink: 0,
            }}
          >
            {tickets.length}
          </span>
        )}
        {headerAction && <span style={{ marginLeft: 'auto' }}>{headerAction}</span>}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '2px 8px 12px',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {visible.map(t => (
          <BoardCard
            key={t.id}
            ticket={t}
            draggable={canDrag(t)}
            dragging={dnd.dragId === t.id}
            onDragStart={dnd.onDragStart}
            onDragEnd={dnd.onDragEnd}
            onOpen={onOpenTicket}
          />
        ))}
        {tickets.length === 0 && !isDragTarget && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '18px 6px',
            }}
          >
            No tickets
          </div>
        )}
        {olderCount > 0 && (
          <button
            onClick={() => setShowOlder(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--accent-primary)',
              padding: '6px',
              textAlign: 'left',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <History size={13} /> See older work items ({olderCount})
          </button>
        )}
      </div>
    </div>
  );
}
