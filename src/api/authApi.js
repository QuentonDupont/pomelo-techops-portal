// src/api/authApi.js
// Session auth against the BFF (server/routes/auth.js). Backend mode only —
// mock-mode login lives in src/lib/localAuth.js and is branched at the shell
// (see API_ENABLED). Every function returns { data, error }.
//
// The session is an httpOnly cookie set by the server; the client never sees
// or stores the token.

import { api, wrap } from './client.js';

export const login = (email, password) =>
  wrap(async () => {
    const { data } = await api.post('/api/auth/login', { email, password });
    return data.user;
  });

export const logout = () => wrap(async () => (await api.post('/api/auth/logout')).data);

// Returns the current user, or null when there is no valid session (401 is an
// expected boot-time outcome, not an error).
export const me = async () => {
  try {
    const { data } = await api.get('/api/auth/me');
    return { data: data.user, error: null };
  } catch (err) {
    if (err?.response?.status === 401) return { data: null, error: null };
    return wrap(() => Promise.reject(err));
  }
};

export const register = (name, email, password) =>
  wrap(async () => (await api.post('/api/auth/register', { name, email, password })).data);

export const verifyEmail = token =>
  wrap(async () => (await api.post('/api/auth/verify', { token })).data);

export const invite = (email, roleId, name) =>
  wrap(
    async () =>
      (await api.post('/api/auth/invite', { email, roleId, ...(name ? { name } : {}) })).data
  );

export const acceptInvite = (token, name, password) =>
  wrap(async () => {
    const { data } = await api.post('/api/auth/accept-invite', { token, name, password });
    return data.user;
  });

export const requestReset = email =>
  wrap(async () => (await api.post('/api/auth/request-reset', { email })).data);

export const resetPassword = (token, password) =>
  wrap(async () => (await api.post('/api/auth/reset', { token, password })).data);
