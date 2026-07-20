// src/components/approvals/MyApprovalsPage.jsx
// Personal approval queue — every pending approval addressed to the signed-in
// user, with approve/reject + optional comment. Section id: 'approvals'.

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { S } from '../../lib/styles.js';
import { listMyApprovals, decideApproval } from '../../api/approvalsApi.js';

export default function MyApprovalsPage({ onToast }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(null); // approval id being decided
  const [comments, setComments] = useState({});

  const reload = async () => {
    const { data, error } = await listMyApprovals();
    if (error) onToast?.(error, 'error');
    else setApprovals(data.approvals || []);
    setLoading(false);
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const decide = async (a, decision) => {
    setDeciding(a.id);
    const { error } = await decideApproval(a.id, decision, comments[a.id] || '');
    setDeciding(null);
    if (error) return onToast?.(error, 'error');
    onToast?.(`${a.ticketKey} ${decision}.`);
    reload();
  };

  return (
    <div>
      <div style={S.pageTitle}>My Approvals</div>
      <div style={S.pageSub}>Requests waiting on your decision.</div>

      {loading && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading…</div>}

      {!loading && !approvals.length && (
        <div style={{ ...S.card, padding: '40px', textAlign: 'center' }}>
          <Inbox size={36} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Nothing waiting on you
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Approval requests addressed to you will appear here.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px' }}>
        {approvals.map(a => (
          <div key={a.id} data-testid="approval-card" style={{ ...S.card, padding: '18px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {a.ticketKey}
                  {a.subjectType === 'change' && (
                    <span style={{ ...S.badge('#6366F1'), marginLeft: '8px' }}>Change</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '14.5px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginTop: '2px',
                  }}
                >
                  {a.ticketTitle}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Requested by {a.requestedBy} · {new Date(a.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <input
                style={S.input}
                placeholder="Optional comment for the requester…"
                value={comments[a.id] || ''}
                onChange={e => setComments(c => ({ ...c, [a.id]: e.target.value }))}
                maxLength={2000}
              />
            </div>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                marginTop: '12px',
              }}
            >
              <button
                style={{ ...S.ghostBtn, color: '#DC2626', borderColor: '#FCA5A5' }}
                disabled={deciding === a.id}
                onClick={() => decide(a, 'rejected')}
              >
                <XCircle size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                Reject
              </button>
              <button
                style={S.orangeBtn}
                disabled={deciding === a.id}
                onClick={() => decide(a, 'approved')}
              >
                <CheckCircle2 size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
