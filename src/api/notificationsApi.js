// src/api/notificationsApi.js
// Persisted server notifications (SLA breaches, approvals, CSAT prompts)
// against server/routes/notifications.js. Backend mode only; the in-memory
// NotificationContext keeps handling client-local events in both modes.

import { api, wrap } from './client.js';

export const listNotifications = (limit = 30) =>
  wrap(async () => (await api.get('/api/notifications', { params: { limit } })).data);

export const markNotificationRead = id =>
  wrap(async () => (await api.post(`/api/notifications/${id}/read`)).data);

export const markAllNotificationsRead = () =>
  wrap(async () => (await api.post('/api/notifications/read-all')).data);
