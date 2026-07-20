// src/api/csatApi.js
// Native CSAT surveys against server/routes/csat.js. Backend mode only.

import { api, wrap } from './client.js';

export const listMySurveys = () => wrap(async () => (await api.get('/api/csat/mine')).data);

// Either { ticketId } (session) or { token } (email deep link).
export const respondCsat = ({ ticketId, token, rating, comment = '' }) =>
  wrap(
    async () => (await api.post('/api/csat/respond', { ticketId, token, rating, comment })).data
  );

export const getTicketCsat = ticketId =>
  wrap(async () => (await api.get(`/api/csat/ticket/${ticketId}`)).data);

export const getCsatSummary = () => wrap(async () => (await api.get('/api/csat/summary')).data);
