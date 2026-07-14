// src/components/Sidebar.jsx
// Jira-style left navigation rail, shown only in the Board workspace (the
// shell renders it for section === 'board'). Groups arrive already
// capability-filtered; items always show icon + text label. Hidden on phones
// via the .pomelo-sidebar CSS override — the top bar handles navigation there.

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

export default function Sidebar({ groups, active, onNavigate }) {
  return (
    <aside
      className="pomelo-sidebar"
      style={{
        width: '216px',
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
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {groups.map((group, gi) => (
          <div key={group.label || gi} style={{ marginBottom: '6px' }}>
            {group.label && (
              <div
                style={{
                  padding: '10px 12px 4px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {group.label}
              </div>
            )}
            {group.items.map(item => {
              const Icon = item.Icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  style={itemStyle(isActive)}
                >
                  {isActive && (
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
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
