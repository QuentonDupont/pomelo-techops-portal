// src/context/ThemeContext.jsx
// Light/dark theme state for the Pomelo TechOps Portal.
// - Default: light. No `prefers-color-scheme` auto-detection.
// - Persists to localStorage under `pomelo:v1:theme`.
// - Sets `data-theme` on `<html>` so the cascade flips across the whole app.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'pomelo:v1:theme';
const ThemeContext = createContext(null);

// Read the persisted theme once, before React renders, so the very first paint
// uses the correct palette and there's no light→dark flicker on load.
export const readStoredTheme = () => {
  if (typeof window === 'undefined' || !window.localStorage) return 'light';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const applyThemeAttribute = theme => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
};

const persistTheme = theme => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    /* quota / private mode */
  }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);

  useEffect(() => {
    applyThemeAttribute(theme);
  }, [theme]);

  const setTheme = useCallback(next => {
    const normalised = next === 'dark' ? 'dark' : 'light';
    setThemeState(normalised);
    persistTheme(normalised);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      persistTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
