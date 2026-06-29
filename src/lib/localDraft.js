// src/lib/localDraft.js
// Standalone, per-user localStorage draft persistence for module components
// (Documentation Studio and friends). Mirrors the `pomelo:v1:` convention used
// by the main portal so all persisted state shares one namespace.

const STORE_PREFIX = 'pomelo:v1:';
const safeLocal = typeof window !== 'undefined' && window.localStorage;

export const loadDraft = (key, fallback) => {
  if (!safeLocal) return fallback;
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const saveDraft = (key, value) => {
  if (!safeLocal) return;
  try {
    window.localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota / private mode — drop silently */
  }
};

export const clearDraftKey = key => {
  if (!safeLocal) return;
  try {
    window.localStorage.removeItem(STORE_PREFIX + key);
  } catch {
    /* ignore */
  }
};
