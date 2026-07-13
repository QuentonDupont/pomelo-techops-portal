// src/lib/constants.js
// Shared domain constants for tickets: status/priority palettes, the legacy →
// Jira Service Management status mapping, SLA targets, and the option lists
// used by the submit form. Extracted from PomeloTechOpsPortal.jsx so future
// page components can import them without pulling in the whole shell.

export const PRIORITY_COLORS = {
  Critical: '#DC2626',
  High: '#EA580C',
  Medium: '#CA8A04',
  Low: '#16A34A',
};

// Color mapping covers both the legacy local names and the Jira Service
// Management workflow names. Unknown statuses fall back to slate gray.
export const STATUS_COLORS = {
  // Legacy local names
  Open: '#3B82F6',
  'In Progress': '#8B5CF6',
  Pending: '#F59E0B',
  Resolved: '#16A34A',
  Closed: 'var(--text-secondary)',
  // Jira Service Management canonical names
  'To Do': '#3B82F6',
  Blocked: '#DC2626',
  'Waiting for Customer': '#F59E0B',
  'Waiting for Support': '#F97316',
  Done: 'var(--text-secondary)',
};

export const STATUS_BG = {
  '#3B82F6': '#EFF6FF',
  '#8B5CF6': 'var(--accent-soft)',
  '#DC2626': '#FEF2F2',
  '#F59E0B': '#FFFBEB',
  '#F97316': '#FFF7ED',
  '#16A34A': '#F0FDF4',
  'var(--text-secondary)': 'var(--bg-hover)',
};

export const statusColorFor = name => STATUS_COLORS[name] || 'var(--text-secondary)';

// Maps legacy local statuses → canonical Jira Service Management names.
export const LEGACY_TO_JIRA_STATUS = {
  Open: 'To Do',
  'In Progress': 'In Progress',
  Pending: 'Waiting for Customer',
  Resolved: 'Resolved',
  Closed: 'Done',
};
export const mapLegacyStatus = name => LEGACY_TO_JIRA_STATUS[name] || name;

export const SLA_DATA = [
  { priority: 'Critical', response: '15 minutes', resolution: '4 hours', color: '#DC2626' },
  { priority: 'High', response: '1 hour', resolution: '8 hours', color: '#EA580C' },
  { priority: 'Medium', response: '4 hours', resolution: '2 business days', color: '#CA8A04' },
  { priority: 'Low', response: '1 business day', resolution: '5 business days', color: '#16A34A' },
];

// Machine-readable SLA targets (hours) — mirrors SLA_DATA for breach math.
// Business days are approximated as 8h for the calculation.
export const SLA_TARGETS_HOURS = {
  Critical: { response: 0.25, resolution: 4 },
  High: { response: 1, resolution: 8 },
  Medium: { response: 4, resolution: 16 },
  Low: { response: 8, resolution: 40 },
};

export const DONE_STATUSES = new Set(['Resolved', 'Done', 'Closed']);

export const PLATFORMS = [
  'Shopify',
  'Lazada',
  'Shopee',
  'TikTok Shop',
  'Amazon',
  'Tmall',
  'JD.com',
  'Nykaa',
  'Internal Tools',
  'Other',
];

export const SHOPS = [
  'Pomelo TH',
  'Pomelo MY',
  'Pomelo SG',
  'Pomelo PH',
  'Pomelo ID',
  'Pomelo VN',
  'Shopee TH',
  'Shopee SG',
  'Lazada TH',
  'Lazada SG',
  'Tiktok TH',
  'TMall',
  'RED',
  'JD',
  'Zalora SG',
  'Zalora HK',
  'Nykaa Ind',
  'All Shops',
  'Not Applicable',
];

export const DEPARTMENTS = [
  'Marketing',
  'Merchandising',
  'Tech & Engineering',
  'Finance',
  'HR & People',
  'Operations',
  'Creative',
  'Customer Experience',
  'Leadership',
  'Other',
];
