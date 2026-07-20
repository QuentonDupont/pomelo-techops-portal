// src/components/reports/charts/primitives.jsx
// Hand-rolled SVG chart primitives — zero chart dependencies (rule R-11).
// Colors: series identity uses the validated pair CHART_SERIES (indigo/green,
// CVD ΔE 105); magnitude bars use one hue; status/priority colors come from
// the product's existing semantic palette and always ship with text labels.
// Text wears theme text tokens (never the series color); grid/axes are
// recessive; every mark carries a native <title> tooltip.

import { useState } from 'react';

export const CHART_SERIES = ['#6366F1', '#16A34A']; // validated pair (light+dark)

const AXIS_TEXT = {
  fontSize: '10px',
  fill: 'var(--text-muted)',
  fontFamily: "'Inter', sans-serif",
};

export function StatTile({ label, value, suffix = '', hint }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        padding: '14px 16px',
        minWidth: '128px',
        flex: '1 1 128px',
      }}
      title={hint || label}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginTop: '4px',
        }}
      >
        {value === null || value === undefined ? '—' : value}
        {value !== null && value !== undefined && suffix && (
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginLeft: '2px',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{hint}</div>
      )}
    </div>
  );
}

// Two-series line chart (created vs resolved). Legend always present; hover
// shows a per-day tooltip via a transparent hit column + native title.
export function LineChart({ days, series, height = 180 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const W = 640;
  const H = height;
  const PAD = { top: 10, right: 12, bottom: 22, left: 30 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const maxY = Math.max(1, ...days.flatMap(d => series.map(s => d[s.key])));
  const x = i => PAD.left + (days.length <= 1 ? iw / 2 : (i / (days.length - 1)) * iw);
  const y = v => PAD.top + ih - (v / maxY) * ih;
  const ticks = [0, Math.ceil(maxY / 2), maxY];

  return (
    <div>
      <div style={{ display: 'flex', gap: '14px', marginBottom: '6px' }}>
        {series.map((s, i) => (
          <div
            key={s.key}
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
                height: '3px',
                borderRadius: '2px',
                background: CHART_SERIES[i],
                display: 'inline-block',
              }}
            />
            {s.label}
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label={`Trend chart: ${series.map(s => s.label).join(' vs ')}`}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {ticks.map(t => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" style={AXIS_TEXT}>
              {t}
            </text>
          </g>
        ))}
        {days.length > 0 && (
          <>
            <text x={PAD.left} y={H - 6} style={AXIS_TEXT}>
              {new Date(days[0].day).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </text>
            <text x={W - PAD.right} y={H - 6} textAnchor="end" style={AXIS_TEXT}>
              {new Date(days[days.length - 1].day).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </text>
          </>
        )}
        {series.map((s, si) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={CHART_SERIES[si]}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={days.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ')}
          />
        ))}
        {/* Hover layer: one hit column per day */}
        {days.map((d, i) => (
          <g key={d.day}>
            {hoverIdx === i && (
              <line
                x1={x(i)}
                x2={x(i)}
                y1={PAD.top}
                y2={PAD.top + ih}
                stroke="var(--text-muted)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}
            {hoverIdx === i &&
              series.map((s, si) => (
                <circle
                  key={s.key}
                  cx={x(i)}
                  cy={y(d[s.key])}
                  r="4"
                  fill={CHART_SERIES[si]}
                  stroke="var(--bg-surface)"
                  strokeWidth="2"
                />
              ))}
            <rect
              x={x(i) - iw / Math.max(days.length - 1, 1) / 2}
              y={PAD.top}
              width={iw / Math.max(days.length - 1, 1)}
              height={ih}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            >
              <title>
                {`${new Date(d.day).toLocaleDateString()} — ${series.map(s => `${s.label}: ${d[s.key]}`).join(', ')}`}
              </title>
            </rect>
          </g>
        ))}
      </svg>
      {hoverIdx !== null && days[hoverIdx] && (
        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {new Date(days[hoverIdx].day).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
          {' · '}
          {series.map(s => `${s.label} ${days[hoverIdx][s.key]}`).join(' · ')}
        </div>
      )}
    </div>
  );
}

// Horizontal bars. Single hue for magnitude; pass per-row `color` for
// status/priority palettes (labels are always rendered beside the value).
export function BarChart({ rows, color = CHART_SERIES[0], valueSuffix = '', maxValue }) {
  const max = Math.max(1, maxValue ?? Math.max(...rows.map(r => r.value)));
  return (
    <div
      role="img"
      aria-label={`Bar chart: ${rows.map(r => `${r.label} ${r.value}${valueSuffix}`).join(', ')}`}
    >
      {rows.map(r => (
        <div
          key={r.label}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}
          title={`${r.label}: ${r.value}${valueSuffix}`}
        >
          <div
            style={{
              width: '140px',
              flexShrink: 0,
              fontSize: '12px',
              color: 'var(--text-secondary)',
              textAlign: 'right',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {r.label}
          </div>
          <div
            style={{
              flex: 1,
              height: '14px',
              borderRadius: '4px',
              background: 'var(--bg-hover)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(r.value / max) * 100}%`,
                height: '100%',
                borderRadius: '4px',
                background: r.color || color,
                minWidth: r.value > 0 ? '3px' : 0,
              }}
            />
          </div>
          <div
            style={{
              width: '52px',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {r.value}
            {valueSuffix}
          </div>
        </div>
      ))}
      {!rows.length && (
        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No data in range.</div>
      )}
    </div>
  );
}

// Donut gauge for a single 0..max value (e.g. CSAT average out of 5).
export function DonutGauge({ value, max = 5, label, color = CHART_SERIES[0], size = 120 }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const frac = value === null || value === undefined ? 0 : Math.min(1, value / max);
  return (
    <div style={{ textAlign: 'center' }} title={`${label}: ${value ?? '—'} / ${max}`}>
      <svg
        viewBox="0 0 110 110"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label}: ${value ?? 'no data'} out of ${max}`}
      >
        <circle cx="55" cy="55" r={R} fill="none" stroke="var(--bg-hover)" strokeWidth="10" />
        <circle
          cx="55"
          cy="55"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${C * frac} ${C}`}
          transform="rotate(-90 55 55)"
        />
        <text
          x="55"
          y="52"
          textAnchor="middle"
          style={{
            fontSize: '22px',
            fontWeight: 800,
            fill: 'var(--text-primary)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {value ?? '—'}
        </text>
        <text
          x="55"
          y="68"
          textAnchor="middle"
          style={{ fontSize: '10px', fill: 'var(--text-muted)', fontFamily: "'Inter', sans-serif" }}
        >
          / {max}
        </text>
      </svg>
      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}
