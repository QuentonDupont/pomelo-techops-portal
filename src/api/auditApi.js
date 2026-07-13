// src/api/auditApi.js
// Read-only audit log against the BFF (server/routes/audit.js). Backend mode
// only — mock mode keeps using the AUDIT_LOG store owned by the app shell,
// branched at the call-site via API_ENABLED. Returns { data, error }.

import { api, wrap } from './client.js';

// → { entries: [{ id, actor, action, target, meta, at }], total }
// (requires audit.view)
export const listAudit = (params = {}) =>
  wrap(async () => (await api.get('/api/audit', { params })).data);
