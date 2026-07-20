// src/components/csat/CsatPrompt.jsx
// 5-star CSAT modal. Opens automatically when the signed-in requester has a
// pending survey (bell prompt) or when the app is entered via the emailed
// #csat?token=… deep link. One submission per survey; server enforces it.

import { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import { S } from '../../lib/styles.js';
import { listMySurveys, respondCsat } from '../../api/csatApi.js';

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 18, 30, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1300,
  padding: '20px',
};

// Read + strip the token from the location hash (#csat?token=abc).
export function csatTokenFromHash() {
  const m = window.location.hash.match(/^#csat\?token=([A-Za-z0-9._-]+)/);
  return m ? m[1] : null;
}

export default function CsatPrompt({ isAuthenticated, onToast }) {
  const [survey, setSurvey] = useState(null); // { ticketKey, ticketTitle, ticketId?, token? }
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => new Set());

  // Email deep link takes priority; token-auth needs no session.
  useEffect(() => {
    const token = csatTokenFromHash();
    if (token) {
      setSurvey({ token, ticketKey: null, ticketTitle: 'your recent request' });
      window.location.hash = '';
    }
  }, []);

  // Signed-in requester with pending surveys → prompt for the newest one.
  useEffect(() => {
    if (!isAuthenticated || survey) return;
    (async () => {
      const { data } = await listMySurveys();
      const next = (data?.surveys || []).find(s => !dismissed.has(s.id));
      if (next)
        setSurvey({
          id: next.id,
          ticketId: next.ticketId,
          ticketKey: next.ticketKey,
          ticketTitle: next.ticketTitle,
        });
    })();
  }, [isAuthenticated, survey, dismissed]);

  if (!survey) return null;

  const submit = async () => {
    if (!rating || busy) return;
    setBusy(true);
    const { error } = await respondCsat({
      ticketId: survey.ticketId,
      token: survey.token,
      rating,
      comment: comment.trim(),
    });
    setBusy(false);
    if (error) {
      onToast?.(error, 'error');
      setSurvey(null);
      return;
    }
    onToast?.('Thanks for the feedback!');
    setSurvey(null);
    setRating(0);
    setComment('');
  };

  const dismiss = () => {
    if (survey.id) setDismissed(prev => new Set(prev).add(survey.id));
    setSurvey(null);
    setRating(0);
    setComment('');
  };

  return (
    <div style={overlay} onClick={dismiss}>
      <div
        style={{
          ...S.card,
          width: '440px',
          maxWidth: '100%',
          padding: '26px',
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Rate your support experience"
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            style={{ ...S.ghostBtn, padding: '4px 7px' }}
            onClick={dismiss}
            aria-label="Dismiss survey"
          >
            <X size={13} />
          </button>
        </div>
        <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
          How did we do?
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 18px' }}>
          {survey.ticketKey ? (
            <>
              <b>{survey.ticketKey}</b> — {survey.ticketTitle} was resolved.
            </>
          ) : (
            <>Rate the support you received on {survey.ticketTitle}.</>
          )}
        </div>
        <div
          style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}
        >
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
            >
              <Star
                size={30}
                fill={(hover || rating) >= n ? '#F59E0B' : 'none'}
                color={(hover || rating) >= n ? '#F59E0B' : 'var(--border-default)'}
              />
            </button>
          ))}
        </div>
        <textarea
          style={{ ...S.textarea, minHeight: '64px', marginBottom: '14px' }}
          placeholder="Anything we could do better? (optional)"
          value={comment}
          onChange={e => setComment(e.target.value)}
          maxLength={2000}
        />
        <button
          style={{ ...S.orangeBtn, width: '100%' }}
          disabled={!rating || busy}
          onClick={submit}
        >
          {busy ? 'Sending…' : 'Submit rating'}
        </button>
      </div>
    </div>
  );
}
