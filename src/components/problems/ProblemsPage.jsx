// src/components/problems/ProblemsPage.jsx
// Problem management: PRB records with root cause, workaround, known-error
// badge, linked incidents, and a slim To Do / In Progress / Live workflow.
// List + inline detail editor. Mutations gate on problems.manage.

import { useEffect, useState, useCallback } from 'react';
import { SearchCheck, Plus, ArrowLeft, Save, Link as LinkIcon } from 'lucide-react';
import { S } from '../../lib/styles.js';
import { PRIORITY_COLORS } from '../../lib/constants.js';
import { listProblems, getProblem, createProblem, updateProblem } from '../../api/problemsApi.js';

const PROBLEM_STATUSES = ['To Do', 'In Progress', 'Live'];
const STATUS_COLOR = { 'To Do': '#6B7280', 'In Progress': '#2563EB', Live: '#16A34A' };

const lbl = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  margin: '12px 0 5px',
};

function ProblemDetail({ id, canManage, onBack, onToast }) {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: d, error } = await getProblem(id);
    if (error) return onToast(error, 'error');
    setData(d);
    setDraft({
      rootCause: d.rootCause || '',
      workaround: d.workaround || '',
      impact: d.impact || '',
      knownError: d.knownError,
      status: d.status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data || !draft) {
    return <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading…</div>;
  }

  const save = async () => {
    setSaving(true);
    const { error } = await updateProblem(id, {
      rootCause: draft.rootCause || null,
      workaround: draft.workaround || null,
      impact: draft.impact || null,
      knownError: draft.knownError,
      status: draft.status,
    });
    setSaving(false);
    if (error) return onToast(error, 'error');
    onToast(`${data.key} updated.`);
    load();
  };

  const incidents = (data.linked || []).filter(l => l.relation === 'caused by');

  return (
    <div style={{ maxWidth: '760px' }}>
      <button style={{ ...S.ghostBtn, marginBottom: '14px' }} onClick={onBack}>
        <ArrowLeft size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
        All problems
      </button>

      <div style={{ ...S.card, padding: '22px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {data.key}
              {data.knownError && (
                <span style={{ ...S.badge('#7C3AED'), marginLeft: '8px' }}>Known error</span>
              )}
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginTop: '2px',
              }}
            >
              {data.title}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={S.badge(PRIORITY_COLORS[data.priority])}>{data.priority}</span>
            {canManage ? (
              <select
                style={{ ...S.select, width: '130px' }}
                value={draft.status}
                onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}
              >
                {PROBLEM_STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <span style={S.badge(STATUS_COLOR[data.status] || '#6B7280')}>{data.status}</span>
            )}
          </div>
        </div>

        {data.description && (
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginTop: '10px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {data.description}
          </div>
        )}

        <label style={lbl}>Impact</label>
        <textarea
          style={{ ...S.textarea, minHeight: '54px' }}
          value={draft.impact}
          disabled={!canManage}
          onChange={e => setDraft(d => ({ ...d, impact: e.target.value }))}
          placeholder="Who/what is affected…"
        />
        <label style={lbl}>Root cause</label>
        <textarea
          style={{ ...S.textarea, minHeight: '80px' }}
          value={draft.rootCause}
          disabled={!canManage}
          onChange={e => setDraft(d => ({ ...d, rootCause: e.target.value }))}
          placeholder="The underlying cause — go past the trigger…"
        />
        <label style={lbl}>Workaround</label>
        <textarea
          style={{ ...S.textarea, minHeight: '80px' }}
          value={draft.workaround}
          disabled={!canManage}
          onChange={e => setDraft(d => ({ ...d, workaround: e.target.value }))}
          placeholder="Temporary mitigation while the fix lands…"
        />
        {canManage && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '14px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '13px',
                color: 'var(--text-primary)',
              }}
            >
              <input
                type="checkbox"
                checked={draft.knownError}
                onChange={e => setDraft(d => ({ ...d, knownError: e.target.checked }))}
              />
              Known error (documented workaround, fix pending)
            </label>
            <button style={S.orangeBtn} onClick={save} disabled={saving}>
              <Save size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div style={{ ...S.card, marginTop: '14px', padding: '18px' }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <LinkIcon size={14} /> Linked incidents & tickets
        </div>
        {incidents.length === 0 && (data.linked || []).length === 0 && (
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Nothing linked yet. Use “Create problem” from a ticket, or link from the ticket side.
          </div>
        )}
        {(data.linked || []).map(l => (
          <div
            key={`${l.id}-${l.relation}-${l.direction}`}
            style={{
              fontSize: '12.5px',
              padding: '6px 0',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              {l.direction === 'in' ? l.relation : `(${l.relation})`}
            </span>{' '}
            <b style={{ color: 'var(--accent-primary)' }}>{l.key}</b>{' '}
            <span style={{ color: 'var(--text-primary)' }}>{l.title}</span>
            <span style={{ color: 'var(--text-muted)' }}> · {l.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProblemsPage({ canManage, onToast }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [knownOnly, setKnownOnly] = useState(false);
  const [openId, setOpenId] = useState(null);

  const reload = useCallback(async () => {
    const params = {};
    if (knownOnly) params.knownError = '1';
    const { data, error } = await listProblems(params);
    if (error) onToast(error, 'error');
    else setProblems(data.problems || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownOnly]);

  useEffect(() => {
    reload();
  }, [reload]);

  const newProblem = async () => {
    const title = window.prompt('Problem title:');
    if (!title?.trim()) return;
    const { data, error } = await createProblem({ title: title.trim() });
    if (error) return onToast(error, 'error');
    onToast(`${data.key} created.`);
    setOpenId(data.id);
    reload();
  };

  if (openId) {
    return (
      <ProblemDetail
        id={openId}
        canManage={canManage}
        onBack={() => {
          setOpenId(null);
          reload();
        }}
        onToast={onToast}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <div style={S.pageTitle}>Problems</div>
          <div style={S.pageSub}>
            Root causes behind recurring incidents — and their workarounds.
          </div>
        </div>
        {canManage && (
          <button style={S.orangeBtn} onClick={newProblem}>
            <Plus size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
            New problem
          </button>
        )}
      </div>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          color: 'var(--text-primary)',
          marginBottom: '14px',
        }}
      >
        <input type="checkbox" checked={knownOnly} onChange={e => setKnownOnly(e.target.checked)} />
        Known errors only
      </label>

      {loading && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading…</div>}
      {!loading && !problems.length && (
        <div style={{ ...S.card, padding: '32px', textAlign: 'center' }}>
          <SearchCheck size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            No problem records yet. Open one from a recurring incident.
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {problems.map(p => (
          <button
            key={p.id}
            onClick={() => setOpenId(p.id)}
            style={{
              ...S.card,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {p.key}
                {p.knownError && (
                  <span style={{ ...S.badge('#7C3AED'), marginLeft: '8px' }}>Known error</span>
                )}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {p.title}
              </div>
              {p.workaround && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Workaround: {p.workaround.slice(0, 90)}
                  {p.workaround.length > 90 ? '…' : ''}
                </div>
              )}
            </div>
            <span style={S.badge(PRIORITY_COLORS[p.priority])}>{p.priority}</span>
            <span style={S.badge(STATUS_COLOR[p.status] || '#6B7280')}>{p.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
