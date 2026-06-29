// src/components/suggestions/suggestionsStore.js
// localStorage-backed store for the Suggestions board (Reddit-style feedback).
// Matches the app's current mock/localStorage pattern (pomelo:v1: prefix) so it
// works today; this is the same data shape a future /api/suggestions + S3 layer
// will persist once the backend migration lands.

const KEY = 'pomelo:v1:suggestions';
const safeLocal = typeof window !== 'undefined' && window.localStorage;

export const STATUSES = ['Open', 'Under review', 'Planned', 'In progress', 'Done', 'Declined'];
export const STATUS_META = {
  Open: { color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  'Under review': { color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  Planned: { color: '#0891B2', bg: 'rgba(8,145,178,0.12)' },
  'In progress': { color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  Done: { color: '#16A34A', bg: 'rgba(22,163,74,0.12)' },
  Declined: { color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
};
export const CATEGORIES = ['Feature', 'Documentation', 'Change request', 'Bug', 'Other'];

const uid = p => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Seed content (only when the store is empty) ──────────────────────────────
const seed = () => {
  const now = Date.now();
  const iso = ms => new Date(ms).toISOString();
  return [
    {
      id: uid('sg'),
      title: 'Add a dark-mode toggle to the mobile view',
      body: 'On phones the portal is always light. A **dark mode** toggle that follows the system setting would be much easier on the eyes during on-call.',
      category: 'Feature',
      status: 'Planned',
      authorName: 'Kai Nguyen',
      authorEmail: 'kai.nguyen@pomelo.com',
      authorRoleLabel: 'User',
      authorRoleColor: '#52525B',
      authorIsStaff: false,
      createdAt: iso(now - 1000 * 60 * 60 * 26),
      updatedAt: iso(now - 1000 * 60 * 60 * 2),
      votes: {
        'kai.nguyen@pomelo.com': 1,
        'prim.srisawat@pomelo.com': 1,
        'alex.lee@pomelo.com': 1,
      },
      comments: [
        {
          id: uid('cm'),
          parentId: null,
          authorName: 'Alex Lee',
          authorEmail: 'alex.lee@pomelo.com',
          authorRoleLabel: 'Superadmin',
          authorRoleColor: '#DC2626',
          isStaff: true,
          body: "On our radar — targeting next sprint. Here's a quick mock of the toggle placement.",
          attachments: [],
          createdAt: iso(now - 1000 * 60 * 60 * 2),
        },
      ],
    },
    {
      id: uid('sg'),
      title: 'Document the VPN split-tunnel setup for contractors',
      body: 'Contractors keep opening tickets for the same VPN steps. A short how-to with screenshots would cut these in half.',
      category: 'Documentation',
      status: 'Open',
      authorName: 'Prim Srisawat',
      authorEmail: 'prim.srisawat@pomelo.com',
      authorRoleLabel: 'User',
      authorRoleColor: '#52525B',
      authorIsStaff: false,
      createdAt: iso(now - 1000 * 60 * 60 * 5),
      updatedAt: iso(now - 1000 * 60 * 60 * 5),
      votes: { 'prim.srisawat@pomelo.com': 1 },
      comments: [],
    },
  ];
};

export function loadSuggestions() {
  if (!safeLocal) return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const seeded = seed();
      window.localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seed();
  } catch {
    return seed();
  }
}

function save(list) {
  if (!safeLocal) return list;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota (e.g. large image data URLs) — drop silently */
  }
  return list;
}

// All mutators read-modify-write and return the new array so the caller can
// setState(mutator(...)) optimistically.
export function createSuggestion(fields) {
  const list = loadSuggestions();
  const now = new Date().toISOString();
  const item = {
    id: uid('sg'),
    title: fields.title,
    body: fields.body || '',
    category: fields.category || 'Other',
    status: 'Open',
    authorName: fields.authorName,
    authorEmail: fields.authorEmail,
    authorRoleLabel: fields.authorRoleLabel || 'User',
    authorRoleColor: fields.authorRoleColor || '#52525B',
    authorIsStaff: Boolean(fields.authorIsStaff),
    createdAt: now,
    updatedAt: now,
    votes: { [fields.authorEmail]: 1 }, // author auto-upvotes their own post
    comments: [],
  };
  return save([item, ...list]);
}

export function voteSuggestion(id, email, dir) {
  const list = loadSuggestions().map(s => {
    if (s.id !== id) return s;
    const votes = { ...(s.votes || {}) };
    if (votes[email] === dir)
      delete votes[email]; // toggle off
    else votes[email] = dir;
    return { ...s, votes };
  });
  return save(list);
}

export function setStatus(id, status) {
  const list = loadSuggestions().map(s =>
    s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s
  );
  return save(list);
}

export function deleteSuggestion(id) {
  return save(loadSuggestions().filter(s => s.id !== id));
}

export function addComment(id, comment) {
  const list = loadSuggestions().map(s => {
    if (s.id !== id) return s;
    const c = {
      id: uid('cm'),
      parentId: comment.parentId || null,
      authorName: comment.authorName,
      authorEmail: comment.authorEmail,
      authorRoleLabel: comment.authorRoleLabel || 'User',
      authorRoleColor: comment.authorRoleColor || '#52525B',
      isStaff: Boolean(comment.isStaff),
      body: comment.body || '',
      attachments: comment.attachments || [],
      createdAt: new Date().toISOString(),
    };
    return { ...s, comments: [...(s.comments || []), c], updatedAt: new Date().toISOString() };
  });
  return save(list);
}

export function deleteComment(id, commentId) {
  const list = loadSuggestions().map(s => {
    if (s.id !== id) return s;
    // Drop the comment and any replies pointing at it.
    const comments = (s.comments || []).filter(c => c.id !== commentId && c.parentId !== commentId);
    return { ...s, comments };
  });
  return save(list);
}

// ─── Derived helpers ──────────────────────────────────────────────────────────
export const scoreOf = s => Object.values(s.votes || {}).reduce((sum, v) => sum + (v || 0), 0);

// Reddit-ish "hot": score damped by age so fresh, well-voted posts rise.
export const hotRank = s => {
  const score = scoreOf(s);
  const ageHrs = (Date.now() - new Date(s.createdAt).getTime()) / 3.6e6;
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0;
  return sign * Math.log10(Math.max(Math.abs(score), 1)) - ageHrs / 12;
};

// Turn a pasted video URL into an embeddable URL when we recognise the provider.
// Returns { embed } for iframe providers, { direct } for raw video files, or
// { link } when we can only link out.
export function resolveVideo(url) {
  const u = (url || '').trim();
  if (!u) return null;
  try {
    const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
    if (yt) return { kind: 'embed', src: `https://www.youtube.com/embed/${yt[1]}` };
    const loom = u.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
    if (loom) return { kind: 'embed', src: `https://www.loom.com/embed/${loom[1]}` };
    const vimeo = u.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeo[1]}` };
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return { kind: 'direct', src: u };
    return { kind: 'link', src: u };
  } catch {
    return { kind: 'link', src: u };
  }
}

export const IMAGE_MAX_BYTES = 1_500_000; // ~1.5MB cap for in-browser image data URLs
