// src/lib/localAuth.js
// Client-side auth primitives for mock/localStorage mode ONLY.
//
// This is demo-grade authentication: it runs entirely in the browser and must
// never gate anything sensitive. When VITE_API_BASE_URL is configured the app
// authenticates against the backend instead (src/api/authApi.js) and none of
// the password code here is used.
//
// Passwords are salted SHA-256 via Web Crypto. All functions are pure with
// respect to module state — callers own the user list and persistence.

const _subtle = typeof crypto !== 'undefined' && crypto.subtle;

export const SESSION_KEY = 'pomelo_techops_session';
export const LOCK_KEY = 'pomelo_login_lock';
export const REMEMBER_KEY = 'pomelo_remember_email';
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 30_000;
export const AUTH_DELAY = 600;

// ─── Password hashing ─────────────────────────────────────────────────────────
export const randomSalt = () => {
  const a = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const sha256Hex = async text => {
  if (!_subtle) return null;
  const data = new TextEncoder().encode(text);
  const hash = await _subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const hashPassword = (salt, password) => sha256Hex(salt + ':' + password);

export const verifyPassword = async (user, password) => {
  if (!user || !user.passwordSalt) return false;
  const h = await hashPassword(user.passwordSalt, password);
  return h === user.passwordHash;
};

// Mutates the user object; the caller persists (bump/save) afterwards.
export const setPassword = async (user, password) => {
  const salt = randomSalt();
  const h = await hashPassword(salt, password);
  if (!h) return;
  user.passwordSalt = salt;
  user.passwordHash = h;
};

// Check credentials against a caller-owned user list.
// Returns { user: safeUser | null, deactivated: boolean }.
export const validateCredentials = async (users, email, password) => {
  const sanitised = email.trim().toLowerCase();
  const user = users.find(u => u.email === sanitised);
  if (!user) {
    // Compute a dummy hash so timing is comparable across hit/miss.
    await hashPassword('dummy_salt_' + sanitised, password).catch(() => null);
    return { user: null, deactivated: false };
  }
  const ok = await verifyPassword(user, password);
  if (!ok) return { user: null, deactivated: false };
  if (user.active === false) return { user: null, deactivated: true };
  const { passwordHash: _hash, passwordSalt: _salt, ...safe } = user;
  return { user: safe, deactivated: false };
};

// ─── Session + lockout (sessionStorage) ───────────────────────────────────────
export const writeSession = safeUser => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...safeUser, loginAt: Date.now() }));
};
export const getSession = () => {
  try {
    const r = sessionStorage.getItem(SESSION_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
};
export const clearSession = () => sessionStorage.removeItem(SESSION_KEY);

export const getLockState = () => {
  try {
    const r = sessionStorage.getItem(LOCK_KEY);
    return r ? JSON.parse(r) : { attempts: 0, lockedUntil: 0 };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
};
export const setLockState = (attempts, lockedUntil) =>
  sessionStorage.setItem(LOCK_KEY, JSON.stringify({ attempts, lockedUntil }));
export const clearLockState = () => sessionStorage.removeItem(LOCK_KEY);
