// src/api/ticketsApi.js
// Ticket persistence against the BFF (server/routes/tickets.js). Backend mode
// only — mock mode keeps using the in-memory MOCK_TICKETS store owned by the
// app shell, branched at the call-site via API_ENABLED (src/api/client.js).
// Every function returns { data, error }.

import { api, wrap } from './client.js';

// list({ status, priority, assignee, search, limit, offset })
// → { tickets: [...], total }
export const listTickets = (params = {}) =>
  wrap(async () => (await api.get('/api/tickets', { params })).data);

// → ticket with comments + timeline included
export const getTicket = id => wrap(async () => (await api.get(`/api/tickets/${id}`)).data);

// payload: { title, description?, category?, priority?, department?, shop?,
//            platforms?, assigneeEmail?, assigneeName? }
export const createTicket = payload =>
  wrap(async () => (await api.post('/api/tickets', payload)).data);

// updates: { title?, description?, category?, priority?, status? }
export const updateTicket = (id, updates) =>
  wrap(async () => (await api.patch(`/api/tickets/${id}`, updates)).data);

// assigneeEmail: string | null (null unassigns)
export const assignTicket = (id, assigneeEmail, assigneeName) =>
  wrap(
    async () =>
      (
        await api.post(`/api/tickets/${id}/assign`, {
          assigneeEmail,
          ...(assigneeName ? { assigneeName } : {}),
        })
      ).data
  );

export const addComment = (id, body, internal = false) =>
  wrap(async () => (await api.post(`/api/tickets/${id}/comments`, { body, internal })).data);

export const deleteTicket = id => wrap(async () => (await api.delete(`/api/tickets/${id}`)).data);
