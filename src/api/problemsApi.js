// src/api/problemsApi.js
// Problem records against server/routes/problems.js. Backend mode only.

import { api, wrap } from './client.js';

export const listProblems = (params = {}) =>
  wrap(async () => (await api.get('/api/problems', { params })).data);

export const getProblem = id => wrap(async () => (await api.get(`/api/problems/${id}`)).data);

export const createProblem = payload =>
  wrap(async () => (await api.post('/api/problems', payload)).data);

export const createProblemFromTicket = ticketId =>
  wrap(async () => (await api.post(`/api/problems/from-ticket/${ticketId}`)).data);

export const updateProblem = (id, updates) =>
  wrap(async () => (await api.patch(`/api/problems/${id}`, updates)).data);
