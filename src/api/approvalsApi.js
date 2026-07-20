// src/api/approvalsApi.js
// Approval records against server/routes/approvals.js. Backend mode only.

import { api, wrap } from './client.js';

export const listMyApprovals = () => wrap(async () => (await api.get('/api/approvals/mine')).data);

export const listSubjectApprovals = (type, id) =>
  wrap(async () => (await api.get(`/api/approvals/subject/${type}/${id}`)).data);

export const requestApproval = ({ subjectType = 'ticket', subjectId, approverEmail }) =>
  wrap(
    async () => (await api.post('/api/approvals', { subjectType, subjectId, approverEmail })).data
  );

export const decideApproval = (id, decision, comment = '') =>
  wrap(async () => (await api.post(`/api/approvals/${id}/decide`, { decision, comment })).data);
