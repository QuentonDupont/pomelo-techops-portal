// src/components/changes/ChangeCalendar.jsx
// Month calendar of change windows — pure CSS grid, no dependency. Each
// change renders as a block on every day its window covers, colored by risk.

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { S } from '../../lib/styles.js';
import { listChangeCalendar } from '../../api/changesApi.js';
import { RISK_COLORS } from './ChangesPage.jsx';

const dayKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function ChangeCalendar({ onOpen, onToast }) {
  const [anchor, setAnchor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [changes, setChanges] = useState([]);

  const monthStart = anchor;
  const monthEnd = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59),
    [anchor]
  );

  useEffect(() => {
    (async () => {
      const { data, error } = await listChangeCalendar(
        monthStart.toISOString(),
        monthEnd.toISOString()
      );
      if (error) onToast?.(error, 'error');
      else setChanges(data.changes || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  // Grid: leading blanks (Mon-first) + days of month.
  const cells = useMemo(() => {
    const firstDow = (monthStart.getDay() + 6) % 7; // Mon=0
    const days = monthEnd.getDate();
    const out = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(new Date(anchor.getFullYear(), anchor.getMonth(), d));
    return out;
  }, [anchor, monthStart, monthEnd]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const c of changes) {
      if (!c.windowStart) continue;
      const start = new Date(c.windowStart);
      const end = c.windowEnd ? new Date(c.windowEnd) : start;
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      while (cur <= end) {
        const k = dayKey(cur);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(c);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [changes]);

  const todayKey = dayKey(new Date());
  const monthLabel = anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ ...S.card, padding: '18px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <button
          style={{ ...S.ghostBtn, padding: '5px 9px' }}
          aria-label="Previous month"
          onClick={() => setAnchor(a => new Date(a.getFullYear(), a.getMonth() - 1, 1))}
        >
          <ChevronLeft size={14} />
        </button>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {monthLabel}
        </div>
        <button
          style={{ ...S.ghostBtn, padding: '5px 9px' }}
          aria-label="Next month"
          onClick={() => setAnchor(a => new Date(a.getFullYear(), a.getMonth() + 1, 1))}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div
            key={d}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '4px 0',
            }}
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            style={{
              minHeight: '76px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: day && dayKey(day) === todayKey ? 'var(--accent-soft)' : 'var(--bg-page)',
              padding: '4px',
              visibility: day ? 'visible' : 'hidden',
            }}
          >
            {day && (
              <>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    marginBottom: '3px',
                  }}
                >
                  {day.getDate()}
                </div>
                {(byDay.get(dayKey(day)) || []).slice(0, 3).map(c => (
                  <button
                    key={c.id}
                    onClick={() => onOpen(c.id)}
                    title={`${c.key} — ${c.title} (risk ${c.risk})`}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: '#fff',
                      background: RISK_COLORS[c.risk] || '#6366F1',
                      borderRadius: '5px',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.key}
                  </button>
                ))}
                {(byDay.get(dayKey(day)) || []).length > 3 && (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    +{byDay.get(dayKey(day)).length - 3} more
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
        {Object.entries(RISK_COLORS).map(([risk, color]) => (
          <div
            key={risk}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                background: color,
                display: 'inline-block',
              }}
            />
            {risk} risk
          </div>
        ))}
      </div>
    </div>
  );
}
