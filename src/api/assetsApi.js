// src/api/assetsApi.js
// Asset registry against server/routes/assets.js. Backend mode only.

import { api, wrap, BASE_URL } from './client.js';

export const listAssets = (params = {}) =>
  wrap(async () => (await api.get('/api/assets', { params })).data);

export const getAsset = id => wrap(async () => (await api.get(`/api/assets/${id}`)).data);

export const createAsset = payload =>
  wrap(async () => (await api.post('/api/assets', payload)).data);

export const updateAsset = (id, updates) =>
  wrap(async () => (await api.patch(`/api/assets/${id}`, updates)).data);

export const deleteAsset = id => wrap(async () => (await api.delete(`/api/assets/${id}`)).data);

export const assignAsset = (id, userEmail, userName) =>
  wrap(async () => (await api.post(`/api/assets/${id}/assign`, { userEmail, userName })).data);

export const returnAsset = id =>
  wrap(async () => (await api.post(`/api/assets/${id}/return`)).data);

export const linkAssetTicket = (assetId, ticketId) =>
  wrap(async () => (await api.post(`/api/assets/${assetId}/tickets`, { ticketId })).data);

export const unlinkAssetTicket = (assetId, ticketId) =>
  wrap(async () => (await api.delete(`/api/assets/${assetId}/tickets/${ticketId}`)).data);

export const listTicketAssets = ticketId =>
  wrap(async () => (await api.get(`/api/assets/by-ticket/${ticketId}`)).data);

// rows: array of {name,type,serial,...} parsed client-side from CSV.
export const importAssets = assets =>
  wrap(async () => (await api.post('/api/assets/import', { assets })).data);

export const assetsCsvUrl = () => `${BASE_URL}/api/assets/export.csv`;
