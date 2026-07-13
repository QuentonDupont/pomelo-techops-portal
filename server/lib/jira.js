// server/lib/jira.js
// Shared Jira REST helpers for the proxy routes: base URL, auth headers, the
// 503 guard for a missing token, and the fallback JSM workflow.

export const jiraBaseUrl = () => process.env.JIRA_BASE_URL || 'https://pomelofashion.atlassian.net';
export const jiraAuthHeaders = token => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: `Basic ${token}`,
});
// Character-allowlist sanitizers for values interpolated into Jira REST URLs.
// Issue keys look like PESD1-123; project codes like PESD1.
export const sanitizeIssueKey = raw => String(raw || '').replace(/[^A-Z0-9-]/gi, '');
export const sanitizeProject = raw => String(raw || 'PESD1').replace(/[^A-Z0-9]/gi, '');

export const requireJira = res => {
  const token = process.env.JIRA_API_TOKEN;
  if (!token) {
    res.status(503).json({ error: 'Jira API token is not configured on the server.' });
    return null;
  }
  return token;
};

// Canonical Jira Service Management workflow — used as a fallback when the
// project-specific or instance-wide endpoints are unreachable.
export const FALLBACK_JIRA_STATUSES = [
  { name: 'To Do', id: 'fallback-todo', category: 'new' },
  { name: 'In Progress', id: 'fallback-inprogress', category: 'indeterminate' },
  { name: 'Blocked', id: 'fallback-blocked', category: 'indeterminate' },
  { name: 'Waiting for Customer', id: 'fallback-waiting-customer', category: 'indeterminate' },
  { name: 'Waiting for Support', id: 'fallback-waiting-support', category: 'indeterminate' },
  { name: 'Resolved', id: 'fallback-resolved', category: 'done' },
  { name: 'Done', id: 'fallback-done', category: 'done' },
];
