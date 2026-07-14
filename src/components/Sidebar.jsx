// src/components/Sidebar.jsx
// Jira-style left navigation rail. Groups arrive from the shell already
// capability-filtered; this component only renders and navigates. Collapses
// to an icon rail (state owned by the shell so it can persist), and drops to
// the icon rail automatically on phones via the .pomelo-sidebar CSS override.

import { ChevronsLeft, ChevronsRight } from 'lucide-react';

const itemStyle = active => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: 'none',
  background: active ? 'var(--accent-soft)' : 'transparent',
  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
  fontFamily: "'Inter', sans-serif",
  fontSize: '13px',
  fontWeight: active ? 700 : 500,
  cursor: 'pointer',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  position: 'relative',
});

export default function Sidebar({ groups, active, onNavigate, collapsed, onToggle }) {
  return (
    <aside
      className="pomelo-sidebar"
      style={{
        width: collapsed ? '58px' : '224px',
        flexShrink: 0,
        borderRight: '1px solid var(--border-default)',
        background: 'var(--bg-nav)',
        position: 'sticky',
        top: '60px',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 8px',
        boxSizing: 'border-box',
        transition: 'width 0.15s ease',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {groups.map((group, gi) => (
          <div key={group.label || gi} style={{ marginBottom: '6px' }}>
            {group.label && (
              <div
                className="pomelo-sidebar-group"
                style={{
                  padding: collapsed ? '8px 0 4px' : '10px 12px 4px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {collapsed ? '·' : group.label}
              </div>
            )}
            {group.items.map(item => {
              const Icon = item.Icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    ...itemStyle(isActive),
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '9px 0' : '8px 12px',
                  }}
                >
                  {isActive && !collapsed && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '6px',
                        bottom: '6px',
                        width: '3px',
                        borderRadius: '2px',
                        background: 'var(--accent-primary)',
                      }}
                    />
                  )}
                  <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                  {!collapsed && <span className="pomelo-sidebar-label">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <button
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="pomelo-sidebar-toggle"
        style={{
          ...itemStyle(false),
          justifyContent: collapsed ? 'center' : 'flex-start',
          marginTop: '8px',
          borderTop: '1px solid var(--border-subtle)',
          borderRadius: 0,
          paddingTop: '12px',
        }}
      >
        {collapsed ? (
          <ChevronsRight size={16} strokeWidth={2} />
        ) : (
          <>
            <ChevronsLeft size={16} strokeWidth={2} />
            <span className="pomelo-sidebar-label">Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}
