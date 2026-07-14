// src/components/board/BoardFilterBar.jsx
// Jira-style board bar: text search, assignee avatar row, Type + Label
// dropdown filters, and quick-filter toggles. Pure controlled component —
// all state lives in BoardPage.

import { ISSUE_TYPES } from '../../lib/constants.js';
import { S } from '../../lib/styles.js';

const initialsOf = name =>
  String(name)
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const chipBtn = active => ({
  height: '32px',
  padding: '0 12px',
  borderRadius: '100px',
  border: active ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--border-default)',
  background: active ? 'var(--accent-soft)' : 'var(--bg-surface)',
  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

export default function BoardFilterBar({
  search,
  setSearch,
  assignees,
  assigneeFilter,
  toggleAssignee,
  typeFilter,
  setTypeFilter,
  labels,
  labelFilter,
  setLabelFilter,
  quick,
  toggleQuick,
  hasFilters,
  onClear,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search board…"
        aria-label="Search board"
        style={{
          ...S.input,
          width: '190px',
          height: '32px',
          padding: '0 12px',
          fontSize: '13px',
          boxSizing: 'border-box',
        }}
      />

      {/* Assignee avatar row (click to toggle, like Jira's avatar strip) */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {assignees.map((a, i) => {
          const active = assigneeFilter.has(a);
          return (
            <button
              key={a}
              title={a}
              onClick={() => toggleAssignee(a)}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                border: active ? '2px solid var(--accent-primary)' : '2px solid var(--bg-surface)',
                background: a === 'Unassigned' ? 'var(--bg-hover)' : 'var(--accent-primary)',
                color: a === 'Unassigned' ? 'var(--text-muted)' : '#fff',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer',
                marginLeft: i === 0 ? 0 : '-6px',
                position: 'relative',
                zIndex: active ? 2 : 1,
              }}
            >
              {a === 'Unassigned' ? '?' : initialsOf(a)}
            </button>
          );
        })}
      </div>

      <select
        value={typeFilter}
        onChange={e => setTypeFilter(e.target.value)}
        aria-label="Filter by type"
        style={{
          ...S.select,
          width: 'auto',
          height: '32px',
          padding: '0 28px 0 10px',
          fontSize: '13px',
          boxSizing: 'border-box',
        }}
      >
        <option value="All">Type: All</option>
        {ISSUE_TYPES.map(t => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        value={labelFilter}
        onChange={e => setLabelFilter(e.target.value)}
        aria-label="Filter by label"
        style={{
          ...S.select,
          width: 'auto',
          height: '32px',
          padding: '0 28px 0 10px',
          fontSize: '13px',
          boxSizing: 'border-box',
        }}
      >
        <option value="All">Label: All</option>
        {labels.map(l => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      <button onClick={() => toggleQuick('mine')} style={chipBtn(quick.mine)}>
        Only my tickets
      </button>
      <button onClick={() => toggleQuick('recent')} style={chipBtn(quick.recent)}>
        Recently updated
      </button>
      <button onClick={() => toggleQuick('overdue')} style={chipBtn(quick.overdue)}>
        Overdue
      </button>

      {hasFilters && (
        <button
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--accent-primary)',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
