// src/api/changesApi.js
// Change requests against server/routes/changes.js. Backend mode only.

import { api, wrap } from './client.js';

export const listChanges = (params = {}) =>
  wrap(async () => (await api.get('/api/changes', { params })).data);

export const getChange = id => wrap(async () => (await api.get(`/api/changes/${id}`)).data);

export const listChangeCalendar = (from, to) =>
  wrap(async () => (await api.get('/api/changes/calendar', { params: { from, to } })).data);

export const createChange = payload =>
  wrap(async () => (await api.post('/api/changes', payload)).data);

export const updateChange = (id, updates) =>
  wrap(async () => (await api.patch(`/api/changes/${id}`, updates)).data);

export const submitChangeForApproval = (id, approverEmails) =>
  wrap(
    async () => (await api.post(`/api/changes/${id}/submit-for-approval`, { approverEmails })).data
  );

export const completeChange = (id, outcome) =>
  wrap(async () => (await api.post(`/api/changes/${id}/complete`, { outcome })).data);
