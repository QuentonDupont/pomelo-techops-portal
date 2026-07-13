// src/api/client.js
// Shared HTTP client base for every API module (docs, auth, tickets, users,
// roles, audit). One axios instance, one error-envelope reader, one mock flag.
//
// Backend mode is a single switch: set VITE_API_BASE_URL and every API module
// talks to the BFF; leave it blank and they fall back to mock/localStorage
// behaviour. withCredentials is required — the session is an httpOnly cookie.

import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const API_ENABLED = Boolean(BASE_URL);
export const USE_MOCK = !API_ENABLED;

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// The backend's error envelope is { error: string } (legacy shapes used
// message); fall through so real server messages reach the user instead of
// axios's generic "Request failed with status code N".
export const errorMessage = err => {
  const data = err?.response?.data;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (err?.message) return err.message;
  return 'An unexpected error occurred. Please try again.';
};

// Wraps an async operation into the { data, error } result shape every
// call-site consumes. error is a user-presentable string or null.
export const wrap = async fn => {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
};

// Keeps mock mode honest about latency so loading states stay exercised.
export const simulateDelay = (ms = 400) => new Promise(r => setTimeout(r, ms));
