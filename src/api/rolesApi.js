// src/api/rolesApi.js
// Role management against the BFF (server/routes/roles.js). Backend mode only —
// mock mode keeps using the ROLES_REGISTRY owned by the app shell, branched at
// the call-site via API_ENABLED. Every function returns { data, error }.

import { api, wrap } from './client.js';

// → { roles: [...] } (any authenticated user; needed to render role badges)
export const listRoles = () => wrap(async () => (await api.get('/api/roles')).data);

// payload: { label, description?, color?, capabilities? } (requires roles.create)
export const createRole = payload => wrap(async () => (await api.post('/api/roles', payload)).data);

// updates: { label?, description?, color?, capabilities? } (requires roles.edit)
export const updateRole = (id, updates) =>
  wrap(async () => (await api.patch(`/api/roles/${id}`, updates)).data);

export const deleteRole = id => wrap(async () => (await api.delete(`/api/roles/${id}`)).data);
