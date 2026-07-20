// src/api/incidentsApi.js
// Incident-specific calls layered on the tickets router. Backend mode only.

import { api, wrap } from './client.js';

export const listIncidents = (params = {}) =>
  wrap(
    async () =>
      (await api.get('/api/tickets', { params: { ...params, issueType: 'Incident' } })).data
  );

export const listIncidentUpdates = ticketId =>
  wrap(async () => (await api.get(`/api/tickets/${ticketId}/incident-updates`)).data);

export const postIncidentUpdate = (ticketId, body) =>
  wrap(async () => (await api.post(`/api/tickets/${ticketId}/incident-updates`, { body })).data);

export const setIncidentFields = (ticketId, fields) =>
  wrap(async () => (await api.patch(`/api/tickets/${ticketId}`, fields)).data);

export const createPostmortem = ticketId =>
  wrap(async () => (await api.post(`/api/tickets/${ticketId}/postmortem`)).data);
