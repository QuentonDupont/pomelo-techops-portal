// src/api/slaApi.js
// SLA policy targets against server/routes/sla.js. Backend mode only — mock
// mode renders the static SLA_DATA reference from constants.

import { api, wrap } from './client.js';

export const listSlaPolicies = () => wrap(async () => (await api.get('/api/sla/policies')).data);

// policies: [{ priority, responseMinutes, resolutionMinutes }]
export const updateSlaPolicies = policies =>
  wrap(async () => (await api.put('/api/sla/policies', { policies })).data);
