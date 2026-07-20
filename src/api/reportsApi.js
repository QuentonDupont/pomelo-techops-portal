// src/api/reportsApi.js
// KPI aggregates against server/routes/reports.js. Backend mode only.
// All calls accept { from, to } as YYYY-MM-DD strings.

import { api, wrap } from './client.js';

const get = (path, params) => wrap(async () => (await api.get(path, { params })).data);

export const getOverview = params => get('/api/reports/overview', params);
export const getTrend = params => get('/api/reports/trend', params);
export const getSlaReport = params => get('/api/reports/sla', params);
export const getVolume = params => get('/api/reports/volume', params);
export const getCsatReport = params => get('/api/reports/csat', params);
export const getChangesReport = params => get('/api/reports/changes', params);
