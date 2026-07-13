// src/lib/store.js
// Versioned localStorage persistence for mock/offline mode. Every store the
// portal persists client-side goes through these helpers so the namespace and
// failure handling (quota, private mode, SSR) stay in one place.
//
// When VITE_API_BASE_URL is set the backend becomes the source of truth and
// these stores act only as a boot-time cache.

const STORE_PREFIX = 'pomelo:v1:';
const safeLocal = typeof window !== 'undefined' && window.localStorage;

export const loadStore = (key, fallback) => {
  if (!safeLocal) return fallback;
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const saveStore = (key, value) => {
  if (!safeLocal) return;
  try {
    window.localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / private mode — drop silently */
  }
};

export const clearStore = key => {
  if (!safeLocal) return;
  try {
    window.localStorage.removeItem(STORE_PREFIX + key);
  } catch {
    /* ignore */
  }
};
