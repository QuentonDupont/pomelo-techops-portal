// src/api/requestTypesApi.js
// Service catalog request types against the BFF (server/routes/requestTypes.js).
// Backend mode only — in mock mode the catalog page hides itself and the
// legacy generic submit form is shown instead. Every function returns
// { data, error } via wrap().

import { api, wrap } from './client.js';

// Active types only (the requester-facing catalog).
export const listRequestTypes = () => wrap(async () => (await api.get('/api/request-types')).data);

// Every type including inactive (admin editor).
export const listAllRequestTypes = () =>
  wrap(async () => (await api.get('/api/request-types', { params: { all: '1' } })).data);

// payload: { name, description?, icon?, category?, fields?, defaults?,
//            requiresApproval?, approverEmail?, active?, sort? }
export const createRequestType = payload =>
  wrap(async () => (await api.post('/api/request-types', payload)).data);

export const updateRequestType = (id, updates) =>
  wrap(async () => (await api.patch(`/api/request-types/${id}`, updates)).data);

// Deletes when unused; deactivates when tickets reference it.
export const deleteRequestType = id =>
  wrap(async () => (await api.delete(`/api/request-types/${id}`)).data);
