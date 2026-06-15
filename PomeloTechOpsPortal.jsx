import { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, Component } from 'react';
import DocImportExportPage from './src/components/docs/DocImportExportPage.jsx';
import { createJiraTicket, isJiraConfigured } from './src/api/jiraApi.js';
import { listFeaturedDocs, listDocSummaries } from './src/api/docsApi.js';
import FilePreviewCard, { fileToAttachment, ATTACHMENT_DATAURL_LIMIT as _ATT_LIMIT } from './src/components/FilePreviewCard.jsx'; // eslint-disable-line no-unused-vars
import { NotificationProvider, useNotifications, buildSeedNotifications } from './src/context/NotificationContext.jsx';
import NotificationBell from './src/components/NotificationBell.jsx';
import { useTheme } from './src/context/ThemeContext.jsx';
import {
  CAPABILITIES, SEED_ROLES, DEFAULT_ASSIGNEE,
  LEGACY_ROLE_TO_ROLE_ID, SEED_EMAIL_REWRITE, DEFAULT_ROLE_ID,
  RBAC_SCHEMA_VERSION, hasPermission,
} from './src/rbac.js';
import {
  Search, Wrench, Users as UsersIcon, ScrollText, MessageCircle, BookOpen,
  Target, ClipboardList, Ticket, Home, PlusCircle, Moon, Sun, ChevronDown,
  Star, User, Eye, Sparkles, X, Bell as BellIcon, Check,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';

// ─── Error Boundary ───────────────────────────────────────────────────────────
// Catches render errors in any child subtree and shows a friendly fallback
// instead of a blank white screen. Wrap major page sections with this.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 28px', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Something went wrong
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px' }}>
            {this.state.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            style={{ padding: '9px 20px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_TICKETS = [
  {
    id: 'TKT-2026-0042',
    title: 'Cannot access Shopify admin panel',
    category: 'Access & Permissions',
    priority: 'High',
    status: 'In Progress',
    created: '2026-03-24',
    updated: '2026-03-25',
    description: 'Getting 403 error when trying to access the Shopify admin. Was working fine yesterday.',
    assignee: 'Kai Nguyen',
    department: 'Operations',
    shop: 'Pomelo TH',
    platforms: ['Shopify'],
    timeline: [
      { date: '2026-03-24 09:15', action: 'Ticket submitted', actor: 'You' },
      { date: '2026-03-24 09:22', action: 'Ticket assigned to IT Support', actor: 'System' },
      { date: '2026-03-24 11:30', action: 'Status changed to In Progress', actor: 'Kai Nguyen' },
    ],
    messages: [
      { from: 'You', time: '2026-03-24 09:15', text: 'I cannot access the Shopify admin panel. Getting a 403 forbidden error.' },
      { from: 'Kai Nguyen', time: '2026-03-24 11:32', text: 'Hi, I\'ve received your ticket. Can you confirm which Shopify store you\'re trying to access?' },
      { from: 'You', time: '2026-03-24 11:45', text: 'It\'s the main Pomelo store — pomelo-fashion.myshopify.com' },
    ],
  },
  {
    id: 'TKT-2026-0038',
    title: 'Slack notifications not working on mobile',
    category: 'Software & Apps',
    priority: 'Medium',
    status: 'Resolved',
    created: '2026-03-20',
    updated: '2026-03-22',
    description: 'Push notifications from Slack stopped arriving on my iPhone after the latest iOS update.',
    assignee: 'Prim Srisawat',
    department: 'Marketing',
    shop: 'Not Applicable',
    platforms: ['Internal Tools'],
    timeline: [
      { date: '2026-03-20 14:00', action: 'Ticket submitted', actor: 'You' },
      { date: '2026-03-20 14:10', action: 'Ticket assigned to IT Support', actor: 'System' },
      { date: '2026-03-21 10:00', action: 'Status changed to In Progress', actor: 'Prim Srisawat' },
      { date: '2026-03-22 15:30', action: 'Status changed to Resolved', actor: 'Prim Srisawat' },
    ],
    messages: [
      { from: 'You', time: '2026-03-20 14:00', text: 'Slack push notifications stopped working on my iPhone after updating to iOS 18.3.' },
      { from: 'Prim Srisawat', time: '2026-03-21 10:05', text: 'Please go to Settings > Notifications > Slack and toggle notifications off, then back on.' },
      { from: 'You', time: '2026-03-21 10:20', text: 'That worked! Thank you so much.' },
      { from: 'Prim Srisawat', time: '2026-03-22 15:30', text: 'Glad that resolved it! Marking this ticket as resolved. Let us know if the issue recurs.' },
    ],
  },
  {
    id: 'TKT-2026-0031',
    title: 'New laptop setup request',
    category: 'Hardware',
    priority: 'Low',
    status: 'Resolved',
    created: '2026-03-10',
    updated: '2026-03-15',
    description: 'Need a new MacBook Pro set up for the new marketing hire starting March 17.',
    assignee: 'Kai Nguyen',
    department: 'HR & People',
    shop: 'Not Applicable',
    platforms: ['Internal Tools'],
    timeline: [
      { date: '2026-03-10 10:00', action: 'Ticket submitted', actor: 'You' },
      { date: '2026-03-10 10:15', action: 'Ticket assigned to IT Support', actor: 'System' },
      { date: '2026-03-12 09:00', action: 'Status changed to In Progress', actor: 'Kai Nguyen' },
      { date: '2026-03-15 16:00', action: 'Status changed to Resolved', actor: 'Kai Nguyen' },
    ],
    messages: [
      { from: 'You', time: '2026-03-10 10:00', text: 'New hire Amara Lee starting March 17 — needs MacBook Pro with standard software bundle.' },
      { from: 'Kai Nguyen', time: '2026-03-12 09:05', text: "Confirmed. We'll have it ready by March 16." },
      { from: 'You', time: '2026-03-15 16:30', text: 'Laptop received and looks great. Thank you!' },
    ],
  },
  {
    id: 'TKT-2026-0045',
    title: 'Shopee product sync failing for TH store',
    category: 'Software & Apps',
    priority: 'Critical',
    status: 'Open',
    created: '2026-03-26',
    updated: '2026-03-26',
    description: 'Product data is not syncing from our PIM to Shopee TH. Last successful sync was 6 hours ago. 200+ SKUs are out of date.',
    assignee: null,
    department: 'Merchandising',
    shop: 'Pomelo TH',
    platforms: ['Shopee'],
    timeline: [
      { date: '2026-03-26 08:10', action: 'Ticket submitted', actor: 'Sara M.' },
      { date: '2026-03-26 08:12', action: 'Ticket assigned to IT Support', actor: 'System' },
    ],
    messages: [
      { from: 'Sara M.', time: '2026-03-26 08:10', text: 'Shopee TH sync has been failing since 2 AM. Our inventory is out of date for 200+ SKUs.' },
    ],
  },
  {
    id: 'TKT-2026-0044',
    title: 'TikTok Shop banner images not displaying',
    category: 'Software & Apps',
    priority: 'High',
    status: 'Open',
    created: '2026-03-25',
    updated: '2026-03-25',
    description: 'Campaign banner images uploaded to TikTok Shop are not rendering. Shows broken image placeholder.',
    assignee: null,
    department: 'Marketing',
    shop: 'Pomelo TH',
    platforms: ['TikTok Shop'],
    timeline: [
      { date: '2026-03-25 13:00', action: 'Ticket submitted', actor: 'Fern P.' },
      { date: '2026-03-25 13:05', action: 'Ticket assigned to IT Support', actor: 'System' },
    ],
    messages: [
      { from: 'Fern P.', time: '2026-03-25 13:00', text: 'Campaign banners are broken on TikTok Shop. Launch is tomorrow morning.' },
    ],
  },
  {
    id: 'TKT-2026-0043',
    title: 'Lazada order export missing shipping fields',
    category: 'Data & Storage',
    priority: 'Medium',
    status: 'Pending',
    created: '2026-03-24',
    updated: '2026-03-25',
    description: 'Weekly Lazada order export CSV is missing the shipping_method and tracking_number columns since last Tuesday.',
    assignee: 'Prim Srisawat',
    department: 'Operations',
    shop: 'Pomelo MY',
    platforms: ['Lazada'],
    timeline: [
      { date: '2026-03-24 09:00', action: 'Ticket submitted', actor: 'Ops Team' },
      { date: '2026-03-24 09:15', action: 'Ticket assigned to Prim Srisawat', actor: 'System' },
      { date: '2026-03-24 14:00', action: 'Status changed to In Progress', actor: 'Prim Srisawat' },
      { date: '2026-03-25 10:00', action: 'Status changed to Pending — awaiting vendor response', actor: 'Prim Srisawat' },
    ],
    messages: [
      { from: 'Ops Team', time: '2026-03-24 09:00', text: 'The Lazada export is missing shipping_method and tracking_number since March 18.' },
      { from: 'Prim Srisawat', time: '2026-03-24 14:05', text: "I've reproduced the issue. It looks like a Lazada API change on their end. Raising a vendor ticket with them now." },
      { from: 'Prim Srisawat', time: '2026-03-25 10:00', text: 'Waiting on Lazada support response. Ticket is Pending until they confirm the API fix.' },
    ],
  },
  {
    id: 'TKT-2026-0041',
    title: 'Amazon SG product images aspect ratio wrong',
    category: 'Software & Apps',
    priority: 'Medium',
    status: 'In Progress',
    created: '2026-03-23',
    updated: '2026-03-25',
    description: 'Product images on Amazon SG are showing with incorrect 4:3 crop instead of 1:1 square. Affects all 340 active listings.',
    assignee: 'Kai Nguyen',
    department: 'Merchandising',
    shop: 'Pomelo SG',
    platforms: ['Amazon'],
    timeline: [
      { date: '2026-03-23 11:00', action: 'Ticket submitted', actor: 'James T.' },
      { date: '2026-03-23 11:10', action: 'Ticket assigned to Kai Nguyen', actor: 'System' },
      { date: '2026-03-24 09:30', action: 'Status changed to In Progress', actor: 'Kai Nguyen' },
    ],
    messages: [
      { from: 'James T.', time: '2026-03-23 11:00', text: 'All product images on Amazon SG are showing 4:3 instead of 1:1. Started after the batch re-upload yesterday.' },
      { from: 'Kai Nguyen', time: '2026-03-24 09:35', text: "I've identified the issue — the image processor was using the wrong crop preset. Working on a fix now." },
    ],
  },
  {
    id: 'TKT-2026-0039',
    title: 'Google Analytics 4 missing Shopee traffic data',
    category: 'Software & Apps',
    priority: 'Low',
    status: 'Pending',
    created: '2026-03-21',
    updated: '2026-03-23',
    description: 'GA4 dashboard shows no traffic attributable to Shopee referrals since March 15. UTM parameters may be stripped.',
    assignee: 'Prim Srisawat',
    department: 'Marketing',
    shop: 'All Shops',
    platforms: ['Shopee', 'Internal Tools'],
    timeline: [
      { date: '2026-03-21 15:00', action: 'Ticket submitted', actor: 'Marketing Team' },
      { date: '2026-03-21 15:10', action: 'Ticket assigned to Prim Srisawat', actor: 'System' },
      { date: '2026-03-22 10:00', action: 'Status changed to In Progress', actor: 'Prim Srisawat' },
      { date: '2026-03-23 14:00', action: 'Status changed to Pending — awaiting Marketing sign-off on UTM restructure', actor: 'Prim Srisawat' },
    ],
    messages: [
      { from: 'Marketing Team', time: '2026-03-21 15:00', text: 'GA4 has not been showing Shopee-attributed sessions for 6 days. We need this for the campaign report.' },
      { from: 'Prim Srisawat', time: '2026-03-23 14:05', text: 'Found the cause — Shopee is stripping UTM params on redirect. Proposed fix needs Marketing to approve a new URL structure first.' },
    ],
  },
];

// ─── Ticket store (in-place mutable singleton + pub/sub) ─────────────────────
// MOCK_TICKETS is the single source of truth. Pages subscribe to bumpTickets to
// re-render after mutations; updateTickets is the one mutation path.
let _ticketsVersion = 0;
const _ticketsListeners = new Set();
const bumpTickets = () => {
  _ticketsVersion++;
  _ticketsListeners.forEach(fn => fn(_ticketsVersion));
  saveStore('tickets', MOCK_TICKETS);
};
const subscribeTickets = (fn) => { _ticketsListeners.add(fn); return () => _ticketsListeners.delete(fn); };
const updateTickets = (updater) => {
  const next = typeof updater === 'function' ? updater(MOCK_TICKETS.slice()) : updater;
  replaceArrayInPlace(MOCK_TICKETS, next);
  bumpTickets();
};
const addTicket = (ticket) => {
  MOCK_TICKETS.unshift(ticket);
  bumpTickets();
};

const ALL_AGENTS = ['Kai Nguyen', 'Prim Srisawat', 'Unassigned'];

const DOCS = [
  {
    id: 1,
    title: 'VPN Setup Guide',
    category: 'Network & Access',
    icon: '🔒',
    summary: 'Step-by-step instructions for setting up Pomelo\'s corporate VPN on Mac, Windows, and mobile devices.',
    content: `# VPN Setup Guide\n\n## Overview\nPomelo uses Cisco AnyConnect for secure remote access. All employees working remotely must connect via VPN.\n\n## Mac Installation\n1. Download Cisco AnyConnect from the IT portal: it.pomelo.com/vpn\n2. Run the installer and follow the on-screen instructions\n3. Open Cisco AnyConnect from Applications\n4. Enter server: **vpn.pomelo.com**\n5. Log in with your Pomelo email and password\n6. Approve the MFA push notification on your phone\n\n## Windows Installation\n1. Download from it.pomelo.com/vpn (Windows tab)\n2. Run the .exe installer as Administrator\n3. Follow prompts, accept default installation path\n4. Launch from Start Menu\n5. Enter server: **vpn.pomelo.com**\n6. Log in with Pomelo credentials + MFA\n\n## Troubleshooting\n- **Connection refused**: Ensure you're not on a restricted network (some hotel WiFi blocks VPN)\n- **MFA not arriving**: Check Okta Verify app or try SMS backup\n- **Slow speeds**: Try the alternate server: **vpn2.pomelo.com**\n\n## Support\nFor VPN issues outside business hours, contact #techops-urgent on Slack.`,
  },
  {
    id: 2,
    title: 'New Employee IT Onboarding',
    category: 'Onboarding',
    icon: '🚀',
    summary: 'Everything new Pomelo employees need to get set up: accounts, tools, and first-day checklist.',
    content: `# New Employee IT Onboarding\n\n## Day 1 Checklist\n- [ ] Collect laptop from IT (Building A, Floor 2)\n- [ ] Sign in with temporary credentials (emailed to personal address)\n- [ ] Set up Google Workspace account\n- [ ] Install Slack and join #general, #it-announcements\n- [ ] Install Cisco AnyConnect VPN\n- [ ] Set up Okta Verify MFA on your phone\n- [ ] Access Workday for HR tasks\n\n## Essential Tools\n| Tool | Purpose | Access |\n|------|---------|--------|\n| Google Workspace | Email, Docs, Drive | your.name@pomelo.com |\n| Slack | Team communication | pomelo.slack.com |\n| Workday | HR, payroll, leave | workday.pomelo.com |\n| Notion | Documentation | notion.pomelo.com |\n| Jira | Project tracking | pomelo.atlassian.net |\n\n## Getting Help\nRaise a ticket here in the TechOps Portal or visit IT at Building A, Floor 2 during support hours.`,
  },
  {
    id: 3,
    title: 'Password Reset & MFA',
    category: 'Security',
    icon: '🛡️',
    summary: 'How to reset your Pomelo password and manage multi-factor authentication settings.',
    content: `# Password Reset & MFA\n\n## Self-Service Password Reset\n1. Visit **accounts.pomelo.com/reset**\n2. Enter your Pomelo email address\n3. Check your personal email for a verification code\n4. Enter the code and create a new password\n\n## Password Requirements\n- Minimum 12 characters\n- At least 1 uppercase, 1 lowercase, 1 number, 1 symbol\n- Cannot reuse last 10 passwords\n- Must change every 90 days\n\n## Setting Up MFA\nPomelo requires Okta Verify for MFA on all accounts.\n1. Download **Okta Verify** from App Store or Google Play\n2. Visit myapps.pomelo.com\n3. Click your profile > Settings > Set up multifactor\n4. Scan the QR code with Okta Verify\n5. Enter the 6-digit code to confirm\n\n## Lost Phone / MFA Locked Out\nContact IT immediately:\n- Slack: #techops-urgent\n- Email: it@pomelo.com\n- In person: Building A, Floor 2\n\n**Never share your MFA codes with anyone, including IT staff.**`,
  },
  {
    id: 4,
    title: 'Software Request Process',
    category: 'Software & Apps',
    icon: '💻',
    summary: 'How to request new software licenses, approved tools list, and procurement timelines.',
    content: `# Software Request Process\n\n## Approved Software (No Approval Needed)\nThese tools are pre-approved and can be installed from the Self-Service portal:\n- Google Chrome, Firefox\n- Zoom, Google Meet\n- Notion, Confluence\n- Figma (Design team)\n- VS Code (Tech team)\n\n## Requesting New Software\n1. Submit a ticket via TechOps Portal (category: Software & Apps)\n2. Include: tool name, business justification, number of licenses needed, budget owner\n3. IT will assess security compliance\n4. If approved, procurement takes 5–10 business days\n5. License details sent to your email\n\n## Procurement Timeline\n| Type | Timeline |\n|------|----------|\n| Cloud SaaS (existing vendor) | 3–5 days |\n| New SaaS vendor | 10–15 days |\n| Desktop software | 5–7 days |\n| Enterprise license negotiation | 30+ days |\n\n## Security Review\nAll new software undergoes a security review covering data handling, SOC2 compliance, and vendor risk before approval.`,
  },
  {
    id: 5,
    title: 'Hardware Replacement Policy',
    category: 'Hardware',
    icon: '🖥️',
    summary: 'Eligibility criteria for hardware upgrades, the request process, and equipment loan procedures.',
    content: `# Hardware Replacement Policy\n\n## Replacement Eligibility\n| Device | Replacement Cycle |\n|--------|------------------|\n| MacBook Pro | Every 4 years |\n| MacBook Air | Every 3 years |\n| External Monitor | Every 5 years |\n| Keyboard/Mouse | As needed (report damage) |\n| iPhone (if issued) | Every 3 years |\n\n## Requesting Replacement\n1. Submit ticket: category Hardware, include device serial number\n2. IT will verify eligibility\n3. If eligible: new device prepared within 5 business days\n4. Old device returned at pickup — data migration assistance available\n\n## Loaner Equipment\nLoaners available for hardware repairs:\n- Request via ticket: state duration needed\n- Pick up from IT (Building A, Floor 2)\n- Return within 2 business days of repair completion\n\n## Damaged Equipment\nAccidental damage: IT assesses, may repair or replace depending on severity.\nNegligent damage: Employee may be responsible for partial cost per HR policy.`,
  },
  {
    id: 6,
    title: 'Data Backup & Recovery',
    category: 'Data & Storage',
    icon: '☁️',
    summary: 'Pomelo\'s backup strategy, how to recover lost files, and best practices for data hygiene.',
    content: `# Data Backup & Recovery\n\n## What Is Backed Up Automatically\n- Google Drive: real-time sync, 30-day version history\n- Notion: automatic version history\n- GitHub/GitLab: all repository data\n- Workday: HR data managed by vendor\n\n## What Is NOT Automatically Backed Up\n- Files saved locally on your Mac/PC (Desktop, Documents folder not synced)\n- Local databases or dev environments\n- Personal browser bookmarks\n\n## Best Practice\n**Always save work to Google Drive**, not locally. Use the Drive desktop app for seamless sync.\n\n## Recovering a Deleted File\n### Google Drive\n1. Open drive.google.com\n2. Left sidebar > Trash\n3. Right-click file > Restore\n(Files permanently deleted after 30 days)\n\n### Recovering Older Versions\n1. Right-click file in Drive\n2. Version history > See version history\n3. Select version > Restore this version\n\n## Data Loss Incident\nIf you suspect significant data loss, submit a Critical ticket immediately with details of what was lost and when.`,
  },
];

const CATEGORIES = ['Access & Permissions', 'Software & Apps', 'Hardware', 'Network & Connectivity', 'Email & Calendar', 'Data & Storage', 'Other'];

const PRIORITY_COLORS = {
  Critical: '#DC2626',
  High: '#EA580C',
  Medium: '#CA8A04',
  Low: '#16A34A',
};

// Color mapping covers both the legacy local names and the Jira Service
// Management workflow names. Unknown statuses fall back to slate gray.
const STATUS_COLORS = {
  // Legacy local names
  'Open': '#3B82F6',
  'In Progress': '#8B5CF6',
  'Pending': '#F59E0B',
  'Resolved': '#16A34A',
  'Closed': 'var(--text-secondary)',
  // Jira Service Management canonical names
  'To Do': '#3B82F6',
  'Blocked': '#DC2626',
  'Waiting for Customer': '#F59E0B',
  'Waiting for Support': '#F97316',
  'Done': 'var(--text-secondary)',
};
const STATUS_BG = {
  '#3B82F6': '#EFF6FF',
  '#8B5CF6': 'var(--accent-soft)',
  '#DC2626': '#FEF2F2',
  '#F59E0B': '#FFFBEB',
  '#F97316': '#FFF7ED',
  '#16A34A': '#F0FDF4',
  'var(--text-secondary)': 'var(--bg-hover)',
};
const statusColorFor = name => STATUS_COLORS[name] || 'var(--text-secondary)';

// Maps legacy local statuses → canonical Jira Service Management names.
const LEGACY_TO_JIRA_STATUS = {
  Open: 'To Do',
  'In Progress': 'In Progress',
  Pending: 'Waiting for Customer',
  Resolved: 'Resolved',
  Closed: 'Done',
};
const mapLegacyStatus = name => LEGACY_TO_JIRA_STATUS[name] || name;

const SLA_DATA = [
  { priority: 'Critical', response: '15 minutes', resolution: '4 hours', color: '#DC2626' },
  { priority: 'High', response: '1 hour', resolution: '8 hours', color: '#EA580C' },
  { priority: 'Medium', response: '4 hours', resolution: '2 business days', color: '#CA8A04' },
  { priority: 'Low', response: '1 business day', resolution: '5 business days', color: '#16A34A' },
];

// Machine-readable SLA targets (hours) — mirrors SLA_DATA for breach math.
// Business days are approximated as 8h for the calculation.
const SLA_TARGETS_HOURS = {
  Critical: { response: 0.25, resolution: 4 },
  High: { response: 1, resolution: 8 },
  Medium: { response: 4, resolution: 16 },
  Low: { response: 8, resolution: 40 },
};

const DONE_STATUSES = new Set(['Resolved', 'Done', 'Closed']);

// Returns 'ok' | 'at-risk' (≥75% of resolution target) | 'breached' (past target).
// Done/Resolved/Closed tickets always return 'ok'.
const slaStateFor = (ticket) => {
  if (!ticket || !ticket.created || DONE_STATUSES.has(ticket.status)) return 'ok';
  const target = SLA_TARGETS_HOURS[ticket.priority];
  if (!target) return 'ok';
  const ageHrs = (Date.now() - new Date(ticket.created).getTime()) / 3600000;
  if (ageHrs >= target.resolution) return 'breached';
  if (ageHrs >= target.resolution * 0.75) return 'at-risk';
  return 'ok';
};

// ─── Jira workflow (live, with fallback) ──────────────────────────────────────
// Loaded from the BFF on app boot; cached in memory. The fallback list ships
// with the BFF so a stale cache or a startup race never breaks the UI.
const JIRA_DEFAULT_STATUSES = [
  { name: 'To Do', category: 'new' },
  { name: 'In Progress', category: 'indeterminate' },
  { name: 'Blocked', category: 'indeterminate' },
  { name: 'Waiting for Customer', category: 'indeterminate' },
  { name: 'Waiting for Support', category: 'indeterminate' },
  { name: 'Resolved', category: 'done' },
  { name: 'Done', category: 'done' },
];
let JIRA_WORKFLOW = { statuses: JIRA_DEFAULT_STATUSES, source: 'fallback', loadedAt: null, note: null };
const _jiraWorkflowListeners = new Set();
const subscribeJiraWorkflow = (fn) => { _jiraWorkflowListeners.add(fn); return () => _jiraWorkflowListeners.delete(fn); };
const setJiraWorkflow = (payload) => {
  JIRA_WORKFLOW = { ...payload, loadedAt: new Date().toISOString() };
  _jiraWorkflowListeners.forEach(fn => fn(JIRA_WORKFLOW));
};
const getJiraWorkflow = () => JIRA_WORKFLOW;

// Push a status transition to Jira via BFF. Updates jiraSyncState/syncedAt
// on the matching local ticket. Returns { ok, error? }.
const pushJiraTransition = async (ticket, newStatus) => {
  if (!ticket?.jiraKey) return { ok: false, error: 'no-jira-key' };
  updateTickets(ts => ts.map(t => t.id === ticket.id ? { ...t, jiraSyncState: 'syncing' } : t));
  try {
    const res = await fetch('/api/v1/jira/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: ticket.jiraKey, statusName: newStatus }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      updateTickets(ts => ts.map(t => t.id === ticket.id ? { ...t, jiraSyncState: 'error', jiraSyncError: err?.error || ('HTTP ' + res.status) } : t));
      recordAudit('ticket.jira_transition_failed', _currentActor, { type: 'ticket', id: ticket.id, label: ticket.title }, { jiraKey: ticket.jiraKey, target: newStatus, error: err?.error });
      return { ok: false, error: err?.error || ('HTTP ' + res.status) };
    }
    const data = await res.json();
    updateTickets(ts => ts.map(t => t.id === ticket.id ? { ...t, jiraSyncState: 'synced', jiraSyncedAt: new Date().toISOString(), jiraSyncError: null } : t));
    recordAudit('ticket.jira_transition', _currentActor, { type: 'ticket', id: ticket.id, label: ticket.title }, { jiraKey: ticket.jiraKey, status: data.status });
    return { ok: true, status: data.status };
  } catch (err) {
    updateTickets(ts => ts.map(t => t.id === ticket.id ? { ...t, jiraSyncState: 'error', jiraSyncError: err.message } : t));
    return { ok: false, error: err.message };
  }
};

// Poll Jira for changes since `lastSyncAt`. Reconciles local tickets whose
// jiraKey matches a returned issue. Issues not yet known locally are ignored
// for now (we don't auto-create stubs). Returns the latest fetchedAt.
let LAST_JIRA_POLL_AT = null;
const pollJira = async (project = 'PESD1') => {
  try {
    const since = LAST_JIRA_POLL_AT ? `&since=${encodeURIComponent(LAST_JIRA_POLL_AT)}` : '';
    const res = await fetch(`/api/v1/jira/poll?project=${encodeURIComponent(project)}${since}`);
    if (!res.ok) return null;
    const data = await res.json();
    LAST_JIRA_POLL_AT = data.fetchedAt || LAST_JIRA_POLL_AT;
    if (data.unavailable || !Array.isArray(data.issues) || data.issues.length === 0) return data;

    // Reconcile: update any local ticket whose jiraKey matches; for Jira-side
    // issues we don't have locally, create a stub so admins see them.
    const byKey = new Map(data.issues.map(i => [i.key, i]));
    let touched = 0;
    let created = 0;
    updateTickets(ts => {
      const knownKeys = new Set(ts.filter(t => t.jiraKey).map(t => t.jiraKey));
      const updated = ts.map(t => {
        if (!t.jiraKey || !byKey.has(t.jiraKey)) return t;
        const incoming = byKey.get(t.jiraKey);
        if (!incoming) return t;
        const next = { ...t };
        if (incoming.status && incoming.status !== t.status) next.status = incoming.status;
        if (incoming.assignee !== undefined && incoming.assignee !== t.assignee) next.assignee = incoming.assignee;
        next.jiraSyncState = 'synced';
        next.jiraSyncedAt = data.fetchedAt;
        if (next.status !== t.status || next.assignee !== t.assignee) touched++;
        return next;
      });
      // Auto-create stubs for Jira issues we don't yet have locally
      for (const issue of data.issues) {
        if (!issue.key || knownKeys.has(issue.key)) continue;
        const today = new Date().toISOString().slice(0, 10);
        const createdDay = issue.created ? issue.created.slice(0, 10) : today;
        const updatedDay = issue.updated ? issue.updated.slice(0, 10) : today;
        updated.unshift({
          id: issue.key,
          title: issue.summary || `Jira issue ${issue.key}`,
          category: 'Imported from Jira',
          priority: issue.priority || 'Medium',
          status: issue.status || 'To Do',
          created: createdDay,
          updated: updatedDay,
          description: '(Imported from Jira — open in Atlassian for full details)',
          assignee: issue.assignee || null,
          department: '—',
          shop: '—',
          platforms: [],
          timeline: [{ date: createdDay, actor: issue.assignee || 'Jira', action: 'Imported from Jira' }],
          messages: [],
          internalNotes: [],
          requester: { name: 'Jira import', email: null },
          jiraKey: issue.key,
          jiraSyncedAt: data.fetchedAt,
          jiraSyncState: 'synced',
          source: 'jira',
        });
        created++;
      }
      return updated;
    });
    if (created > 0) {
      recordAudit('jira.stub_imported', _currentActor, null, { project, count: created });
    }
    return { ...data, reconciled: touched, imported: created };
  } catch {
    return null;
  }
};

// ─── Issue types + Components (live, with fallback) ──────────────────────────
let JIRA_ISSUE_TYPES = { issueTypes: [{ id: 'fb', name: 'Service Request' }, { id: 'fb', name: 'Incident' }, { id: 'fb', name: 'Bug' }], source: 'fallback' };
let JIRA_COMPONENTS = { components: [], source: 'fallback' };
const _typesListeners = new Set();
const _componentsListeners = new Set();
const subscribeIssueTypes = (fn) => { _typesListeners.add(fn); return () => _typesListeners.delete(fn); };
const subscribeComponents = (fn) => { _componentsListeners.add(fn); return () => _componentsListeners.delete(fn); };
const loadIssueTypes = async (project = 'PESD1') => {
  try {
    const res = await fetch(`/api/v1/jira/issue-types?project=${encodeURIComponent(project)}`);
    if (!res.ok) return JIRA_ISSUE_TYPES;
    const data = await res.json();
    JIRA_ISSUE_TYPES = { issueTypes: data.issueTypes || [], source: data.source || 'fallback' };
    _typesListeners.forEach(fn => fn(JIRA_ISSUE_TYPES));
    return JIRA_ISSUE_TYPES;
  } catch { return JIRA_ISSUE_TYPES; }
};
const loadComponents = async (project = 'PESD1') => {
  try {
    const res = await fetch(`/api/v1/jira/components?project=${encodeURIComponent(project)}`);
    if (!res.ok) return JIRA_COMPONENTS;
    const data = await res.json();
    JIRA_COMPONENTS = { components: data.components || [], source: data.source || 'fallback' };
    _componentsListeners.forEach(fn => fn(JIRA_COMPONENTS));
    return JIRA_COMPONENTS;
  } catch { return JIRA_COMPONENTS; }
};

// ─── Assignable users (live, with fallback) ───────────────────────────────────
let ASSIGNABLE_USERS = { users: [], source: 'fallback', loadedAt: null };
const _assignableListeners = new Set();
const subscribeAssignable = (fn) => { _assignableListeners.add(fn); return () => _assignableListeners.delete(fn); };
const loadAssignableUsers = async (project = 'PESD1') => {
  try {
    const res = await fetch(`/api/v1/jira/users/assignable?project=${encodeURIComponent(project)}`);
    if (!res.ok) return ASSIGNABLE_USERS;
    const data = await res.json();
    ASSIGNABLE_USERS = { users: Array.isArray(data.users) ? data.users : [], source: data.source || 'fallback', loadedAt: new Date().toISOString() };
    _assignableListeners.forEach(fn => fn(ASSIGNABLE_USERS));
    return ASSIGNABLE_USERS;
  } catch { return ASSIGNABLE_USERS; }
};
const getAssignableUsers = () => ASSIGNABLE_USERS;

// ─── Webhook event polling (W) ────────────────────────────────────────────────
// Polls /api/v1/events every 5s for webhook-relayed Jira changes. Reconciles
// local tickets keyed on jiraKey. Cheap because BFF buffers events in memory.
let LAST_EVENT_AT = null;
let LAST_WEBHOOK_RECEIVED_AT = null;
const _webhookListeners = new Set();
const subscribeWebhookState = (fn) => { _webhookListeners.add(fn); return () => _webhookListeners.delete(fn); };
const pollWebhookEvents = async () => {
  try {
    const since = LAST_EVENT_AT ? `?since=${encodeURIComponent(LAST_EVENT_AT)}` : '';
    const res = await fetch(`/api/v1/events${since}`);
    if (!res.ok) return null;
    const data = await res.json();
    LAST_EVENT_AT = data.fetchedAt || LAST_EVENT_AT;
    LAST_WEBHOOK_RECEIVED_AT = data.lastWebhookAt || LAST_WEBHOOK_RECEIVED_AT;
    _webhookListeners.forEach(fn => fn({ lastWebhookAt: LAST_WEBHOOK_RECEIVED_AT }));
    if (data.count === 0) return data;
    // Apply each event to local state (only updates, not creates — poll handles creates)
    let touched = 0;
    updateTickets(ts => ts.map(t => {
      if (!t.jiraKey) return t;
      const relevant = data.events.find(e => e.issueKey === t.jiraKey);
      if (!relevant) return t;
      const next = { ...t };
      if (relevant.issueStatus && relevant.issueStatus !== t.status) next.status = relevant.issueStatus;
      if (relevant.issueAssignee !== undefined && relevant.issueAssignee !== t.assignee) next.assignee = relevant.issueAssignee;
      next.jiraSyncedAt = data.fetchedAt;
      next.jiraSyncState = 'synced';
      if (next.status !== t.status || next.assignee !== t.assignee) touched++;
      return next;
    }));
    return { ...data, applied: touched };
  } catch {
    return null;
  }
};

// Loads the active Jira workflow from the BFF. Safe to call multiple times.
const loadJiraWorkflow = async (project = 'PESD1') => {
  try {
    const res = await fetch(`/api/v1/jira/statuses?project=${encodeURIComponent(project)}`);
    if (!res.ok) throw new Error('http ' + res.status);
    const data = await res.json();
    if (Array.isArray(data?.statuses) && data.statuses.length > 0) {
      setJiraWorkflow({ statuses: data.statuses, source: data.source || 'fallback', note: data.note || null });
      return data;
    }
  } catch { /* keep current cache / default */ }
  return getJiraWorkflow();
};

// ─── localStorage persistence helpers ─────────────────────────────────────────
// Versioned keys so a future schema change can ignore stale payloads cleanly.
const STORE_PREFIX = 'pomelo:v1:';
const __safeLocal = typeof window !== 'undefined' && window.localStorage;
const loadStore = (key, fallback) => {
  if (!__safeLocal) return fallback;
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
};
const saveStore = (key, value) => {
  if (!__safeLocal) return;
  try { window.localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch { /* quota / private mode — drop silently */ }
};
// Replace an array's contents in-place so existing references stay valid.
const replaceArrayInPlace = (arr, next) => {
  arr.length = 0;
  for (const x of next) arr.push(x);
};

// ─── Jira workflow React hook ─────────────────────────────────────────────────
function useJiraWorkflow() {
  const [workflow, setWorkflow] = useState(getJiraWorkflow);
  useEffect(() => subscribeJiraWorkflow(setWorkflow), []);
  return workflow;
}

function useAssignableUsers() {
  const [state, setState] = useState(getAssignableUsers);
  useEffect(() => subscribeAssignable(setState), []);
  return state;
}

function useIssueTypes() {
  const [state, setState] = useState(() => JIRA_ISSUE_TYPES);
  useEffect(() => subscribeIssueTypes(setState), []);
  return state;
}

function useComponents() {
  const [state, setState] = useState(() => JIRA_COMPONENTS);
  useEffect(() => subscribeComponents(setState), []);
  return state;
}

function useJiraChangelog(jiraKey) {
  const [history, setHistory] = useState([]);
  useEffect(() => {
    if (!jiraKey) { setHistory([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/jira/issue/${encodeURIComponent(jiraKey)}/changelog`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setHistory(Array.isArray(json.history) ? json.history : []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [jiraKey]);
  return history;
}

function useJiraCsat(jiraKey, status) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!jiraKey || !DONE_STATUSES.has(status)) { setData(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/jsm/request/${encodeURIComponent(jiraKey)}/csat`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.available) setData(json);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [jiraKey, status]);
  return data;
}

function useJiraWorklog(jiraKey) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!jiraKey) { setData(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/jira/issue/${encodeURIComponent(jiraKey)}/worklog`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [jiraKey]);
  return data;
}

function useJiraWatchers(jiraKey) {
  const [state, setState] = useState({ watchers: [], watchCount: 0 });
  useEffect(() => {
    if (!jiraKey) { setState({ watchers: [], watchCount: 0 }); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/jira/issue/${encodeURIComponent(jiraKey)}/watchers`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setState({ watchers: json.watchers || [], watchCount: json.watchCount || 0 });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [jiraKey]);
  return state;
}

function useWebhookState() {
  const [state, setState] = useState({ lastWebhookAt: LAST_WEBHOOK_RECEIVED_AT });
  useEffect(() => subscribeWebhookState(setState), []);
  return state;
}

// Fetches the extended Jira issue (links, attachments, labels, components,
// watcher count, fixVersions, issuetype) once per ticket open. Cached per key.
const _jiraIssueCache = new Map();
function useJiraIssueDetail(jiraKey) {
  const [data, setData] = useState(() => (jiraKey ? _jiraIssueCache.get(jiraKey) || null : null));
  useEffect(() => {
    if (!jiraKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/jira/issue/${encodeURIComponent(jiraKey)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        _jiraIssueCache.set(jiraKey, json);
        setData(json);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [jiraKey]);
  return data;
}

function useJiraSla(jiraKey) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!jiraKey) { setData(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/jira/issue/${encodeURIComponent(jiraKey)}/sla`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [jiraKey]);
  return data;
}

// FilePreviewCard, FILE_CATEGORIES, categoryForFile, fileToAttachment, etc.
// are imported from src/components/FilePreviewCard.jsx (top of file).

// Renders combined local + Jira attachments using the shared FilePreviewCard.
// Hidden when there's nothing to show.
function TicketAttachments({ local = [], jira = [] }) {
  const localList = (local || []).map((a, i) => ({
    key: `l-${i}-${a.name}`,
    name: a.name,
    size: a.size,
    type: a.type,
    src: a.dataUrl || null,
    origin: 'local',
  }));
  const jiraList = (jira || []).map(a => ({
    key: `j-${a.id}`,
    name: a.filename,
    size: a.size,
    type: a.mimeType,
    src: a.content,
    origin: 'jira',
  }));
  const all = [...localList, ...jiraList];
  if (all.length === 0) return null;
  return (
    <div style={{ ...S.card, marginBottom: '20px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📎 Attachments ({all.length})
        {jiraList.length > 0 && localList.length > 0 && (
          <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600 }}>· {localList.length} local · {jiraList.length} from Jira</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
        {all.map(a => (
          <FilePreviewCard key={a.key} name={a.name} size={a.size} type={a.type} src={a.src} />
        ))}
      </div>
    </div>
  );
}

// Wraps File[] in blob URLs for live preview during form editing. The URLs
// are revoked when the file list changes so we don't leak memory.
function SubmitFilesPreview({ files, onRemove }) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const generated = files.map(f => URL.createObjectURL(f));
    setUrls(generated);
    return () => { generated.forEach(u => URL.revokeObjectURL(u)); };
  }, [files]);
  return (
    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
      {files.map((f, i) => (
        <FilePreviewCard
          key={`${f.name}-${i}-${f.size}`}
          name={f.name}
          size={f.size}
          type={f.type}
          src={urls[i] || null}
          onRemove={() => onRemove(i)}
        />
      ))}
    </div>
  );
}

// ─── Modal focus trap hook ────────────────────────────────────────────────────
// Autofocuses the first focusable child of the ref'd element, traps Tab/Shift+Tab
// inside it, and returns focus to the previously focused element on unmount.
function useModalFocusTrap(ref) {
  useEffect(() => {
    const prev = typeof document !== 'undefined' ? document.activeElement : null;
    const node = ref.current;
    if (!node) return;
    const FOCUSABLE = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(node.querySelectorAll(FOCUSABLE));
    const first = focusables()[0];
    (first || node).focus({ preventScroll: true });
    const onKey = e => {
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (f.length === 0) return;
      const firstEl = f[0];
      const lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
      if (prev && typeof prev.focus === 'function') prev.focus({ preventScroll: true });
    };
  }, [ref]);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const SESSION_KEY  = 'pomelo_techops_session';
const LOCK_KEY     = 'pomelo_login_lock';
const REMEMBER_KEY = 'pomelo_remember_email';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 30_000;
const AUTH_DELAY   = 600;

let MOCK_USERS = [
  { id: 'u1', name: 'Alex Lee',       email: 'alex.lee@pomelo.com',          passwordHash: btoa('salt_u1_Admin123!'),   role: 'superadmin', roleId: 'role_superadmin', department: 'IT & Technology', active: true, lastLoginAt: null, forceReOtp: false, createdAt: '2024-09-01' },
  { id: 'u2', name: 'Kai Nguyen',     email: 'kai.nguyen@pomelo.com',        passwordHash: btoa('salt_u2_User123!'),    role: 'user',       roleId: 'role_user',       department: 'IT & Technology', active: true, lastLoginAt: null, forceReOtp: false, createdAt: '2024-11-12' },
  { id: 'u3', name: 'Prim Srisawat',  email: 'prim.srisawat@pomelo.com',     passwordHash: btoa('salt_u3_User123!'),    role: 'user',       roleId: 'role_user',       department: 'IT & Technology', active: true, lastLoginAt: null, forceReOtp: false, createdAt: '2025-01-22' },
  { id: 'u4', name: 'Quenton Dupont', email: 'quentond.d@pomelofashion.com', passwordHash: 'c2FsdF91NF9Ub3lvdGFzdXByYTdA', role: 'superadmin', roleId: 'role_superadmin', department: 'IT & Technology', active: true, lastLoginAt: null, forceReOtp: false, createdAt: '2024-08-15' },
];

// ─── Chat log store (in-memory) ───────────────────────────────────────────────
// Sessions captured for future training / cap tuning. Each session is one
// continuous chat between a user and the assistant.
const CHAT_SESSIONS = [];
const _chatListeners = new Set();
const subscribeChat = (fn) => { _chatListeners.add(fn); return () => _chatListeners.delete(fn); };
const bumpChat = () => {
  _chatListeners.forEach(fn => fn());
  saveStore('chatSessions', CHAT_SESSIONS);
};

const startChatSession = ({ userName, userEmail, userRole }) => {
  const id = 'c' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  CHAT_SESSIONS.unshift({
    id,
    userName: userName || 'Anonymous',
    userEmail: userEmail || null,
    userRole: userRole || 'user',
    startedAt: new Date().toISOString(),
    messages: [],
  });
  bumpChat();
  return id;
};

const appendChatMessage = (sessionId, role, content) => {
  const s = CHAT_SESSIONS.find(s => s.id === sessionId);
  if (!s) return;
  s.messages.push({ role, content, ts: new Date().toISOString() });
  bumpChat();
};

const listChatSessions = () => CHAT_SESSIONS.slice();

// ─── Maintenance mode (in-memory toggle) ──────────────────────────────────────
let MAINTENANCE = { active: false, message: '', enabledBy: null, enabledAt: null };
const _maintListeners = new Set();
const subscribeMaintenance = (fn) => { _maintListeners.add(fn); return () => _maintListeners.delete(fn); };
const setMaintenanceMode = (active, message, actor) => {
  MAINTENANCE = active
    ? { active: true, message: message || 'Scheduled maintenance in progress.', enabledBy: actor?.name || 'Admin', enabledAt: new Date().toISOString() }
    : { active: false, message: '', enabledBy: null, enabledAt: null };
  saveStore('maintenance', MAINTENANCE);
  _maintListeners.forEach(fn => fn(MAINTENANCE));
  if (actor) recordAudit(active ? 'system.maintenance_on' : 'system.maintenance_off', actor, null, { message });
};
const getMaintenanceMode = () => MAINTENANCE;

// ─── Audit log (in-memory append-only) ────────────────────────────────────────
// Charter R-10: every admin action is recorded immutably. Entries cannot be
// edited or deleted once written.
const AUDIT_LOG = [];
let _auditVersion = 0;
const _auditListeners = new Set();
const bumpAudit = () => {
  _auditVersion++;
  _auditListeners.forEach(fn => fn(_auditVersion));
  saveStore('audit', AUDIT_LOG);
};
const subscribeAudit = (fn) => { _auditListeners.add(fn); return () => _auditListeners.delete(fn); };

const recordAudit = (action, actor, target = null, details = null) => {
  AUDIT_LOG.unshift({
    id: 'a' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    ts: new Date().toISOString(),
    action,            // e.g. 'user.promote'
    actorEmail: actor?.email || 'unknown',
    actorName: actor?.name || 'Unknown',
    targetType: target?.type || null,   // 'user' | 'doc' | 'ticket' | 'system' | null
    targetId: target?.id || null,
    targetLabel: target?.label || null,
    details: details || null,
  });
  bumpAudit();
};
const listAudit = () => AUDIT_LOG.slice();

// Module-level holder so admin API functions can resolve the current actor
// without threading actor through every mutation call.
let _currentActor = null;
const setAuditActor = (actor) => { _currentActor = actor; };

// ─── Admin user-management API (in-memory) ────────────────────────────────────
// Returns a sanitised list (no password hashes) and emits a version counter
// so React components can re-fetch after mutations.
let _usersVersion = 0;
const _usersListeners = new Set();
const bumpUsers = () => {
  _usersVersion++;
  _usersListeners.forEach(fn => fn(_usersVersion));
  saveStore('users', MOCK_USERS);
};
const subscribeUsers = (fn) => { _usersListeners.add(fn); return () => _usersListeners.delete(fn); };

// Back-fill seed tickets with a requester so existing fixtures show up under
// "My Tickets" for the demo users.
const SEED_REQUESTERS = {
  'TKT-2026-0042': { name: 'Kai Nguyen', email: 'kai.nguyen@pomelo.com' },
  'TKT-2026-0038': { name: 'Kai Nguyen', email: 'kai.nguyen@pomelo.com' },
  'TKT-2026-0031': { name: 'Prim Srisawat', email: 'prim.srisawat@pomelo.com' },
  'TKT-2026-0045': { name: 'Prim Srisawat', email: 'prim.srisawat@pomelo.com' },
  'TKT-2026-0044': { name: 'Kai Nguyen', email: 'kai.nguyen@pomelo.com' },
  'TKT-2026-0043': { name: 'Prim Srisawat', email: 'prim.srisawat@pomelo.com' },
  'TKT-2026-0041': { name: 'Kai Nguyen', email: 'kai.nguyen@pomelo.com' },
  'TKT-2026-0039': { name: 'Prim Srisawat', email: 'prim.srisawat@pomelo.com' },
};
for (const t of MOCK_TICKETS) {
  if (!t.requester) t.requester = SEED_REQUESTERS[t.id] || { name: 'Unknown', email: null };
}

// ─── Hydrate from localStorage at module load ─────────────────────────────────
// Each store is replaced in-place so existing references stay valid.
(() => {
  const storedUsers = loadStore('users', null);
  if (Array.isArray(storedUsers) && storedUsers.length) {
    MOCK_USERS = storedUsers;
  }
  const storedTickets = loadStore('tickets', null);
  if (Array.isArray(storedTickets) && storedTickets.length) {
    replaceArrayInPlace(MOCK_TICKETS, storedTickets);
  }
  const storedAudit = loadStore('audit', null);
  if (Array.isArray(storedAudit)) {
    replaceArrayInPlace(AUDIT_LOG, storedAudit);
  }
  const storedChat = loadStore('chatSessions', null);
  if (Array.isArray(storedChat)) {
    replaceArrayInPlace(CHAT_SESSIONS, storedChat);
  }
  const storedMaint = loadStore('maintenance', null);
  if (storedMaint && typeof storedMaint === 'object') {
    MAINTENANCE = storedMaint;
  }

  // Migrate any legacy status names (Open / Pending / Closed) on persisted or
  // seed tickets to the canonical Jira Service Management names so the new
  // dynamic status list doesn't fight with stale data.
  for (const t of MOCK_TICKETS) {
    if (t.status && LEGACY_TO_JIRA_STATUS[t.status]) {
      t.status = mapLegacyStatus(t.status);
    }
  }
})();

// ─── RBAC runtime registry ────────────────────────────────────────────────────
// Capability definitions + seed role shapes live in `src/rbac.js`. The runtime
// state (current role list, settings overrides) lives here so it can mutate
// MOCK_USERS during migration and call recordAudit on changes — both circular
// concerns we'd hit if the registry moved into the pure rbac module.
let ROLES_REGISTRY = SEED_ROLES.map(r => ({ ...r, capabilities: r.capabilities.slice() }));
let SETTINGS = { defaultAssigneeName: DEFAULT_ASSIGNEE.name, defaultAssigneeEmail: DEFAULT_ASSIGNEE.email };

let _rolesVersion = 0;
const _rolesListeners = new Set();
const bumpRoles = () => {
  _rolesVersion++;
  _rolesListeners.forEach(fn => fn(_rolesVersion));
  saveStore('roles', ROLES_REGISTRY);
};
const subscribeRoles = (fn) => { _rolesListeners.add(fn); return () => _rolesListeners.delete(fn); };

let _settingsVersion = 0;
const _settingsListeners = new Set();
const bumpSettings = () => {
  _settingsVersion++;
  _settingsListeners.forEach(fn => fn(_settingsVersion));
  saveStore('settings', SETTINGS);
};
const subscribeSettings = (fn) => { _settingsListeners.add(fn); return () => _settingsListeners.delete(fn); };

const listRoles = () => ROLES_REGISTRY.slice();
const findRole = (roleId) => ROLES_REGISTRY.find(r => r.id === roleId) || null;
const getDefaultRoleId = () => (ROLES_REGISTRY.find(r => r.isDefault)?.id) || DEFAULT_ROLE_ID;
const getSettings = () => ({ ...SETTINGS });
const setSettings = (next) => {
  SETTINGS = { ...SETTINGS, ...next };
  bumpSettings();
};
const countUsersInRole = (roleId) => MOCK_USERS.reduce((n, u) => n + (u.roleId === roleId ? 1 : 0), 0);

// ─── One-shot RBAC migration ──────────────────────────────────────────────────
// Runs at boot when the persisted schema version is older than the current.
// Idempotent: rerunning is a no-op. Handles three jobs:
//   1. Load persisted roles + settings if present; else use seeds.
//   2. Rewrite legacy seed emails (Quenton: gmail → pomelofashion). Collision
//      guard: if the new email already exists, log + skip to avoid a duplicate.
//   3. Back-fill `roleId` on persisted users whose only role marker is the
//      legacy `role` string.
(() => {
  const storedRoles = loadStore('roles', null);
  if (Array.isArray(storedRoles) && storedRoles.length) {
    ROLES_REGISTRY = storedRoles;
  } else {
    saveStore('roles', ROLES_REGISTRY);
  }
  const storedSettings = loadStore('settings', null);
  if (storedSettings && typeof storedSettings === 'object') {
    SETTINGS = { ...SETTINGS, ...storedSettings };
  } else {
    saveStore('settings', SETTINGS);
  }

  const storedVersion = loadStore('userRolesV', 0);
  if (storedVersion >= RBAC_SCHEMA_VERSION) return;

  let touched = false;

  for (const [oldEmail, newEmail] of Object.entries(SEED_EMAIL_REWRITE)) {
    const oldUser = MOCK_USERS.find(u => u.email === oldEmail);
    if (!oldUser) continue;
    const collision = MOCK_USERS.find(u => u.email === newEmail && u.id !== oldUser.id);
    if (collision) {
      // eslint-disable-next-line no-console
      console.warn(`[rbac migration] skipping email rewrite ${oldEmail} → ${newEmail}: target email already exists on user ${collision.id}`);
      continue;
    }
    oldUser.email = newEmail;
    touched = true;
  }

  for (const u of MOCK_USERS) {
    if (u.roleId) continue;
    const mapped = LEGACY_ROLE_TO_ROLE_ID[u.role] || getDefaultRoleId();
    u.roleId = mapped;
    touched = true;
  }

  if (touched) bumpUsers();
  saveStore('userRolesV', RBAC_SCHEMA_VERSION);
})();

const sanitiseUser = ({ passwordHash: _, ...u }) => u;
const listUsers = () => MOCK_USERS.map(sanitiseUser);
const findUserById = (id) => MOCK_USERS.find(u => u.id === id);

const updateUser = (id, updates) => {
  const u = findUserById(id);
  if (!u) return null;
  const before = { ...u };
  Object.assign(u, updates);
  bumpUsers();
  recordAudit('user.update', _currentActor, { type: 'user', id: u.id, label: u.name },
    { changedKeys: Object.keys(updates), before: Object.fromEntries(Object.keys(updates).map(k => [k, before[k]])), after: updates });
  return sanitiseUser(u);
};

const setUserRole = (id, role) => {
  const u = findUserById(id);
  if (!u) return null;
  const prev = u.role;
  u.role = role;
  bumpUsers();
  recordAudit(role === 'superadmin' ? 'user.promote' : 'user.demote', _currentActor,
    { type: 'user', id: u.id, label: u.name }, { from: prev, to: role });
  return sanitiseUser(u);
};

const setUserActive = (id, active) => {
  const u = findUserById(id);
  if (!u) return null;
  u.active = active;
  bumpUsers();
  recordAudit(active ? 'user.reactivate' : 'user.deactivate', _currentActor,
    { type: 'user', id: u.id, label: u.name });
  return sanitiseUser(u);
};

const forceUserReOtp = (id) => {
  const u = findUserById(id);
  if (!u) return null;
  u.forceReOtp = true;
  bumpUsers();
  recordAudit('user.force_re_otp', _currentActor, { type: 'user', id: u.id, label: u.name });
  return sanitiseUser(u);
};

const resetUserPassword = async (id, tempPassword) => {
  const u = findUserById(id);
  if (!u) return null;
  await setPassword(u, tempPassword);
  u.forceReOtp = true;
  bumpUsers();
  recordAudit('user.reset_password', _currentActor, { type: 'user', id: u.id, label: u.name });
  return sanitiseUser(u);
};

const adminCreateUser = async ({ name, email, role = 'user', department = 'IT & Technology', tempPassword }) => {
  const sanitisedEmail = String(email || '').trim().toLowerCase();
  if (!sanitisedEmail || !name) return { error: 'Name and email are required.' };
  if (MOCK_USERS.some(u => u.email === sanitisedEmail)) return { error: 'Email already in use.' };
  if (!tempPassword || tempPassword.length < 8) return { error: 'Temp password must be at least 8 characters.' };
  const id = 'u' + Date.now();
  const u = {
    id, name: name.trim(), email: sanitisedEmail,
    passwordHash: '', passwordSalt: '',
    role, department,
    active: true, lastLoginAt: null, forceReOtp: true,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  await setPassword(u, tempPassword);
  MOCK_USERS.push(u);
  bumpUsers();
  recordAudit('user.create', _currentActor, { type: 'user', id, label: u.name }, { role, department });
  return { user: sanitiseUser(u) };
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// ─── Password hashing ─────────────────────────────────────────────────────────
// Web Crypto SHA-256 with a per-user random 128-bit salt. Legacy btoa-based
// hashes are accepted once on login and auto-upgraded to the new scheme.
const _subtle = typeof crypto !== 'undefined' && crypto.subtle;
const randomSalt = () => {
  const a = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
};
const sha256Hex = async (text) => {
  if (!_subtle) return null;
  const data = new TextEncoder().encode(text);
  const hash = await _subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
};
const hashPassword = (salt, password) => sha256Hex(salt + ':' + password);

const verifyPassword = async (user, password) => {
  if (!user) return false;
  if (user.passwordSalt) {
    const h = await hashPassword(user.passwordSalt, password);
    return h === user.passwordHash;
  }
  // Legacy btoa scheme (reversible — kept only for migration of seed users)
  const legacy = btoa('salt_' + user.id + '_' + password);
  return legacy === user.passwordHash;
};

const upgradePassword = async (user, password) => {
  const salt = randomSalt();
  const h = await hashPassword(salt, password);
  if (!h) return;
  user.passwordSalt = salt;
  user.passwordHash = h;
  bumpUsers();
};

const setPassword = async (user, password) => {
  const salt = randomSalt();
  const h = await hashPassword(salt, password);
  if (!h) return;
  user.passwordSalt = salt;
  user.passwordHash = h;
};

const validateCredentials = async (email, password) => {
  const sanitised = email.trim().toLowerCase();
  const user = MOCK_USERS.find(u => u.email === sanitised);
  if (!user) {
    // Compute a dummy hash so timing is comparable across hit/miss
    await hashPassword('dummy_salt_' + sanitised, password).catch(() => null);
    return null;
  }
  const ok = await verifyPassword(user, password);
  if (!ok) return null;
  if (!user.passwordSalt) await upgradePassword(user, password);
  if (user.active === false) return { _deactivated: true };
  const { passwordHash: _, passwordSalt: __, ...safe } = user;
  return safe;
};

const createSession = (user) => {
  const { passwordHash: _, ...safe } = user;
  // Record lastLoginAt on the canonical record so the admin Users panel reflects it
  const canonical = MOCK_USERS.find(u => u.id === user.id);
  if (canonical) { canonical.lastLoginAt = new Date().toISOString(); bumpUsers(); }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...safe, loginAt: Date.now() }));
};
const getSession = () => { try { const r = sessionStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const clearSession = () => sessionStorage.removeItem(SESSION_KEY);
const getLockState = () => { try { const r = sessionStorage.getItem(LOCK_KEY); return r ? JSON.parse(r) : { attempts: 0, lockedUntil: 0 }; } catch { return { attempts: 0, lockedUntil: 0 }; } };
const setLockState = (attempts, lockedUntil) => sessionStorage.setItem(LOCK_KEY, JSON.stringify({ attempts, lockedUntil }));
const clearLockState = () => sessionStorage.removeItem(LOCK_KEY);

const registerUser = async (firstName, lastName, email, password) => {
  const sanitisedEmail = email.trim().toLowerCase();
  if (MOCK_USERS.some(u => u.email === sanitisedEmail))
    return 'An account with this email already exists.';
  const id = 'u' + Date.now();
  const u = {
    id,
    name: firstName.trim() + ' ' + lastName.trim(),
    email: sanitisedEmail,
    passwordHash: '', passwordSalt: '',
    role: 'user',
    department: 'IT & Technology',
    active: true, lastLoginAt: null, forceReOtp: false,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  await setPassword(u, password);
  MOCK_USERS.push(u);
  bumpUsers();
  return null;
};

// ─── Signup Modal ─────────────────────────────────────────────────────────────
function SignupModal({ onClose, onToast }) {
  const [firstName, setFirstName]               = useState('');
  const [lastName, setLastName]                 = useState('');
  const [email, setEmail]                       = useState('');
  const [password, setPassword]                 = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [error, setError]                       = useState('');
  const [isLoading, setIsLoading]               = useState(false);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const passwordScore = password
    ? [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.'); return;
    }
    if (password.length < 8 || passwordScore < 2) {
      setError('Password must be at least 8 characters and rated Fair or stronger.'); return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    setIsLoading(true);
    await delay(AUTH_DELAY);
    const registrationError = await registerUser(firstName, lastName, email, password);
    setIsLoading(false);
    if (registrationError) { setError(registrationError); return; }
    onToast?.('Welcome To Pomelo TechOps Portal');
    onClose();
  };

  const fieldStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    border: '1.5px solid var(--border-default)', fontFamily: "'Inter', sans-serif",
    fontSize: '14px', color: 'var(--text-primary)', background: 'var(--bg-page)',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  };
  const pwFieldStyle = { ...fieldStyle, paddingRight: '44px' };
  const focusOrange = (e) => { e.target.style.borderColor = 'var(--accent-primary)'; };
  const blurGray    = (e) => { e.target.style.borderColor = 'var(--border-default)'; };

  const Lbl = ({ children }) => (
    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{children}</div>
  );
  const Eye = ({ show, onToggle }) => (
    <button type="button" onClick={onToggle} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1, padding: '4px' }}>
      {show ? '🙈' : '👁'}
    </button>
  );
  const Spin = () => (
    <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
  );

  return (
    <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create your account" style={{ width: '460px', maxWidth: '95vw', background: 'var(--bg-surface)', borderRadius: '16px', boxShadow: '0 24px 72px rgba(0,0,0,0.22)', overflow: 'hidden', animation: 'slideUp 0.2s ease' }}>

        {/* Header */}
        <div style={{ background: '#111111', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 900, fontFamily: "'Inter', sans-serif" }}>Create your account</h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '2px 6px', borderRadius: '4px' }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* First + Last Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Lbl>First Name</Lbl>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" aria-label="First name" autoComplete="given-name" style={fieldStyle} onFocus={focusOrange} onBlur={blurGray} />
            </div>
            <div>
              <Lbl>Last Name</Lbl>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" aria-label="Last name" autoComplete="family-name" style={fieldStyle} onFocus={focusOrange} onBlur={blurGray} />
            </div>
          </div>

          {/* Email */}
          <div>
            <Lbl>Email</Lbl>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@pomelo.com" aria-label="Email" autoComplete="email" style={fieldStyle} onFocus={focusOrange} onBlur={blurGray} />
          </div>

          {/* Password */}
          <div>
            <Lbl>Password</Lbl>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" aria-label="Password" autoComplete="new-password" style={pwFieldStyle} onFocus={focusOrange} onBlur={blurGray} />
              <Eye show={showPassword} onToggle={() => setShowPassword(v => !v)} />
            </div>
            <PasswordStrengthMeter password={password} />
          </div>

          {/* Confirm Password */}
          <div>
            <Lbl>Confirm Password</Lbl>
            <div style={{ position: 'relative' }}>
              <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" aria-label="Confirm password" autoComplete="new-password" style={pwFieldStyle} onFocus={focusOrange} onBlur={blurGray} />
              <Eye show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '13px 0', background: isLoading ? 'var(--border-strong)' : 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: '15px', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s' }}>
            {isLoading ? <Spin /> : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Password Strength Meter ───────────────────────────────────────────────────
function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#DC2626', '#EA580C', '#CA8A04', '#16A34A'];
  const color = colors[score - 1] || colors[0];
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < score ? color : 'var(--border-default)', transition: 'background 0.2s' }} />
        ))}
      </div>
      <div style={{ fontSize: '11px', color, textAlign: 'right', fontWeight: 700 }}>
        Password strength: {labels[score - 1] || 'Too short'}
      </div>
    </div>
  );
}

// ─── OTP Input ────────────────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  // useRef must not be called inside a loop or array method — store all 6
  // element refs in a single ref object to satisfy the Rules of Hooks.
  const refs = useRef([]);
  const [focusedIdx, setFocusedIdx] = useState(null);

  const handleChange = (idx, raw) => {
    const digit = raw.replace(/[^0-9]/g, '').slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      const next = [...value]; next[idx - 1] = '';
      onChange(next);
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    const next = Array(6).fill('');
    pasted.split('').forEach((d, i) => { next[i] = d; });
    onChange(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
      {value.map((v, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={v}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => { setFocusedIdx(i); refs.current[i]?.select(); }}
          onBlur={() => setFocusedIdx(null)}
          style={{
            width: '48px', height: '56px', textAlign: 'center',
            fontSize: '24px', fontWeight: 900,
            border: `2px solid ${focusedIdx === i ? 'var(--accent-primary)' : 'var(--border-default)'}`,
            borderRadius: '10px', outline: 'none',
            fontFamily: "'Inter', sans-serif",
            color: 'var(--text-primary)', background: 'var(--bg-page)',
            transition: 'border-color 0.15s',
          }}
        />
      ))}
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onToast }) {
  const [view, setView]                         = useState('login');
  const [email, setEmail]                       = useState('');
  const [password, setPassword]                 = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [rememberMe, setRememberMe]             = useState(false);
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState('');
  const [lockState, setLockStateLocal]          = useState(() => getLockState());
  const [countdown, setCountdown]               = useState(0);
  const [forgotEmail, setForgotEmail]           = useState('');
  const [otpValue, setOtpValue]                 = useState(['','','','','','']);
  const [otpError, setOtpError]                 = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showNewPass, setShowNewPass]           = useState(false);
  const [showConfPass, setShowConfPass]         = useState(false);
  const [resetError, setResetError]             = useState('');
  const [resendCooldown, setResendCooldown]     = useState(0);
  const [showSignup, setShowSignup]             = useState(false);

  const isLocked = lockState.lockedUntil > Date.now();

  // Pre-fill from remember me
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!lockState.lockedUntil || lockState.lockedUntil <= Date.now()) return;
    const tick = setInterval(() => {
      const remaining = Math.ceil((lockState.lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setCountdown(0); clearLockState();
        setLockStateLocal({ attempts: 0, lockedUntil: 0 });
        clearInterval(tick);
      } else { setCountdown(remaining); }
    }, 1000);
    setCountdown(Math.ceil((lockState.lockedUntil - Date.now()) / 1000));
    return () => clearInterval(tick);
  }, [lockState.lockedUntil]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLocked || isLoading) return;
    setIsLoading(true); setError('');
    await delay(AUTH_DELAY);
    const sanitised = email.trim().toLowerCase();
    const user = await validateCredentials(sanitised, password);
    if (!user) {
      const current = getLockState();
      const newAttempts = current.attempts + 1;
      const lockedUntil = newAttempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
      setLockState(newAttempts, lockedUntil);
      setLockStateLocal({ attempts: newAttempts, lockedUntil });
      setError('Invalid email or password');
      setIsLoading(false); return;
    }
    if (user._deactivated) {
      setError('Your account has been deactivated. Please contact an administrator.');
      setIsLoading(false); return;
    }
    clearLockState();
    if (rememberMe) localStorage.setItem(REMEMBER_KEY, sanitised);
    else localStorage.removeItem(REMEMBER_KEY);
    createSession(user);
    setIsLoading(false);
    onLogin(user);
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setForgotEmail(forgotEmail || email);
    setIsLoading(true);
    await delay(AUTH_DELAY);
    setIsLoading(false);
    setView('forgot-code');
    setResendCooldown(30);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const code = otpValue.join('');
    if (code.length < 6) { setOtpError('Please enter all 6 digits'); return; }
    setIsLoading(true); setOtpError('');
    await delay(AUTH_DELAY);
    setIsLoading(false);
    setView('forgot-password');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setResetError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setResetError('Passwords do not match'); return; }
    setIsLoading(true); setResetError('');
    await delay(AUTH_DELAY);
    setIsLoading(false);
    onToast?.('Password reset! Sign in with your new password.');
    setView('login');
    setNewPassword(''); setConfirmPassword(''); setOtpValue(['','','','','','']);
  };

  const resetToLogin = () => {
    setView('login'); setError(''); setOtpError(''); setResetError('');
    setForgotEmail(''); setOtpValue(['','','','','','']);
    setNewPassword(''); setConfirmPassword('');
  };

  const Spinner = () => (
    <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
  );

  const EyeToggle = ({ show, onToggle }) => (
    <button type="button" onClick={onToggle} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1, padding: '4px' }} aria-label={show ? 'Hide password' : 'Show password'}>
      {show ? '🙈' : '👁'}
    </button>
  );

  const FieldInput = ({ type, value, onChange, placeholder, autoComplete, extra = {} }) => (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} aria-label={placeholder} autoComplete={autoComplete}
      style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '8px', border: '1.5px solid var(--border-default)', fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--text-primary)', background: 'var(--bg-page)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s', ...extra }}
      onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
      onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
    />
  );

  const ErrorBanner = ({ msg }) => msg ? (
    <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
      ⚠ {msg}
    </div>
  ) : null;

  const BackLink = ({ onClick }) => (
    <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
      ← Back to sign in
    </button>
  );

  const submitBtnStyle = (disabled) => ({
    width: '100%', padding: '13px', background: disabled ? 'var(--border-strong)' : 'var(--accent-primary)',
    color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Inter', sans-serif",
    fontWeight: 700, fontSize: '15px', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'background 0.15s', marginTop: '8px',
  });

  const Label = ({ children }) => (
    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{children}</div>
  );

  const renderRight = () => {
    if (view === 'login') return (
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px' }}>Welcome back 👋</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Sign in to your TechOps account</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label>Email</Label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@pomelo.com" aria-label="Email" autoComplete="email" disabled={isLocked || isLoading}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid var(--border-default)', fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--text-primary)', background: isLocked ? 'var(--bg-hover)' : 'var(--bg-page)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-default)'} />
          </div>
          <div>
            <Label>Password</Label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" aria-label="Password" autoComplete="current-password" disabled={isLocked || isLoading}
                style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '8px', border: '1.5px solid var(--border-default)', fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--text-primary)', background: isLocked ? 'var(--bg-hover)' : 'var(--bg-page)', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-default)'} />
              <EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
              Remember me
            </label>
            <button type="button" onClick={() => setView('forgot-email')} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              Forgot password?
            </button>
          </div>
          <button type="submit" disabled={isLocked || isLoading} style={submitBtnStyle(isLocked || isLoading)}>
            {isLoading ? <Spinner /> : 'Sign In'}
          </button>
          <ErrorBanner msg={error} />
          {isLocked && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '13px', fontWeight: 700 }}>
              🔒 Too many attempts. Try again in <strong>{countdown}s</strong>
            </div>
          )}
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {"Don't have an account? "}
          <button type="button" onClick={() => setShowSignup(true)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '14px', cursor: 'pointer', padding: 0 }}>
            Sign up
          </button>
        </p>
      </div>
    );

    if (view === 'forgot-email') return (
      <div>
        <BackLink onClick={resetToLogin} />
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px' }}>Forgot your password?</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>{"We'll send a 6-digit code to your email."}</p>
        <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label>Email</Label>
            <input type="email" value={forgotEmail || email} onChange={e => setForgotEmail(e.target.value)} placeholder="you@pomelo.com" aria-label="Email" autoComplete="email"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid var(--border-default)', fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--text-primary)', background: 'var(--bg-page)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-default)'} />
          </div>
          <button type="submit" disabled={isLoading} style={submitBtnStyle(isLoading)}>
            {isLoading ? <Spinner /> : 'Send Reset Code'}
          </button>
        </form>
      </div>
    );

    if (view === 'forgot-code') return (
      <div>
        <BackLink onClick={resetToLogin} />
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px' }}>Check your email</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Enter the 6-digit code sent to <strong>{forgotEmail || email}</strong>
        </p>
        <form onSubmit={handleVerifyCode}>
          <OtpInput value={otpValue} onChange={setOtpValue} />
          <ErrorBanner msg={otpError} />
          <button type="submit" disabled={isLoading} style={submitBtnStyle(isLoading)}>
            {isLoading ? <Spinner /> : 'Verify Code'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px' }}>
          {resendCooldown > 0
            ? <span style={{ color: 'var(--text-muted)' }}>Resend code in {resendCooldown}s</span>
            : <button type="button" onClick={() => setResendCooldown(30)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Resend code</button>
          }
        </div>
      </div>
    );

    if (view === 'forgot-password') return (
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px' }}>Create new password</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '28px' }}>Choose a strong password for your account.</p>
        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label>New Password</Label>
            <div style={{ position: 'relative' }}>
              <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" aria-label="New password" autoComplete="new-password"
                style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '8px', border: '1.5px solid var(--border-default)', fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--text-primary)', background: 'var(--bg-page)', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-default)'} />
              <EyeToggle show={showNewPass} onToggle={() => setShowNewPass(v => !v)} />
            </div>
            <PasswordStrengthMeter password={newPassword} />
          </div>
          <div>
            <Label>Confirm Password</Label>
            <div style={{ position: 'relative' }}>
              <input type={showConfPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" aria-label="Confirm new password" autoComplete="new-password"
                style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '8px', border: '1.5px solid var(--border-default)', fontFamily: "'Inter', sans-serif", fontSize: '14px', color: 'var(--text-primary)', background: 'var(--bg-page)', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'} onBlur={e => e.target.style.borderColor = 'var(--border-default)'} />
              <EyeToggle show={showConfPass} onToggle={() => setShowConfPass(v => !v)} />
            </div>
          </div>
          <ErrorBanner msg={resetError} />
          <button type="submit" disabled={isLoading} style={submitBtnStyle(isLoading)}>
            {isLoading ? <Spinner /> : 'Reset Password'}
          </button>
        </form>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        @media (max-width: 640px) { .login-left { display: none !important; } .login-right { padding: 32px 24px !important; } }
      `}</style>

      {/* Left panel — hidden on mobile via .login-left media query */}
      <div className="login-left" style={{ width: '42%', background: '#111111', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '44px 52px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(124,58,237,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: '22px', letterSpacing: '-0.01em' }}>Pomelo</div>
          <div style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '1px' }}>TechOps Portal</div>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: '30px', fontWeight: 900, lineHeight: 1.25, marginBottom: '32px' }}>
            IT Support,<br />built for Pomelo teams
          </h1>
          {[
            { icon: '🎟', text: 'Submit & track IT tickets' },
            { icon: '📚', text: 'Access IT documentation' },
            { icon: '🛠', text: 'Powerful admin tools' },
          ].map(f => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '18px', width: '28px', textAlign: 'center' }}>{f.icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.78)', fontSize: '15px' }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
          🔒 Internal use only · Pomelo Technology
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right" style={{ flex: 1, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {renderRight()}
        </div>
      </div>

      {showSignup && <SignupModal onClose={() => setShowSignup(false)} onToast={onToast} />}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  app: {
    fontFamily: "'Inter', sans-serif",
    background: 'var(--bg-page)',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--text-primary)',
  },
  nav: {
    background: 'var(--bg-nav)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    height: '60px',
    borderBottom: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-card)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  navLogoText: {
    color: 'var(--text-primary)',
    fontWeight: 900,
    fontSize: '17px',
    letterSpacing: '0.02em',
  },
  navLogoSub: {
    color: 'var(--accent-primary)',
    fontWeight: 700,
    fontSize: '11px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginTop: '-2px',
  },
  navTabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  navTab: (active) => ({
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '13px',
    fontWeight: active ? 600 : 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
    position: 'relative',
    boxShadow: active ? 'inset 0 -1.5px 0 0 var(--accent-primary)' : 'none',
    borderRadius: '0',
  }),
  navUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '13px',
  },
  main: {
    flex: 1,
    padding: '32px 28px',
    maxWidth: '1100px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 900,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  pageSub: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '28px',
  },
  card: {
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-default)',
    padding: '24px',
    boxShadow: 'var(--shadow-card)',
  },
  orangeBtn: {
    background: 'var(--accent-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  ghostBtn: {
    background: 'transparent',
    color: 'var(--accent-primary)',
    border: '1.5px solid var(--accent-primary)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  label: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid var(--border-default)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    color: 'var(--text-primary)',
    background: 'var(--bg-input)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid var(--border-default)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    color: 'var(--text-primary)',
    background: 'var(--bg-input)',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '100px',
    transition: 'border-color 0.15s',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid var(--border-default)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    color: 'var(--text-primary)',
    background: 'var(--bg-input)',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    appearance: 'none',
  },
  badge: (color) => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '100px',
    background: color + '18',
    color: color,
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.04em',
  }),
  statCard: {
    background: 'var(--bg-surface)',
    borderRadius: '12px',
    border: '1px solid var(--border-default)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-card)',
  },
  statNum: {
    fontSize: '36px',
    fontWeight: 900,
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  footer: {
    background: 'var(--bg-surface)',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '16px 24px',
    fontSize: '13px',
    marginTop: 'auto',
    borderTop: '1px solid var(--border-default)',
  },
};

// ─── Toast ────────────────────────────────────────────────────────────────────
// type: 'success' | 'error' | 'info'
function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  const variants = {
    success: { bg: '#111111', icon: '✅', title: 'Done!' },
    error:   { bg: '#DC2626', icon: '❌', title: 'Something went wrong' },
    info:    { bg: '#0369A1', icon: 'ℹ️',  title: 'Note' },
  };
  const v = variants[type] || variants.success;

  return (
    <div style={{
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
      background: v.bg, color: '#fff', padding: '14px 22px',
      borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: '12px',
      animation: 'slideUp 0.3s ease',
      maxWidth: '380px', fontFamily: "'Inter', sans-serif",
    }}
      role="status" aria-live="polite"
    >
      <span style={{ fontSize: '20px' }}>{v.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{v.title}</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', wordBreak: 'break-word' }}>{message}</div>
      </div>
      <button onClick={onDone} aria-label="Dismiss notification" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 0 0 4px', flexShrink: 0 }}>×</button>
    </div>
  );
}

// ─── Priority Suggester ───────────────────────────────────────────────────────
function PrioritySuggester({ onSelect }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);

  const questions = [
    'Is this completely blocking your work right now?',
    'Are multiple people affected by this issue?',
    'Is there a workaround available?',
  ];

  const suggest = (ans) => {
    const all = [...answers, ans];
    if (all.length < 3) {
      setAnswers(all);
      setStep(step + 1);
    } else {
      const blocked = all[0];
      const multi = all[1];
      const noWorkaround = !all[2];
      let priority = 'Low';
      if (blocked && multi && noWorkaround) priority = 'Critical';
      else if (blocked && noWorkaround) priority = 'High';
      else if (blocked || (multi && noWorkaround)) priority = 'Medium';
      onSelect(priority);
    }
  };

  const reset = () => { setStep(0); setAnswers([]); };

  return (
    <div style={{ background: '#F0F4FF', border: '1.5px solid #BFDBFE', borderRadius: '10px', padding: '16px 20px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🧠</span> Smart Priority Suggester
        {step > 0 && <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px' }}>Reset</button>}
      </div>
      {step < 3 ? (
        <>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Q{step + 1}: {questions[step]}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => suggest(true)} style={{ ...S.orangeBtn, padding: '7px 18px', fontSize: '13px' }}>Yes</button>
            <button onClick={() => suggest(false)} style={{ ...S.ghostBtn }}>No</button>
          </div>
        </>
      ) : (
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Answer all 3 questions first.
        </div>
      )}
    </div>
  );
}

// ─── Doc Slide Panel ──────────────────────────────────────────────────────────
function DocPanel({ doc, onClose, onReadFull }) {
  return (
    <>
      <div onClick={onClose} role="presentation" style={{
        position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 200,
        animation: 'fadeIn 0.2s ease',
      }} />
      <div role="dialog" aria-modal="true" aria-label={doc?.title || 'Document preview'} style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '520px', maxWidth: '95vw',
        background: 'var(--bg-surface)', zIndex: 201, boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.25s ease',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{doc.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)' }}>{doc.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{doc.category}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <DocMarkdown content={doc.content} />
        </div>
        {/* Read Full Article CTA */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-page)' }}>
          <button
            onClick={() => { onClose(); onReadFull(doc); }}
            style={{
              ...S.orangeBtn, width: '100%', justifyContent: 'center',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: '12px',
            }}
          >
            Read Full Article <span style={{ fontSize: '16px' }}>→</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Doc Full Page ────────────────────────────────────────────────────────────
function DocFullPage({ doc, allDocs, onClose, onSelect }) {
  const [activeDoc, setActiveDoc] = useState(doc);
  const contentRef = useRef(null);

  // Scroll to top whenever article changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeDoc]);

  const otherDocs = allDocs.filter(d => d.id !== activeDoc.id);
  const categories = [...new Set(allDocs.map(d => d.category))];

  const switchDoc = (d) => { setActiveDoc(d); onSelect?.(d); };

  return (
    <div style={{ display: 'flex', minHeight: '100%' }}>
      {/* Left sidebar */}
      <div style={{
        width: '260px', flexShrink: 0, background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-default)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, maxHeight: 'calc(100vh - 60px)',
        overflowY: 'auto',
      }}>
        {/* Sidebar back button */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-default)' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            ← Back to Library
          </button>
        </div>

        {/* Sidebar doc list grouped by category */}
        <div style={{ padding: '12px 0', flex: 1 }}>
          {categories.map(cat => {
            const catDocs = allDocs.filter(d => d.category === cat);
            return (
              <div key={cat} style={{ marginBottom: '4px' }}>
                <div style={{ padding: '6px 18px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {cat}
                </div>
                {catDocs.map(d => {
                  const isActive = d.id === activeDoc.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => switchDoc(d)}
                      style={{
                        width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                        padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '9px',
                        background: isActive ? 'var(--accent-soft)' : 'transparent',
                        borderRight: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                        transition: 'background 0.1s',
                        fontFamily: "'Inter', sans-serif",
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-page)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{d.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: isActive ? 700 : 400, color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)', lineHeight: 1.3 }}>{d.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main article content */}
      <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '40px 56px', maxWidth: '780px' }}>
        {/* Article header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '32px' }}>{activeDoc.icon}</span>
            <span style={{ ...S.badge('var(--text-secondary)'), fontSize: '11px' }}>{activeDoc.category}</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '10px', lineHeight: 1.2 }}>
            {activeDoc.title}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{activeDoc.summary}</p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border-default)', marginBottom: '28px' }} />

        {/* Article body */}
        <DocMarkdown content={activeDoc.content} />

        {/* Next / Prev navigation */}
        {otherDocs.length > 0 && (
          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>More Articles</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {otherDocs.slice(0, 3).map(d => (
                <button
                  key={d.id}
                  onClick={() => switchDoc(d)}
                  style={{
                    ...S.card, textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(124,58,237,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
                >
                  <span style={{ fontSize: '22px' }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{d.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{d.category}</div>
                  </div>
                  <span style={{ color: 'var(--accent-primary)', fontSize: '16px' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Safely render inline markdown bold (**text**) as React <strong> elements
// without using dangerouslySetInnerHTML. Splits on the bold pattern and
// alternates between plain text and bold spans.
function InlineMd({ text }) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
      )}
    </>
  );
}

function DocMarkdown({ content }) {
  const lines = (content || '').split('\n');
  return (
    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        if (line.startsWith('# '))   return <h1 key={i} style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '12px', marginTop: i === 0 ? 0 : '20px' }}>{line.slice(2)}</h1>;
        if (line.startsWith('## '))  return <h2 key={i} style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', marginTop: '18px' }}>{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', marginTop: '14px' }}>{line.slice(4)}</h3>;
        if (line.startsWith('- [ ] ')) return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}><span style={{ color: 'var(--border-strong)' }}>☐</span><span>{line.slice(6)}</span></div>;
        if (line.startsWith('- '))   return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}><span style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>•</span><span><InlineMd text={line.slice(2)} /></span></div>;
        if (line.startsWith('| '))   return null;
        if (line === '')             return <div key={i} style={{ height: '8px' }} />;
        return <p key={i} style={{ marginBottom: '6px' }}><InlineMd text={line} /></p>;
      })}
    </div>
  );
}

// ─── Ticket Detail ────────────────────────────────────────────────────────────
function TicketDetail({ ticket, onBack, role, onStatusChange, onAssigneeChange, onAddNotification, currentUser }) {
  const can = useCan();
  const isAssignedToMe = !!currentUser?.email && !!ticket.assigneeEmail && ticket.assigneeEmail === currentUser.email;
  const canViewAll = can('tickets.view_all');
  const canSeeAudit = can('audit.view');
  const canChangeStatus = can('tickets.status_change_any') || (isAssignedToMe && can('tickets.status_change_own'));
  const [newMsg, setNewMsg] = useState('');
  const [messages, setMessages] = useState(ticket.messages);
  const [internalNotes, setInternalNotes] = useState(ticket.internalNotes || []);
  const [newNote, setNewNote] = useState('');
  const messagesEndRef = useRef(null);
  const jiraDetail = useJiraIssueDetail(ticket?.jiraKey);
  const jiraSla = useJiraSla(ticket?.jiraKey);
  const jiraChangelog = useJiraChangelog(ticket?.jiraKey);
  const jiraWatchers = useJiraWatchers(ticket?.jiraKey);
  const jiraCsat = useJiraCsat(ticket?.jiraKey, ticket?.status);
  const jiraWorklog = useJiraWorklog(ticket?.jiraKey);

  const workflow = useJiraWorkflow();
  const statusOrder = workflow.statuses.map(s => s.name);
  const currentIdx = statusOrder.indexOf(ticket.status);

  // Context about the assignee (department + workload) — shown to anyone with
  // full ticket visibility, not just superadmins.
  const assigneeContext = useMemo(() => {
    if (!canViewAll || !ticket.assignee) return null;
    const u = MOCK_USERS.find(u => u.name === ticket.assignee);
    const open = MOCK_TICKETS.filter(t => t.assignee === ticket.assignee && (t.status === 'Open' || t.status === 'In Progress')).length;
    const total = MOCK_TICKETS.filter(t => t.assignee === ticket.assignee).length;
    return { dept: u?.department || 'Unknown', email: u?.email || null, open, total };
  }, [canViewAll, ticket.assignee]);

  const addInternalNote = () => {
    const text = newNote.trim();
    if (!text) return;
    const note = {
      id: 'n' + Date.now(),
      author: 'You',
      ts: new Date().toISOString(),
      text,
    };
    setInternalNotes(prev => [...prev, note]);
    if (!ticket.internalNotes) ticket.internalNotes = [];
    ticket.internalNotes.push(note);
    bumpTickets();
    setNewNote('');
    recordAudit('ticket.internal_note', _currentActor, { type: 'ticket', id: ticket.id, label: ticket.title });
  };

  const sendMsg = async () => {
    if (!newMsg.trim()) return;
    const text = newMsg.trim();
    const localMsg = {
      from: _currentActor?.name || 'You',
      time: new Date().toISOString().slice(0, 16).replace('T', ' '),
      text,
      synced: false,
    };
    setMessages(prev => [...prev, localMsg]);
    setNewMsg('');
    onAddNotification?.({
      type: 'ticket_message',
      title: `New message on ${ticket.id}`,
      body: text,
      actorName: _currentActor?.name || 'You',
      ticketId: ticket.id,
    });

    // Fire-and-forget push to Jira when the ticket is linked
    if (ticket.jiraKey) {
      try {
        const res = await fetch('/api/v1/jira/comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: ticket.jiraKey, body: text, author: _currentActor?.name }),
        });
        if (res.ok) {
          setMessages(prev => prev.map(m => m === localMsg ? { ...m, synced: true } : m));
          recordAudit('ticket.jira_comment', _currentActor, { type: 'ticket', id: ticket.id, label: ticket.title }, { jiraKey: ticket.jiraKey });
        } else {
          recordAudit('ticket.jira_comment_failed', _currentActor, { type: 'ticket', id: ticket.id, label: ticket.title }, { jiraKey: ticket.jiraKey, status: res.status });
        }
      } catch { /* keep local-only */ }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // On open, if this ticket is linked to Jira, pull any newer comments
  useEffect(() => {
    if (!ticket?.jiraKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/jira/issue/${encodeURIComponent(ticket.jiraKey)}/comments`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data.comments)) return;
        // Merge any Jira comments not already in our local thread (match by body+author)
        setMessages(prev => {
          const known = new Set(prev.map(m => `${m.from}|${m.text}`));
          const additions = data.comments
            .filter(c => !known.has(`${c.author}|${c.body.replace(/^\[Posted via TechOps Portal by [^\]]+\]\n/, '')}`))
            .map(c => ({
              from: c.author,
              time: c.created ? c.created.slice(0, 16).replace('T', ' ') : '',
              text: c.body,
              synced: true,
              fromJira: true,
            }));
          return additions.length === 0 ? prev : [...prev, ...additions];
        });
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [ticket?.jiraKey]);

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        ← Back to My Tickets
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '4px' }}>{ticket.id}</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)' }}>{ticket.title}</div>
          {(assigneeContext || ticket.requester) && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {canViewAll && ticket.requester && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: '#EFF6FF', borderRadius: '100px', border: '1px solid #BFDBFE', fontSize: '11px', color: '#1E3A8A', fontWeight: 600 }}>
                  🙋 Submitted by <strong>{ticket.requester.name}</strong>{ticket.requester.email ? <> · {ticket.requester.email}</> : null}
                </div>
              )}
              {assigneeContext && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: 'var(--accent-soft)', borderRadius: '100px', border: '1px solid #C4B5FD', fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  👤 Assigned to <strong>{ticket.assignee}</strong> · {assigneeContext.dept} · {assigneeContext.open} open / {assigneeContext.total} total
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={S.badge(PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</span>
          <span style={S.badge(STATUS_COLORS[ticket.status])}>{ticket.status}</span>
        </div>
      </div>

      {/* JSM SLA cycles (Jira-authoritative) */}
      {jiraSla?.available && Array.isArray(jiraSla.cycles) && jiraSla.cycles.length > 0 && (
        <div style={{ ...S.card, marginBottom: '20px', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>SLA (from Jira Service Management)</div>
          <div style={{ display: 'grid', gap: '6px' }}>
            {jiraSla.cycles.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</span>
                {c.paused && <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontWeight: 700 }}>⏸ Paused</span>}
                {c.breached
                  ? <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: '#FEE2E2', color: '#B91C1C', fontWeight: 700 }}>🔴 Breached</span>
                  : <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', fontWeight: 700 }}>🟢 On track</span>}
                {c.remainingTime && <span style={{ color: 'var(--text-secondary)' }}>Remaining: {c.remainingTime}</span>}
                {c.elapsedTime && <span style={{ color: 'var(--text-muted)' }}>Elapsed: {c.elapsedTime}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Jira issues */}
      {jiraDetail?.links && jiraDetail.links.length > 0 && (
        <div style={{ ...S.card, marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>🔗 Linked issues</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {jiraDetail.links.map(l => (
              <a
                key={`${l.key}-${l.direction}`}
                href={`https://pomelofashion.atlassian.net/browse/${l.key}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'var(--bg-page)', borderRadius: '7px', textDecoration: 'none', color: 'var(--text-primary)' }}
              >
                <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: 'var(--border-default)', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l.label || l.type}</span>
                <span style={{ fontSize: '12px', color: '#1D4ED8', fontWeight: 700 }}>{l.key}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{l.summary}</span>
                {l.status && <span style={{ ...S.badge(statusColorFor(l.status)), fontSize: '10px' }}>{l.status}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* CSAT (resolved tickets only) */}
      {jiraCsat?.available && jiraCsat.rating != null && (
        <div style={{ ...S.card, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Customer satisfaction</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '20px' }}>
            {Array.from({ length: jiraCsat.max || 5 }).map((_, i) => (
              <span key={i} style={{ color: i < jiraCsat.rating ? '#F59E0B' : 'var(--border-default)' }}>★</span>
            ))}
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: '4px' }}>{jiraCsat.rating}/{jiraCsat.max || 5}</span>
          </div>
          {jiraCsat.comment && <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{jiraCsat.comment}"</div>}
        </div>
      )}

      {/* Worklog summary */}
      {jiraWorklog && jiraWorklog.totalSeconds > 0 && canViewAll && (
        <div style={{ ...S.card, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>⏱ Time logged ({Math.round(jiraWorklog.totalSeconds / 360) / 10}h total)</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{jiraWorklog.entries.length} entries</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {jiraWorklog.totals.map(t => (
              <span key={t.author} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                {t.author}: {t.hours}h
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Watchers */}
      {ticket?.jiraKey && jiraWatchers.watchCount > 0 && (
        <div style={{ ...S.card, marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>👁 Watchers ({jiraWatchers.watchCount})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {jiraWatchers.watchers.length === 0
              ? <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Watcher list requires elevated Jira permissions.</span>
              : jiraWatchers.watchers.map(w => (
                  <span key={w.accountId} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '100px', background: '#EFF6FF', color: '#1E3A8A', fontWeight: 600 }}>{w.displayName}</span>
                ))}
          </div>
        </div>
      )}

      {/* Jira issue metadata badges */}
      {jiraDetail && (jiraDetail.issueType || jiraDetail.labels.length > 0 || jiraDetail.components.length > 0 || jiraDetail.fixVersions.length > 0) && (
        <div style={{ ...S.card, marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {jiraDetail.issueType && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontWeight: 700 }}>📋 {jiraDetail.issueType}</span>}
          {jiraDetail.components.map(c => <span key={c.id} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: '#ECFCCB', color: '#3F6212', fontWeight: 700 }}>🧩 {c.name}</span>)}
          {jiraDetail.labels.map(l => <span key={l} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '100px', background: '#FAF5FF', color: '#6B21A8', fontWeight: 600 }}>#{l}</span>)}
          {jiraDetail.fixVersions.map(v => <span key={v} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '4px', background: '#FFF7ED', color: 'var(--accent-primary)', fontWeight: 700 }}>🏷 fixVersion: {v}</span>)}
        </div>
      )}

      {/* Attachments — merges locally-persisted files (with data URLs for in-tab
          preview) and Jira-side attachments (linked at their Jira content URLs). */}
      <TicketAttachments local={ticket.attachments} jira={jiraDetail?.attachments} />

      {canViewAll && (
        <div style={{ ...S.card, marginBottom: '20px', borderLeft: '4px solid #FBBF24' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Internal notes</span>
            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Admin only</span>
          </div>
          {internalNotes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              {internalNotes.map(n => (
                <div key={n.id} style={{ padding: '10px 12px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{n.text}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{n.author} · {new Date(n.ts).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addInternalNote(); }}
              placeholder="Leave a note other admins will see…"
              aria-label="Add internal note"
              style={{ flex: 1, padding: '9px 14px', border: '1.5px solid var(--border-default)', borderRadius: '8px', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
            <button onClick={addInternalNote} disabled={!newNote.trim()} style={{ padding: '9px 16px', background: newNote.trim() ? '#111111' : 'var(--border-default)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: newNote.trim() ? 'pointer' : 'not-allowed' }}>
              Add note
            </button>
          </div>
        </div>
      )}

      {/* Status Tracker */}
      <div style={{ ...S.card, marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '16px' }}>Status Tracker</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {statusOrder.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < statusOrder.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: i <= currentIdx ? 'var(--accent-primary)' : 'var(--border-default)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i <= currentIdx ? '#fff' : 'var(--text-muted)',
                  fontSize: '13px', fontWeight: 700,
                  border: i === currentIdx ? '3px solid #FDBA74' : '3px solid transparent',
                  boxSizing: 'border-box',
                }}>
                  {i < currentIdx ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: '11px', color: i <= currentIdx ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: i === currentIdx ? 700 : 400, whiteSpace: 'nowrap' }}>{s}</div>
              </div>
              {i < statusOrder.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: i < currentIdx ? 'var(--accent-primary)' : 'var(--border-default)', margin: '0 4px', marginBottom: '20px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Timeline — merges local actions + Jira changelog when ticket is linked */}
        <div style={S.card}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '14px' }}>Activity Timeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              const localEntries = (ticket.timeline || []).map((t, i) => ({ key: `l-${i}`, when: t.date, actor: t.actor, action: t.action, source: 'local' }));
              const jiraEntries = (jiraChangelog || []).flatMap(h =>
                h.changes.map((c, idx) => ({
                  key: `j-${h.id}-${idx}`,
                  when: h.created,
                  actor: h.author,
                  action: `${c.field}: ${c.from || '—'} → ${c.to || '—'}`,
                  source: 'jira',
                }))
              );
              const merged = [...localEntries, ...jiraEntries].sort((a, b) => String(b.when).localeCompare(String(a.when)));
              return merged.map((t, i) => (
                <div key={t.key} style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.source === 'jira' ? '#1D4ED8' : 'var(--accent-primary)', flexShrink: 0, marginTop: '3px' }} />
                    {i < merged.length - 1 && <div style={{ width: '1px', flex: 1, background: 'var(--border-default)', marginTop: '4px' }} />}
                  </div>
                  <div style={{ paddingBottom: '8px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.action} {t.source === 'jira' && <span style={{ fontSize: '10px', color: '#1D4ED8', fontWeight: 700 }}>· Jira</span>}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{String(t.when).slice(0, 16).replace('T', ' ')} · {t.actor}</div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Details */}
        <div style={S.card}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '14px' }}>Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Assignee</span>
              {can('tickets.assign') ? (
                <div style={{ position: 'relative' }}>
                  <select
                    value={ticket.assignee || ''}
                    onChange={e => onAssigneeChange(ticket.id, e.target.value || null)}
                    style={{ ...S.select, width: 'auto', padding: '3px 24px 3px 8px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}
                  >
                    <option value="">Unassigned</option>
                    {ALL_AGENTS.filter(a => a !== 'Unassigned').map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>{ticket.assignee || 'Unassigned'}</span>
              )}
            </div>
            {[
              ['Category', ticket.category],
              ['Priority', ticket.priority],
              ['Department', ticket.department || '—'],
              ['Shop', ticket.shop || '—'],
              ['Platforms', ticket.platforms?.join(', ') || '—'],
              ['Created', ticket.created],
              ['Last Updated', ticket.updated],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Description</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
          </div>
          {ticket.currentResult && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Current result</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.currentResult}</div>
            </div>
          )}
          {ticket.expectedResult && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Expected result</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.expectedResult}</div>
            </div>
          )}
          {/* Attachment summary line is replaced by the dedicated preview card above. */}
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
            {canChangeStatus ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>Change Status</span>
                <div style={{ position: 'relative', flex: 1 }}>
                  <select
                    value={ticket.status}
                    onChange={e => onStatusChange(ticket.id, e.target.value)}
                    style={{ ...S.select, padding: '6px 28px 6px 10px', fontSize: '13px' }}
                  >
                    {['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', fontSize: '11px' }}>▾</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg-page)', borderRadius: '7px', border: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '14px' }}>🔒</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Status updates are managed by the IT team.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messaging */}
      <div style={S.card}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '14px' }}>Messages</div>
        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {messages.map((m, i) => {
            const isYou = m.from === 'You';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: isYou ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: isYou ? 'var(--accent-primary)' : '#111111',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '11px', fontWeight: 700,
                }}>
                  {m.from[0]}
                </div>
                <div style={{ maxWidth: '70%' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px', textAlign: isYou ? 'right' : 'left' }}>
                    {m.from} · {m.time}
                  </div>
                  <div style={{
                    background: isYou ? 'var(--accent-primary)' : 'var(--bg-hover)',
                    color: isYou ? '#fff' : 'var(--text-secondary)',
                    padding: '10px 14px', borderRadius: isYou ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    fontSize: '13px', lineHeight: 1.5,
                  }}>
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        {ticket.status !== 'Closed' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
              placeholder="Type a message…"
              style={{ ...S.input, flex: 1 }}
            />
            <button onClick={sendMsg} style={{ ...S.orangeBtn, whiteSpace: 'nowrap' }}>Send</button>
          </div>
        )}
        {ticket.status === 'Closed' && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>This ticket is closed.</div>
        )}
      </div>
    </div>
  );
}

// ─── SLA chip ─────────────────────────────────────────────────────────────────
function SlaChip({ ticket }) {
  const state = slaStateFor(ticket);
  if (state === 'ok') return null;
  const target = SLA_TARGETS_HOURS[ticket.priority];
  if (!target) return null;
  const ageHrs = (Date.now() - new Date(ticket.created).getTime()) / 3600000;
  const overdueHrs = Math.max(0, ageHrs - target.resolution);
  const fmt = h => h >= 24 ? `${Math.floor(h / 24)}d` : `${Math.round(h)}h`;
  const palette = state === 'breached'
    ? { bg: '#FEE2E2', fg: '#B91C1C', label: `🔴 SLA breached +${fmt(overdueHrs)}` }
    : { bg: '#FEF3C7', fg: '#92400E', label: `🟡 SLA at risk` };
  const title = `Priority ${ticket.priority}: resolution target ${target.resolution}h; age ${fmt(ageHrs)}`;
  return <span title={title} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: palette.bg, color: palette.fg, fontWeight: 700 }}>{palette.label}</span>;
}

// ─── Jira sync chip ───────────────────────────────────────────────────────────
function JiraSyncChip({ ticket }) {
  if (!ticket) return null;
  const state = ticket.jiraSyncState || (ticket.jiraKey ? 'synced' : 'local-only');
  const palette = {
    'synced': { bg: '#DBEAFE', fg: '#1D4ED8', label: `🔵 ${ticket.jiraKey || 'Jira'}` },
    'syncing': { bg: '#FEF3C7', fg: '#92400E', label: '🔄 Syncing…' },
    'error': { bg: '#FEE2E2', fg: '#B91C1C', label: '❌ Sync error' },
    'diverged': { bg: '#FFEDD5', fg: 'var(--accent-primary)', label: '⚠️ Diverged' },
    'local-only': { bg: 'var(--bg-hover)', fg: 'var(--text-secondary)', label: '⚪ Local only' },
  };
  const p = palette[state] || palette['local-only'];
  const title = state === 'error' ? (ticket.jiraSyncError || 'Sync error')
    : state === 'synced' && ticket.jiraSyncedAt ? `Synced with ${ticket.jiraKey} at ${new Date(ticket.jiraSyncedAt).toLocaleString()}`
    : state === 'local-only' ? 'No Jira link — submit while Jira is configured to create one'
    : '';
  return (
    <span title={title} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: p.bg, color: p.fg, fontWeight: 700 }}>{p.label}</span>
  );
}

// ─── Recent Activity feed (Home) ──────────────────────────────────────────────
// Live view of the most-recently-updated tickets, plus (admin only) the last
// few audit entries so admins see admin actions on their dashboard.
function RecentActivityFeed({ role, onTicket, setSection }) {
  const [, _setV] = useState(0);
  useEffect(() => subscribeTickets(_setV), []);
  useEffect(() => subscribeAudit(_setV), []);

  const recentTickets = useMemo(() => {
    return MOCK_TICKETS
      .slice()
      .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))
      .slice(0, canSeeAudit ? 3 : 5);
  }, [canSeeAudit]); // eslint-disable-line react-hooks/exhaustive-deps

  const recentAudit = useMemo(() => {
    if (!canSeeAudit) return [];
    return listAudit().slice(0, 3);
  }, [canSeeAudit]); // eslint-disable-line react-hooks/exhaustive-deps

  const auditLabel = a => ({
    'user.create': '➕ User created',
    'user.update': '✏️ User edited',
    'user.promote': '⬆️ Promoted to superadmin',
    'user.demote': '⬇️ Demoted to user',
    'user.deactivate': '🚫 User deactivated',
    'user.reactivate': '✅ User reactivated',
    'user.force_re_otp': '🔁 Force re-OTP',
    'user.reset_password': '🔑 Password reset',
    'admin.view_as': '👁 View-as switched',
    'session.login': '🔓 Admin login',
    'session.logout': '🔒 Admin logout',
    'system.maintenance_on': '🛠 Maintenance ON',
    'system.maintenance_off': '🛠 Maintenance OFF',
    'ticket.bulk_status': '📋 Bulk status change',
    'ticket.bulk_reassign': '📋 Bulk reassign',
    'ticket.internal_note': '📝 Internal note',
  })[a] || a;

  const fmtAgo = iso => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Activity</div>
        {canSeeAudit && (
          <button onClick={() => setSection('audit')} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
            View full audit log →
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {recentTickets.map(t => (
          <button
            key={t.id}
            onClick={() => onTicket(t)}
            style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', width: '100%', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(124,58,237,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
          >
            <span style={S.badge(PRIORITY_COLORS[t.priority])}>{t.priority}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.id} · {t.category} · updated {t.updated}</div>
            </div>
            <span style={S.badge(STATUS_COLORS[t.status])}>{t.status}</span>
            <span style={{ color: 'var(--border-strong)', fontSize: '16px', flexShrink: 0 }}>↗</span>
          </button>
        ))}
        {recentAudit.length > 0 && (
          <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Admin actions</div>
        )}
        {recentAudit.map(e => (
          <div key={e.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{auditLabel(e.action)}</div>
            <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)' }}>
              {e.actorName}{e.targetLabel ? ` · ${e.targetLabel}` : ''}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{fmtAgo(e.ts)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Ticket Popup Modal (Home Recent Activity) ────────────────────────────────
function TicketPopupModal({ ticket, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 300, animation: 'fadeIn 0.15s ease' }} />
      <div role="dialog" aria-modal="true" aria-label={ticket?.title || 'Ticket details'} style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--bg-surface)', borderRadius: '16px', zIndex: 301,
        width: '540px', maxWidth: '95vw', maxHeight: '85vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#111111', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.06em' }}>{ticket.id}</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>{ticket.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: 0, marginLeft: '14px', flexShrink: 0 }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={S.badge(PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</span>
            <span style={S.badge(STATUS_COLORS[ticket.status])}>{ticket.status}</span>
            <span style={{ ...S.badge('var(--text-secondary)'), fontSize: '11px' }}>{ticket.category}</span>
          </div>

          {/* Description */}
          <div style={{ background: 'var(--bg-page)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Description</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.description}</div>
          </div>
          {ticket.currentResult && (
            <div style={{ background: 'var(--bg-page)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Current result</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.currentResult}</div>
            </div>
          )}
          {ticket.expectedResult && (
            <div style={{ background: 'var(--bg-page)', borderRadius: '8px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Expected result</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.expectedResult}</div>
            </div>
          )}

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              ['Assignee', ticket.assignee || 'Unassigned'],
              ['Department', ticket.department || '—'],
              ['Shop', ticket.shop || '—'],
              ['Platforms', ticket.platforms?.join(', ') || '—'],
              ['Created', ticket.created],
              ['Last Updated', ticket.updated],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'var(--bg-page)', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{k}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Activity Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ticket.timeline.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0, marginTop: '3px' }} />
                    {i < ticket.timeline.length - 1 && <div style={{ width: '1px', flex: 1, background: 'var(--border-default)', marginTop: '3px' }} />}
                  </div>
                  <div style={{ paddingBottom: '6px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.action}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{t.date} · {t.actor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message count */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            💬 {ticket.messages?.length || 0} message{ticket.messages?.length !== 1 ? 's' : ''} — open ticket in My Tickets to reply
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ currentUser, setCurrentUser, role, onClose, onLogout }) { // eslint-disable-line no-unused-vars
  const { can, currentRole } = useRbacCtx();
  const canEditOwnProfile = can('users.edit');
  const [form, setForm] = useState({ ...currentUser });
  const initials = form.name.split(' ').map(n => n[0]).join('').toUpperCase();

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const save = () => { setCurrentUser(form); onClose(); };

  return (
    <>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 400, animation: 'fadeIn 0.15s ease' }} />
      <div role="dialog" aria-modal="true" aria-label="Profile" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--bg-surface)', borderRadius: '16px', zIndex: 401,
        width: '400px', maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#111111', padding: '20px 22px 40px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>My Profile</div>
        </div>

        {/* Avatar — overlapping header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-32px', marginBottom: '16px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--accent-primary)', border: '3px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '22px', fontWeight: 900,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>{initials}</div>
        </div>

        {/* Role badge — sourced from the role registry so custom roles
            (Developer, Admin, ...) render correctly, not just superadmin/user. */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: '100px',
            background: (currentRole?.color || 'var(--text-primary)') + '18',
            color: currentRole?.color || 'var(--text-primary)',
            fontSize: '12px', fontWeight: 700,
          }}>
            {currentRole?.label || 'User'}
          </span>
        </div>

        {/* Fields */}
        <div style={{ padding: '0 22px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'department', label: 'Department' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={S.label}>{label}</label>
              {canEditOwnProfile ? (
                <input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={S.input}
                />
              ) : (
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 700, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>{form[key]}</div>
              )}
            </div>
          ))}

          {canEditOwnProfile && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button onClick={onClose} style={S.ghostBtn}>Cancel</button>
              <button onClick={save} style={S.orangeBtn}>Save Changes</button>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <div style={{ padding: '0 22px 22px' }}>
          <div style={{ height: '1px', background: 'var(--bg-hover)', margin: '0 0 16px' }} />
          <button
            onClick={onLogout}
            style={{
              width: '100%', background: 'transparent',
              color: '#DC2626', border: '1.5px solid #DC2626',
              borderRadius: '8px', padding: '10px',
              fontFamily: "'Inter', sans-serif", fontWeight: 700,
              fontSize: '14px', cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

// ─── New Document Modal ───────────────────────────────────────────────────────
function NewDocModal({ onSave, onClose }) {
  const [form, setForm] = useState({ icon: '', title: '', category: '', summary: '', content: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const validate = () => {
    const e = {};
    if (!form.icon.trim()) e.icon = 'Required';
    if (!form.title.trim()) e.title = 'Required';
    if (!form.category.trim()) e.category = 'Required';
    if (!form.summary.trim()) e.summary = 'Required';
    if (!form.content.trim()) e.content = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ id: Date.now(), ...form });
  };

  const err = (k) => errors[k] ? <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px' }}>{errors[k]}</div> : null;

  return (
    <>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 500, animation: 'fadeIn 0.15s ease' }} />
      <div role="dialog" aria-modal="true" aria-label="New document" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--bg-surface)', borderRadius: '16px', zIndex: 501,
        width: '600px', maxWidth: '95vw', maxHeight: '88vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)' }}>Create New Document</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={S.label}>Icon</label>
              <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={2} placeholder="📄" aria-label="Document icon" style={{ ...S.input, textAlign: 'center', fontSize: '20px' }} />
              {err('icon')}
            </div>
            <div>
              <label style={S.label}>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title" aria-label="Document title" style={{ ...S.input, borderColor: errors.title ? '#DC2626' : 'var(--border-default)' }} />
              {err('title')}
            </div>
            <div>
              <label style={S.label}>Category *</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Security" aria-label="Category" style={{ ...S.input, borderColor: errors.category ? '#DC2626' : 'var(--border-default)' }} />
              {err('category')}
            </div>
          </div>
          <div>
            <label style={S.label}>Summary *</label>
            <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="One or two sentences describing the document." aria-label="Document summary" style={{ ...S.textarea, minHeight: '72px', borderColor: errors.summary ? '#DC2626' : 'var(--border-default)' }} />
            {err('summary')}
          </div>
          <div>
            <label style={S.label}>Content * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)' }}>— supports # headings, ## subheadings, - bullet lists, **bold**</span></label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder={'# Document Title\n\n## Section\nYour content here...'} aria-label="Document content (Markdown)" style={{ ...S.textarea, minHeight: '220px', fontFamily: 'monospace', fontSize: '13px', borderColor: errors.content ? '#DC2626' : 'var(--border-default)' }} />
            {err('content')}
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={S.ghostBtn}>Cancel</button>
          <button onClick={handleSave} style={S.orangeBtn}>Create Document</button>
        </div>
      </div>
    </>
  );
}

// ─── Suggestion Components ────────────────────────────────────────────────────
function EditSuggestionModal({ suggestion, onSave, onClose }) {
  const [form, setForm] = useState({ title: suggestion.title, description: suggestion.description });

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 500, animation: 'fadeIn 0.15s ease' }} />
      <div role="dialog" aria-modal="true" aria-label="Edit suggestion" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'var(--bg-surface)', borderRadius: '14px', zIndex: 501,
        width: '480px', maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)' }}>Edit Suggestion</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={S.label}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} aria-label="Suggestion title" style={S.input} />
          </div>
          <div>
            <label style={S.label}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} aria-label="Suggestion description" style={{ ...S.textarea, minHeight: '100px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={onClose} style={S.ghostBtn}>Cancel</button>
            <button onClick={() => onSave({ ...suggestion, ...form })} style={S.orangeBtn}>Save Changes</button>
          </div>
        </div>
      </div>
    </>
  );
}

function SuggestionCard({ suggestion, currentUser, role, onEdit, onDelete }) { // eslint-disable-line no-unused-vars
  const can = useCan();
  const isOwn = suggestion.author === currentUser.name;
  const canEdit = isOwn;
  const canDelete = isOwn || can('tickets.delete');
  const initials = suggestion.author.split(' ').map(n => n[0]).join('').toUpperCase();
  const timeAgo = (() => {
    const diff = Date.now() - new Date(suggestion.timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(suggestion.timestamp).toLocaleDateString();
  })();

  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%', background: '#111111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0,
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{suggestion.author}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {canEdit && (
            <button onClick={() => onEdit(suggestion)} style={{ background: 'none', border: '1.5px solid var(--border-default)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>Edit</button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(suggestion.id)} style={{ background: 'none', border: '1.5px solid #FECACA', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', color: '#DC2626', fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>Delete</button>
          )}
        </div>
      </div>
      <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)' }}>{suggestion.title}</div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{suggestion.description}</div>
    </div>
  );
}

function NewSuggestionForm({ currentUser, onSubmit }) {
  const [form, setForm] = useState({ title: '', description: '' });
  const [errors, setErrors] = useState({});

  const submit = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSubmit({ id: Date.now(), ...form, author: currentUser.name, timestamp: new Date().toISOString() });
    setForm({ title: '', description: '' });
    setErrors({});
  };

  return (
    <div style={{ ...S.card, marginBottom: '16px', background: '#FAFBFF', border: '1.5px solid #BFDBFE' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>💡 Suggest a Documentation Topic</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Topic title — what should be documented?" aria-label="Suggestion title" style={{ ...S.input, borderColor: errors.title ? '#DC2626' : 'var(--border-default)' }} />
          {errors.title && <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '3px' }}>{errors.title}</div>}
        </div>
        <div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what you need — why it would be helpful, who it's for, what it should cover." aria-label="Suggestion description" style={{ ...S.textarea, minHeight: '80px', borderColor: errors.description ? '#DC2626' : 'var(--border-default)' }} />
          {errors.description && <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '3px' }}>{errors.description}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={submit} style={S.orangeBtn}>Post Suggestion</button>
        </div>
      </div>
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────
function HomePage({ setSection, role, currentUser }) { // eslint-disable-line no-unused-vars
  const can = useCan();
  const canViewAll = can('tickets.view_all');
  const open = MOCK_TICKETS.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  const resolved = MOCK_TICKETS.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
  const [activeTicket, setActiveTicket] = useState(null);
  const firstName = currentUser?.name?.split(' ')[0] || 'there';

  // Admin-only stats: critical open, oldest unresolved age, p50 resolution time, SLA breaches
  const adminStats = useMemo(() => {
    if (!canViewAll) return null;
    const now = Date.now();
    const isOpen = t => !DONE_STATUSES.has(t.status);
    const critical = MOCK_TICKETS.filter(t => t.priority === 'Critical' && isOpen(t)).length;
    const unresolved = MOCK_TICKETS.filter(isOpen);
    const oldestAgeDays = unresolved.length === 0 ? 0 : Math.max(...unresolved.map(t => Math.floor((now - new Date(t.created).getTime()) / 86400000)));
    const resolvedTickets = MOCK_TICKETS.filter(t => DONE_STATUSES.has(t.status));
    const avgResolutionDays = resolvedTickets.length === 0 ? 0 :
      Math.round(resolvedTickets.reduce((acc, t) => acc + Math.max(0, (new Date(t.updated) - new Date(t.created)) / 86400000), 0) / resolvedTickets.length);
    const slaBreached = MOCK_TICKETS.filter(t => slaStateFor(t) === 'breached').length;
    const slaAtRisk = MOCK_TICKETS.filter(t => slaStateFor(t) === 'at-risk').length;
    return { critical, oldestAgeDays, avgResolutionDays, unresolvedCount: unresolved.length, slaBreached, slaAtRisk };
  }, [canViewAll]);

  return (
    <div>
      {/* Edge-to-edge hero banner */}
      <div style={{ position: 'relative', left: '50%', transform: 'translateX(-50%)', width: '100vw', marginTop: '-32px', marginBottom: '28px', background: 'linear-gradient(150deg, #111111 0%, #1F0F40 55%, #3F1E80 100%)', padding: '64px 40px 68px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Subtle radial glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 50% 120%, rgba(43,79,138,0.6) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '14px' }}>
            IT Service Management
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
            Pomelo TechOps Portal
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', margin: '0 0 36px', fontWeight: 400 }}>
            Your single hub for IT support, documentation, and service requests.
          </p>
          <button onClick={() => setSection('submit')} style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '100px', padding: '16px 40px', fontFamily: "'Inter', sans-serif", fontWeight: 900, fontSize: '16px', cursor: 'pointer', letterSpacing: '0.01em' }}>
            Submit a Ticket
          </button>
        </div>
      </div>

      {/* Featured docs — visible to everyone when admin pins them */}
      {(() => {
        const featured = listFeaturedDocs();
        if (featured.length === 0) return null;
        return (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📌 Featured by IT</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {featured.slice(0, 3).map(d => (
                <button key={d.id} onClick={() => setSection('docs')} style={{ textAlign: 'left', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px 16px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '22px' }}>{d.icon || '📄'}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                      <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 700, marginTop: '2px' }}>{d.category}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {adminStats && (
        <div style={{ background: 'linear-gradient(135deg, #111111 0%, #000000 100%)', borderRadius: '14px', padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--accent-primary)', borderRadius: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>🛠</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: '14px' }}>Admin dashboard</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: '2px' }}>Live ticket health across the queue</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--accent-primary)', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{adminStats.unresolvedCount}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '3px' }}>Open</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#DC2626', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{adminStats.critical}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '3px' }}>Critical Active</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#FBBF24', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{adminStats.oldestAgeDays}d</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '3px' }}>Oldest Unresolved</div>
              </div>
              <button
                onClick={() => setSection('mytickets')}
                title={`${adminStats.slaBreached} breached + ${adminStats.slaAtRisk} at risk — click for My Tickets`}
                style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
              >
                <div style={{ color: adminStats.slaBreached > 0 ? '#FCA5A5' : '#fff', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>
                  {adminStats.slaBreached}
                  {adminStats.slaAtRisk > 0 && <span style={{ fontSize: '13px', color: '#FBBF24', marginLeft: '4px' }}>+{adminStats.slaAtRisk}</span>}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '3px' }}>SLA Breached</div>
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{adminStats.avgResolutionDays}d</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '3px' }}>Avg Resolution</div>
              </div>
              <button onClick={() => setSection('admin')} style={{ alignSelf: 'center', background: 'rgba(124,58,237,0.2)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: '7px', padding: '8px 14px', fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                Open Console →
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { num: MOCK_TICKETS.length, label: 'Total Tickets', color: 'var(--text-primary)' },
          { num: open, label: 'Active', color: 'var(--accent-primary)' },
          { num: resolved, label: 'Resolved', color: '#16A34A' },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{ ...S.statNum, color: s.color }}>{s.num}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { icon: '🔑', label: 'Password Reset', desc: 'Reset account or MFA', section: 'docs' },
          { icon: '🖥️', label: 'Hardware Request', desc: 'Replacement or loaner', section: 'submit' },
          { icon: '🌐', label: 'VPN Setup', desc: 'Remote access guide', section: 'docs' },
          { icon: '🎟️', label: 'My Tickets', desc: 'View & track requests', section: 'mytickets' },
        ].map(q => (
          <button key={q.label} onClick={() => setSection(q.section)} style={{
            background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)', borderRadius: '10px',
            padding: '16px 20px', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '14px',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(124,58,237,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
          >
            <span style={{ fontSize: '24px' }}>{q.icon}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{q.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{q.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <RecentActivityFeed role={role} onTicket={setActiveTicket} setSection={setSection} />

      {activeTicket && <TicketPopupModal ticket={activeTicket} onClose={() => setActiveTicket(null)} />}
    </div>
  );
}

const PLATFORMS = ['Shopify', 'Lazada', 'Shopee', 'TikTok Shop', 'Amazon', 'Tmall', 'JD.com', 'Nykaa', 'Internal Tools', 'Other'];
const SHOPS = ['Pomelo TH', 'Pomelo MY', 'Pomelo SG', 'Pomelo PH', 'Pomelo ID', 'Pomelo VN', 'All Shops', 'Not Applicable'];
const DEPARTMENTS = ['Marketing', 'Merchandising', 'Tech & Engineering', 'Finance', 'HR & People', 'Operations', 'Creative', 'Customer Experience', 'Leadership', 'Other'];

const EMPTY_FORM = {
  email: '', title: '', description: '', currentResult: '',
  expectedResult: '', platforms: [], shop: '', priority: '',
  department: '', files: [],
  issueType: '', components: [], labels: '',
};

function PlatformCheckbox({ value, selected, onChange }) {
  const checked = selected.includes(value);
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '7px 12px', borderRadius: '7px', cursor: 'pointer',
      background: checked ? 'var(--accent-soft)' : 'var(--bg-page)',
      border: `1.5px solid ${checked ? 'var(--accent-primary)' : 'var(--border-default)'}`,
      fontSize: '13px', color: checked ? 'var(--accent-primary)' : 'var(--text-secondary)',
      fontWeight: checked ? 700 : 400, transition: 'all 0.15s',
      userSelect: 'none',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onChange(value)}
        style={{ display: 'none' }}
      />
      <span style={{
        width: '15px', height: '15px', borderRadius: '4px', flexShrink: 0,
        background: checked ? 'var(--accent-primary)' : '#fff',
        border: `1.5px solid ${checked ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
      </span>
      {value}
    </label>
  );
}

function FieldHint({ text }) {
  return <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '5px', lineHeight: 1.5 }}>{text}</div>;
}

function SubmitPage({ setSection, showToast, currentUser }) { // eslint-disable-line no-unused-vars
  const workflow = useJiraWorkflow();
  const issueTypes = useIssueTypes();
  const components = useComponents();
  const initialStatus = (workflow.statuses.find(s => s.category === 'new') || workflow.statuses[0])?.name || 'To Do';
  const [form, setForm] = useState(EMPTY_FORM);
  const [triage, setTriage] = useState(null); // { priority, reasoning, suggestedDocs, confidence }
  const [triaging, setTriaging] = useState(false);
  const [triageError, setTriageError] = useState('');

  const runTriage = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setTriageError('Add a title and description first.');
      return;
    }
    setTriaging(true);
    setTriageError('');
    setTriage(null);
    try {
      const res = await fetch('/api/v1/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          currentResult: form.currentResult.trim() || undefined,
          expectedResult: form.expectedResult.trim() || undefined,
          docs: listDocSummaries(),
        }),
      });
      if (res.status === 503) {
        setTriageError('AI triage is not configured on the server.');
      } else if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTriageError(err?.error || `HTTP ${res.status}`);
      } else {
        setTriage(await res.json());
      }
    } catch (e) {
      setTriageError(e.message || 'Could not reach triage.');
    } finally {
      setTriaging(false);
    }
  };

  const [showSuggester, setShowSuggester] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  const handleChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePlatform = (p) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p],
    }));
  };

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setForm(f => ({ ...f, files: [...f.files, ...picked] }));
  };

  const removeFile = (idx) => setForm(f => ({ ...f, files: f.files.filter((_, i) => i !== idx) }));

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.title.trim()) e.title = 'Required';
    if (!form.description.trim()) e.description = 'Required';
    if (!form.priority) e.priority = 'Required';
    if (!form.shop) e.shop = 'Required';
    if (!form.department) e.department = 'Required';
    if (form.platforms.length === 0) e.platforms = 'Select at least one platform';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);

  const buildLocalTicket = (id) => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id,
      title: form.title.trim(),
      category: form.category || 'General',
      priority: form.priority || 'Medium',
      status: initialStatus,
      created: today,
      updated: today,
      description: form.description.trim(),
      currentResult: form.currentResult.trim(),
      expectedResult: form.expectedResult.trim(),
      assignee: null,
      department: form.department,
      shop: form.shop,
      platforms: [...form.platforms],
      issueType: form.issueType || null,
      components: [...form.components],
      labels: form.labels.split(',').map(s => s.trim()).filter(Boolean),
      attachmentCount: form.files.length,
      attachments: [], // populated below in submit() once files are read
      timeline: [{ date: today, actor: currentUser?.name || form.email, action: 'Ticket opened' }],
      messages: [],
      internalNotes: [],
      requester: {
        name: currentUser?.name || form.email,
        email: (currentUser?.email || form.email || '').toLowerCase(),
      },
    };
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    let ticketId;
    let jiraKey = null;
    let extraNote = '';

    if (isJiraConfigured()) {
      const result = await createJiraTicket(form);
      if (result.error) {
        setSubmitting(false);
        showToast(`Jira error: ${result.error}`, 'error');
        return;
      }
      ticketId = result.key;
      jiraKey = result.key;
      extraNote = ` (Jira: ${result.url})`;
      // Upload attachments if any
      if (form.files.length > 0) {
        try {
          const payload = {
            files: await Promise.all(form.files.slice(0, 10).map(file => new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result || '';
                const dataBase64 = String(dataUrl).split(',')[1] || '';
                resolve({ filename: file.name, contentType: file.type || 'application/octet-stream', dataBase64 });
              };
              reader.onerror = () => reject(new Error('read'));
              reader.readAsDataURL(file);
            }))),
          };
          await fetch(`/api/v1/jira/issue/${encodeURIComponent(jiraKey)}/attachments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch { /* attachments are best-effort */ }
      }
      setSubmitting(false);
    } else {
      await new Promise(r => setTimeout(r, 400));
      setSubmitting(false);
      const year = new Date().getFullYear();
      const num = String(Math.floor(Math.random() * 9000) + 1000);
      ticketId = `TKT-${year}-${num}`;
    }

    const ticket = buildLocalTicket(ticketId);
    if (jiraKey) {
      ticket.jiraKey = jiraKey;
      ticket.jiraSyncedAt = new Date().toISOString();
      ticket.jiraSyncState = 'synced';
    } else {
      ticket.jiraSyncState = 'local-only';
    }
    // Persist attachments as data URLs (capped per-file) so TicketDetail can
    // preview them. Larger files keep only metadata.
    if (form.files.length > 0) {
      ticket.attachments = await Promise.all(form.files.slice(0, 10).map(fileToAttachment));
    }
    addTicket(ticket);
    showToast(`Your ticket ${ticketId} has been submitted.${extraNote}`);
    setForm(EMPTY_FORM);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSection?.('mytickets');
  };

  const err = (k) => errors[k] ? <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px' }}>{errors[k]}</div> : null;
  const borderOf = (k) => ({ borderColor: errors[k] ? '#DC2626' : 'var(--border-default)' });

  return (
    <div>
      <div style={S.pageTitle}>Submit a Ticket</div>
      <div style={S.pageSub}>Fill in all the details below so the TechOps team can action your request efficiently.</div>

      <div style={{ ...S.card, maxWidth: '760px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Email */}
          <div>
            <label style={S.label}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="your.name@pomelo.com"
              style={{ ...S.input, ...borderOf('email') }}
            />
            <FieldHint text="Your work email address so the team can follow up with you directly." />
            {err('email')}
          </div>

          {/* Title */}
          <div>
            <label style={S.label}>Title *</label>
            <input
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="Short, direct summary of your issue or request"
              style={{ ...S.input, ...borderOf('title') }}
            />
            <FieldHint text={'Keep it concise and specific — e.g. "Product images not uploading on Shopify TH".'} />
            {err('title')}
          </div>

          {/* Description */}
          <div>
            <label style={S.label}>Description *</label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="Describe your issue in full. Include what you've already investigated, any calculations or logic you explored, your own thoughts on the cause, and any relevant context."
              style={{ ...S.textarea, minHeight: '130px', ...borderOf('description') }}
            />
            <FieldHint text="The more detail you add — including your own investigation — the faster we can resolve it." />
            {err('description')}
          </div>

          {/* Current Result */}
          <div>
            <label style={S.label}>Current Result</label>
            <textarea
              value={form.currentResult}
              onChange={e => handleChange('currentResult', e.target.value)}
              placeholder="What is happening right now? Describe the incorrect result or problem you're seeing."
              style={{ ...S.textarea, minHeight: '90px' }}
            />
            <FieldHint text="Skip this if you've already covered it in your description above." />
          </div>

          {/* Expected Result */}
          <div>
            <label style={S.label}>Expected Result</label>
            <textarea
              value={form.expectedResult}
              onChange={e => handleChange('expectedResult', e.target.value)}
              placeholder="What should be happening? What does the correct outcome or solution look like?"
              style={{ ...S.textarea, minHeight: '90px' }}
            />
            <FieldHint text="This tells the tech team exactly what a successful resolution looks like." />
          </div>

          {/* Platform Impacted */}
          <div>
            <label style={S.label}>Platform Impacted *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '2px' }}>
              {PLATFORMS.map(p => (
                <PlatformCheckbox key={p} value={p} selected={form.platforms} onChange={togglePlatform} />
              ))}
            </div>
            <FieldHint text="Select all platforms that are affected by this issue or request." />
            {err('platforms')}
          </div>

          {/* Shop + Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={S.label}>Shop *</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.shop}
                  onChange={e => handleChange('shop', e.target.value)}
                  style={{ ...S.select, ...borderOf('shop') }}
                >
                  <option value="">Select shop</option>
                  {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>▾</span>
              </div>
              <FieldHint text="Which shop is affected or needs to be updated?" />
              {err('shop')}
            </div>
            <div>
              <label style={S.label}>Department *</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.department}
                  onChange={e => handleChange('department', e.target.value)}
                  style={{ ...S.select, ...borderOf('department') }}
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>▾</span>
              </div>
              <FieldHint text="Which department are you part of?" />
              {err('department')}
            </div>
          </div>

          {/* Issue Type (from Jira) */}
          <div>
            <label style={S.label}>Issue Type</label>
            <div style={{ position: 'relative' }}>
              <select
                value={form.issueType}
                onChange={e => handleChange('issueType', e.target.value)}
                style={S.select}
              >
                <option value="">Auto-detect</option>
                {issueTypes.issueTypes.filter(t => !t.subtask).map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>▾</span>
            </div>
            <FieldHint text={issueTypes.source === 'jira' ? `Live from your Jira project (${issueTypes.issueTypes.length} types).` : 'Using fallback types — connect Jira to load your project\'s real types.'} />
          </div>

          {/* Components (from Jira) — only render if any exist */}
          {components.components.length > 0 && (
            <div>
              <label style={S.label}>Components</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {components.components.map(c => {
                  const checked = form.components.includes(c.name);
                  return (
                    <label key={c.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                      background: checked ? 'var(--accent-soft)' : 'var(--bg-page)',
                      border: `1.5px solid ${checked ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      fontSize: '12px', color: checked ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontWeight: checked ? 700 : 400, userSelect: 'none',
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleChange('components', checked ? form.components.filter(x => x !== c.name) : [...form.components, c.name])}
                        style={{ width: '14px', height: '14px' }}
                      />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Labels — free-form, comma-separated */}
          <div>
            <label style={S.label}>Labels</label>
            <input
              type="text"
              value={form.labels}
              onChange={e => handleChange('labels', e.target.value)}
              placeholder="e.g. needs-followup, q2-revenue"
              aria-label="Labels"
              style={{ ...S.input, ...borderOf('labels') }}
            />
            <FieldHint text="Comma-separated tags. Synced to Jira labels on linked tickets." />
          </div>

          {/* Priority */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ ...S.label, marginBottom: 0 }}>Priority *</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={runTriage}
                  disabled={triaging}
                  style={{ background: 'none', border: 'none', color: triaging ? 'var(--text-muted)' : 'var(--accent-primary)', fontSize: '13px', fontWeight: 600, cursor: triaging ? 'wait' : 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <Sparkles size={14} strokeWidth={2} />
                  {triaging ? 'Triaging…' : 'AI Suggest'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuggester(!showSuggester)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  {showSuggester ? 'Hide suggester' : '🧠 Smart Suggester'}
                </button>
              </div>
            </div>
            {triageError && (
              <div style={{ marginBottom: '8px', padding: '8px 12px', background: '#FEF2F2', color: '#B91C1C', borderRadius: '7px', fontSize: '12px', fontWeight: 600 }}>
                ⚠ {triageError}
              </div>
            )}
            {triage && (
              <div style={{ marginBottom: '10px', padding: '12px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>✨ AI suggested</span>
                  <span style={S.badge(PRIORITY_COLORS[triage.priority])}>{triage.priority}</span>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: '#DBEAFE', color: '#1E3A8A', fontWeight: 700 }}>{triage.confidence} confidence</span>
                  <button
                    type="button"
                    onClick={() => { handleChange('priority', triage.priority); }}
                    style={{ marginLeft: 'auto', padding: '5px 12px', background: '#1D4ED8', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Accept
                  </button>
                </div>
                {triage.reasoning && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{triage.reasoning}</div>}
                {triage.suggestedDocs.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>📚 Relevant docs:</span>
                    {triage.suggestedDocs.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSection?.('docs')}
                        style={{ padding: '4px 10px', background: 'var(--bg-surface)', border: '1px solid #BFDBFE', borderRadius: '100px', fontSize: '12px', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {d} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <select
                value={form.priority}
                onChange={e => handleChange('priority', e.target.value)}
                style={{ ...S.select, ...borderOf('priority') }}
              >
                <option value="">Select priority</option>
                {Object.keys(PRIORITY_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>▾</span>
            </div>
            <FieldHint text="Consider business impact, effort required, and deadline. See the Priority Guide for definitions." />
            {err('priority')}
            {showSuggester && (
              <div style={{ marginTop: '10px' }}>
                <PrioritySuggester onSelect={(p) => { handleChange('priority', p); setShowSuggester(false); }} />
              </div>
            )}
            {form.priority && (
              <div style={{ marginTop: '10px', background: PRIORITY_COLORS[form.priority] + '10', border: `1.5px solid ${PRIORITY_COLORS[form.priority]}30`, borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={S.badge(PRIORITY_COLORS[form.priority])}>{form.priority}</span>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Response: <strong>{SLA_DATA.find(s => s.priority === form.priority)?.response}</strong> · Resolution: <strong>{SLA_DATA.find(s => s.priority === form.priority)?.resolution}</strong>
                </div>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label style={S.label}>File Upload</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-default)', borderRadius: '10px', padding: '24px',
                textAlign: 'center', cursor: 'pointer', background: 'var(--bg-page)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📎</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Click to upload files</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Screenshots, exports, spreadsheets — any files that help illustrate the issue</div>
              <input ref={fileInputRef} type="file" multiple onChange={handleFiles} style={{ display: 'none' }} />
            </div>
            {form.files.length > 0 && (
              <SubmitFilesPreview files={form.files} onRemove={removeFile} />
            )}
            <FieldHint text="If you have more files to share, contact the TechOps representative directly and they'll add them to the ticket." />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={() => { setForm(EMPTY_FORM); setErrors({}); if (fileInputRef.current) fileInputRef.current.value = ''; }} disabled={submitting} style={{ ...S.ghostBtn, opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>Clear Form</button>
            <button onClick={submit} disabled={submitting} style={{ ...S.orangeBtn, opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
              {submitting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Submitting…
                </>
              ) : 'Submit Ticket'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function PriorityGuidePage() {
  return (
    <div>
      <div style={S.pageTitle}>Priority Guide</div>
      <div style={S.pageSub}>Use this guide to select the right priority when submitting a ticket.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '720px' }}>
        {[
          {
            priority: 'Critical',
            color: '#DC2626',
            icon: '🚨',
            definition: 'Complete work stoppage affecting one or more teams. Business-critical systems are fully down.',
            examples: ['Production website is down', 'Payment processing is failing', 'All users locked out of a core system'],
            avoid: 'Don\'t use Critical for issues that have workarounds or affect only one person.',
          },
          {
            priority: 'High',
            color: '#EA580C',
            icon: '🔴',
            definition: 'Significant disruption to work with no easy workaround. Time-sensitive impact.',
            examples: ['VPN not working for remote employee with no backup', 'Critical software crash with no alternative', 'Security concern requiring immediate attention'],
            avoid: 'Don\'t use High if there\'s a reasonable workaround available.',
          },
          {
            priority: 'Medium',
            color: '#CA8A04',
            icon: '🟡',
            definition: 'Issue affecting productivity but work can continue. A workaround exists.',
            examples: ['Slow system performance', 'Non-urgent software bugs', 'Peripheral device malfunction with spare available'],
            avoid: 'Don\'t use Medium for requests (e.g., new software installs) — use Low.',
          },
          {
            priority: 'Low',
            color: '#16A34A',
            icon: '🟢',
            definition: 'Minor issues, general requests, or planned tasks with no time pressure.',
            examples: ['New software installation request', 'Hardware upgrade for future use', 'General "how do I" questions'],
            avoid: 'Don\'t use Low if the issue is actively blocking any work.',
          },
        ].map(p => (
          <div key={p.priority} style={{ ...S.card, borderLeft: `4px solid ${p.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '20px' }}>{p.icon}</span>
              <div style={{ fontSize: '18px', fontWeight: 900, color: p.color }}>{p.priority}</div>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>{p.definition}</div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Examples</div>
              {p.examples.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  <span style={{ color: p.color }}>•</span> {e}
                </div>
              ))}
            </div>
            <div style={{ background: '#FFF8F6', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#92400E' }}>
              ⚠️ {p.avoid}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SLAPage() {
  return (
    <div>
      <div style={S.pageTitle}>SLA & Standards</div>
      <div style={S.pageSub}>Our committed response and resolution times for each priority level.</div>

      <div style={{ ...S.card, marginBottom: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                {['Priority', 'Response Time', 'Resolution Target', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLA_DATA.map((row, i) => (
                <tr key={row.priority} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'var(--bg-page)' : 'var(--bg-surface)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={S.badge(row.color)}>{row.priority}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{row.response}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{row.resolution}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, background: '#DCFCE7', padding: '3px 10px', borderRadius: '100px' }}>Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={S.card}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Support Hours</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              ['Monday – Friday', '9:30 AM – 6:30 PM (ICT)'],
              ['Saturday', 'On-call only'],
              ['Sunday & Public Holidays', 'Emergency only'],
              ['Emergency Channel', 'Slack #techops-urgent'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Standards & Compliance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'All tickets acknowledged within SLA response time',
              'Status updates every 4 hours for Critical/High tickets',
              'Root cause analysis provided for all Critical incidents',
              'Monthly SLA report shared with department heads',
              'Escalation to IT Manager after 2× resolution time',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyTicketsPage({ role, currentUser }) { // eslint-disable-line no-unused-vars
  const can = useCan();
  const [, _setTicketsVersion] = useState(0);
  useEffect(() => subscribeTickets(_setTicketsVersion), []);
  const tickets = MOCK_TICKETS;
  const [filter, setFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [staleOnly, setStaleOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const selected = selectedId ? tickets.find(t => t.id === selectedId) : null;
  const [bulkIds, setBulkIds] = useState(new Set());
  const [refreshMsg, setRefreshMsg] = useState('');
  const { addNotification } = useNotifications();

  // "Admin view" of My Tickets — full visibility, priority/stale filters,
  // bulk actions. Anyone with view_all capability gets it; per the design,
  // My Tickets always filters by requester for users without view_all.
  const isAdmin = can('tickets.view_all');
  const workflow = useJiraWorkflow();
  const assignable = useAssignableUsers();
  const STATUS_OPTIONS = workflow.statuses.map(s => s.name);
  const statuses = ['All', ...STATUS_OPTIONS];
  const assignees = useMemo(() => {
    const set = new Set(tickets.map(t => t.assignee).filter(Boolean));
    // Augment with Jira assignable users so admins can re-route to anyone eligible
    for (const u of assignable.users) set.add(u.displayName);
    return ['All', ...Array.from(set).sort(), 'Unassigned'];
  }, [tickets, assignable.users]);

  // Regular users see only tickets they submitted; admins see all.
  const visibleTickets = useMemo(() => {
    if (isAdmin) return tickets;
    const email = currentUser?.email?.toLowerCase();
    return tickets.filter(t => t.requester?.email?.toLowerCase() === email);
  }, [tickets, isAdmin, currentUser?.email]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return visibleTickets.filter(t => {
      if (filter !== 'All' && t.status !== filter) return false;
      if (isAdmin && priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      if (isAdmin && assigneeFilter !== 'All') {
        if (assigneeFilter === 'Unassigned' && t.assignee) return false;
        if (assigneeFilter !== 'Unassigned' && t.assignee !== assigneeFilter) return false;
      }
      if (isAdmin && staleOnly) {
        if (t.status === 'Resolved' || t.status === 'Closed') return false;
        const ageDays = (now - new Date(t.updated).getTime()) / 86400000;
        if (ageDays < 7) return false;
      }
      return true;
    });
  }, [visibleTickets, filter, priorityFilter, assigneeFilter, staleOnly, isAdmin]);

  const handleStatusChange = (id, newStatus) => {
    const ticket = tickets.find(t => t.id === id);
    updateTickets(ts => ts.map(t => t.id === id ? { ...t, status: newStatus, updated: new Date().toISOString().slice(0, 10) } : t));
    if (ticket?.jiraKey) pushJiraTransition(ticket, newStatus);
  };

  const handleAssigneeChange = (id, assignee) => {
    updateTickets(ts => ts.map(t => t.id === id ? { ...t, assignee } : t));
  };

  const toggleBulk = (id) => {
    setBulkIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkSetStatus = (newStatus) => {
    if (bulkIds.size === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const affected = tickets.filter(t => bulkIds.has(t.id));
    updateTickets(ts => ts.map(t => bulkIds.has(t.id) ? { ...t, status: newStatus, updated: today } : t));
    recordAudit('ticket.bulk_status', _currentActor, null, { count: bulkIds.size, status: newStatus });
    // Push Jira transitions for any linked tickets (best-effort, parallel).
    affected.filter(t => t.jiraKey).forEach(t => pushJiraTransition(t, newStatus));
    setBulkIds(new Set());
  };

  const bulkReassign = (assignee) => {
    if (bulkIds.size === 0) return;
    updateTickets(ts => ts.map(t => bulkIds.has(t.id) ? { ...t, assignee } : t));
    recordAudit('ticket.bulk_reassign', _currentActor, null, { count: bulkIds.size, assignee });
    setBulkIds(new Set());
  };

  if (selected) {
    return <TicketDetail ticket={selected} onBack={() => setSelectedId(null)} role={role} currentUser={currentUser} onStatusChange={handleStatusChange} onAssigneeChange={handleAssigneeChange} onAddNotification={addNotification} />;
  }

  return (
    <div>
      <div style={S.pageTitle}>My Tickets</div>
      <div style={S.pageSub}>Track and manage all your IT requests.</div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '7px 14px', borderRadius: '100px', border: '1.5px solid',
            borderColor: filter === s ? 'var(--accent-primary)' : 'var(--border-default)',
            background: filter === s ? 'var(--accent-soft)' : 'var(--bg-surface)',
            color: filter === s ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
          }}>{s}</button>
        ))}
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select aria-label="Filter by priority" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--border-default)', borderRadius: '7px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
            <option value="All">All priorities</option>
            <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
          </select>
          <select aria-label="Filter by assignee" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} style={{ padding: '7px 12px', border: '1.5px solid var(--border-default)', borderRadius: '7px', fontSize: '12px', fontWeight: 700, background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
            {assignees.map(a => <option key={a} value={a}>{a === 'All' ? 'All assignees' : a}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={staleOnly} onChange={e => setStaleOnly(e.target.checked)} aria-label="Show stale tickets only" />
            Stale (no update in 7+ days)
          </label>
          <button
            onClick={async () => {
              setRefreshMsg('Refreshing…');
              const result = await pollJira('PESD1');
              if (!result) { setRefreshMsg('Refresh failed — Jira unreachable.'); return; }
              setRefreshMsg(result.unavailable
                ? 'Jira unavailable — local tickets unchanged.'
                : `Refreshed: ${result.count} updated, ${result.reconciled || 0} reconciled, ${result.imported || 0} imported.`);
              setTimeout(() => setRefreshMsg(''), 5000);
            }}
            style={{ marginLeft: 'auto', padding: '7px 12px', background: '#111111', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            🔄 Refresh from Jira
          </button>
        </div>
      )}
      {isAdmin && refreshMsg && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          {refreshMsg}
        </div>
      )}

      {isAdmin && bulkIds.size > 0 && (
        <div style={{ background: '#111111', color: '#fff', padding: '12px 18px', borderRadius: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>{bulkIds.size} selected</span>
          <select aria-label="Bulk change status" defaultValue="" onChange={e => { if (e.target.value) { bulkSetStatus(e.target.value); e.target.value = ''; } }} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700 }}>
            <option value="" disabled>Change status to…</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Bulk reassign" defaultValue="" onChange={e => { if (e.target.value) { bulkReassign(e.target.value === '__none' ? null : e.target.value); e.target.value = ''; } }} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700 }}>
            <option value="" disabled>Reassign to…</option>
            <option value="__none">Unassigned</option>
            {assignees.filter(a => a !== 'All' && a !== 'Unassigned').map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setBulkIds(new Set())} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 && (
          <div style={{ ...S.card, textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No tickets found.</div>
        )}
        {filtered.map(t => {
          const checked = bulkIds.has(t.id);
          const ageDays = Math.floor((Date.now() - new Date(t.updated).getTime()) / 86400000);
          const isStale = ageDays >= 7 && t.status !== 'Resolved' && t.status !== 'Closed';
          return (
            <div key={t.id} style={{
              ...S.card, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
              borderColor: checked ? 'var(--accent-primary)' : 'var(--border-default)',
            }}>
              {isAdmin && (
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBulk(t.id)}
                  onClick={e => e.stopPropagation()}
                  aria-label={`Select ticket ${t.id}`}
                  style={{ flexShrink: 0, width: '16px', height: '16px', cursor: 'pointer' }}
                />
              )}
              <button onClick={() => setSelectedId(t.id)} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.title}</span>
                  {isAdmin && isStale && <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>Stale {ageDays}d</span>}
                  {isAdmin && <SlaChip ticket={t} />}
                  {isAdmin && <JiraSyncChip ticket={t} />}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {t.id} · {t.category} · Updated {t.updated}{isAdmin && t.assignee && <> · 👤 {t.assignee}</>}
                </div>
              </button>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <span style={S.badge(PRIORITY_COLORS[t.priority])}>{t.priority}</span>
                <span style={{ ...S.badge(statusColorFor(t.status)), background: statusColorFor(t.status) + '18', color: statusColorFor(t.status) }}>{t.status}</span>
                <span style={{ color: 'var(--border-strong)', fontSize: '16px' }}>›</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Admin Kanban ─────────────────────────────────────────────────────────────
function AdminPage() {
  const [, _setTicketsVersion] = useState(0);
  useEffect(() => subscribeTickets(_setTicketsVersion), []);
  const tickets = MOCK_TICKETS;
  const workflow = useJiraWorkflow();
  const kanbanColumns = workflow.statuses.map(s => ({
    id: s.name,
    label: s.name,
    color: statusColorFor(s.name),
    bg: STATUS_BG[statusColorFor(s.name)] || 'var(--bg-hover)',
  }));
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [detailTicket, setDetailTicket] = useState(null);
  const [editingAssignee, setEditingAssignee] = useState(null);

  const visible = tickets.filter(t => {
    const okP = filterPriority === 'All' || t.priority === filterPriority;
    const okA = filterAssignee === 'All'
      || (filterAssignee === 'Unassigned' && !t.assignee)
      || t.assignee === filterAssignee;
    return okP && okA;
  });

  const columnTickets = (colId) => visible.filter(t => t.status === colId);

  const moveTicket = (id, newStatus) => {
    const ticket = tickets.find(t => t.id === id);
    updateTickets(ts => ts.map(t => t.id === id
      ? { ...t, status: newStatus, updated: new Date().toISOString().slice(0, 10) }
      : t
    ));
    if (ticket?.jiraKey) pushJiraTransition(ticket, newStatus);
  };

  const assignTicket = (id, assignee) => {
    updateTickets(ts => ts.map(t => t.id === id ? { ...t, assignee: assignee || null } : t));
    setEditingAssignee(null);
  };

  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colId);
  };

  const onDrop = (e, colId) => {
    e.preventDefault();
    if (dragId) moveTicket(dragId, colId);
    setDragId(null);
    setDragOver(null);
  };

  const onDragEnd = () => { setDragId(null); setDragOver(null); };

  const agentOptions = ['Kai Nguyen', 'Prim Srisawat'];

  const totalOpen = tickets.filter(t => t.status === 'Open').length;
  const totalCritical = tickets.filter(t => t.priority === 'Critical' && (t.status === 'Open' || t.status === 'In Progress')).length;

  return (
    <div>
      {/* System health + maintenance toggle (admin only — gates own access) */}
      <div className="pomelo-stack-on-mobile" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '14px', marginBottom: '22px' }}>
        <SystemHealthCard />
        <MaintenanceToggleCard />
      </div>

      {/* Admin Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #111111 0%, #000000 100%)',
        borderRadius: '14px', padding: '18px 24px', marginBottom: '22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'var(--accent-primary)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🛠</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: '16px' }}>IT Admin — Kanban Board</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: '2px' }}>Drag cards between columns to update status · Click a card to view details</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--accent-primary)', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{totalOpen}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '2px' }}>Open</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#DC2626', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{totalCritical}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '2px' }}>Critical Active</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{tickets.length}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '2px' }}>Total</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filter:</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)} style={{
              padding: '5px 12px', borderRadius: '100px', border: '1.5px solid',
              borderColor: filterPriority === p ? (PRIORITY_COLORS[p] || '#111111') : 'var(--border-default)',
              background: filterPriority === p ? ((PRIORITY_COLORS[p] || '#111111') + '15') : 'var(--bg-surface)',
              color: filterPriority === p ? (PRIORITY_COLORS[p] || '#111111') : 'var(--text-secondary)',
              fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}>{p}</button>
          ))}
        </div>
        <div style={{ width: '1px', height: '18px', background: 'var(--border-default)' }} />
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {['All', ...agentOptions, 'Unassigned'].map(a => (
            <button key={a} onClick={() => setFilterAssignee(a)} style={{
              padding: '5px 12px', borderRadius: '100px', border: '1.5px solid',
              borderColor: filterAssignee === a ? 'var(--text-primary)' : 'var(--border-default)',
              background: filterAssignee === a ? 'var(--accent-soft)' : 'var(--bg-surface)',
              color: filterAssignee === a ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}>{a}</button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', alignItems: 'start' }}>
        {kanbanColumns.map(col => {
          const colTickets = columnTickets(col.id);
          const isDragTarget = dragOver === col.id;
          return (
            <div
              key={col.id}
              onDragOver={e => onDragOver(e, col.id)}
              onDrop={e => onDrop(e, col.id)}
              style={{
                background: isDragTarget ? col.bg : 'var(--bg-hover)',
                borderRadius: '12px',
                border: `2px dashed ${isDragTarget ? col.color : 'transparent'}`,
                minHeight: '400px',
                transition: 'all 0.15s',
              }}
            >
              {/* Column Header */}
              <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{col.label}</span>
                </div>
                <span style={{
                  background: col.color + '20', color: col.color,
                  fontWeight: 700, fontSize: '12px',
                  padding: '2px 8px', borderRadius: '100px',
                }}>{colTickets.length}</span>
              </div>

              {/* Cards */}
              <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {colTickets.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--border-strong)', fontSize: '12px' }}>
                    {isDragTarget ? 'Drop here' : 'No tickets'}
                  </div>
                )}
                {colTickets.map(t => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={e => onDragStart(e, t.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => setDetailTicket(t)}
                    style={{
                      background: dragId === t.id ? 'rgba(255,255,255,0.5)' : 'var(--bg-surface)',
                      borderRadius: '9px',
                      border: '1.5px solid var(--border-default)',
                      padding: '12px 13px',
                      cursor: 'grab',
                      opacity: dragId === t.id ? 0.5 : 1,
                      transition: 'opacity 0.15s, box-shadow 0.15s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                  >
                    {/* Priority + ID */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                      <span style={{ ...S.badge(PRIORITY_COLORS[t.priority]), fontSize: '10px' }}>{t.priority}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{t.id}</span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '8px' }}>
                      {t.title}
                    </div>

                    {/* Meta */}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '9px' }}>
                      {t.category}
                      {t.shop && t.shop !== 'Not Applicable' && ` · ${t.shop}`}
                    </div>

                    {/* Assignee */}
                    <div
                      onClick={e => { e.stopPropagation(); setEditingAssignee(editingAssignee === t.id ? null : t.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      {t.assignee ? (
                        <>
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: '#111111', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {t.assignee.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>{t.assignee}</span>
                        </>
                      ) : (
                        <>
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: 'var(--bg-hover)', border: '1.5px dashed var(--border-strong)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0,
                          }}>+</div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unassigned</span>
                        </>
                      )}
                    </div>

                    {/* Assignee Dropdown */}
                    {editingAssignee === t.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          marginTop: '8px', background: 'var(--bg-surface)', border: '1.5px solid var(--border-default)',
                          borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                          overflow: 'hidden',
                        }}
                      >
                        {[...agentOptions, null].map(a => (
                          <button key={a || 'unassign'} onClick={() => assignTicket(t.id, a)} style={{
                            width: '100%', textAlign: 'left', padding: '8px 12px',
                            background: t.assignee === a ? '#F0F4FF' : 'transparent',
                            border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                            fontSize: '12px', color: a ? '#111111' : 'var(--text-muted)',
                            fontWeight: t.assignee === a ? 700 : 400,
                            display: 'flex', alignItems: 'center', gap: '7px',
                          }}>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                              background: a ? '#111111' : 'var(--bg-hover)',
                              border: a ? 'none' : '1.5px dashed var(--border-strong)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: a ? '#fff' : 'var(--text-muted)', fontSize: '8px', fontWeight: 700,
                            }}>
                              {a ? a.split(' ').map(n => n[0]).join('') : '—'}
                            </div>
                            {a || 'Unassign'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Updated date */}
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '10px', color: 'var(--border-strong)' }}>
                      Updated {t.updated}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick-move modal on card click */}
      {detailTicket && (
        <>
          <div onClick={() => setDetailTicket(null)} style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 300, animation: 'fadeIn 0.15s ease' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'var(--bg-surface)', borderRadius: '16px', zIndex: 301, width: '480px', maxWidth: '95vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ background: '#111111', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '3px', fontWeight: 700 }}>{detailTicket.id}</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>{detailTicket.title}</div>
              </div>
              <button onClick={() => setDetailTicket(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0, marginLeft: '12px' }}>×</button>
            </div>

            <div style={{ padding: '18px 20px' }}>
              {/* Badges */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span style={S.badge(PRIORITY_COLORS[detailTicket.priority])}>{detailTicket.priority}</span>
                <span style={S.badge(STATUS_COLORS[detailTicket.status])}>{detailTicket.status}</span>
                <span style={{ ...S.badge('var(--text-secondary)'), fontSize: '11px' }}>{detailTicket.category}</span>
              </div>

              {/* Description */}
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>{detailTicket.description}</div>

              {/* Meta grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', background: 'var(--bg-page)', borderRadius: '8px', padding: '12px' }}>
                {[
                  ['Assignee', detailTicket.assignee || 'Unassigned'],
                  ['Department', detailTicket.department || '—'],
                  ['Shop', detailTicket.shop || '—'],
                  ['Submitted', detailTicket.created],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{k}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Move to column */}
              <div style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Move to</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {kanbanColumns.map(col => (
                    <button
                      key={col.id}
                      onClick={() => {
                        moveTicket(detailTicket.id, col.id);
                        setDetailTicket(t => ({ ...t, status: col.id }));
                      }}
                      style={{
                        padding: '7px 14px', borderRadius: '7px', border: '1.5px solid',
                        borderColor: detailTicket.status === col.id ? col.color : 'var(--border-default)',
                        background: detailTicket.status === col.id ? col.bg : 'var(--bg-surface)',
                        color: detailTicket.status === col.id ? col.color : 'var(--text-secondary)',
                        fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Users panel (admin only) ─────────────────────────────────────────────────
function UsersPanelPage({ currentUserEmail }) {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeUsers(setVersion), []);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null); // user object being edited
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(null); // user object whose password is being reset
  const [confirm, setConfirm] = useState(null); // { action, user, message }

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listUsers().filter(u => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.active) return false;
      if (statusFilter === 'deactivated' && u.active) return false;
      if (statusFilter === 'never-logged-in' && u.lastLoginAt) return false;
      return true;
    });
  }, [query, roleFilter, statusFilter, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const openTicketCount = (name) =>
    MOCK_TICKETS.filter(t => t.assignee === name && (t.status === 'Open' || t.status === 'In Progress')).length;

  const fmtLogin = (iso) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return d.toISOString().slice(0, 10);
  };

  const StatusChip = ({ user }) => {
    if (!user.active) return <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#FEE2E2', color: '#B91C1C', fontWeight: 700 }}>Deactivated</span>;
    if (!user.lastLoginAt) return <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>Never logged in</span>;
    return <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', fontWeight: 700 }}>Active</span>;
  };

  const handleConfirmed = () => {
    if (!confirm) return;
    const { action, user } = confirm;
    if (action === 'promote') setUserRole(user.id, 'superadmin');
    else if (action === 'demote') setUserRole(user.id, 'user');
    else if (action === 'deactivate') setUserActive(user.id, false);
    else if (action === 'reactivate') setUserActive(user.id, true);
    else if (action === 'forceOtp') forceUserReOtp(user.id);
    setConfirm(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Users</h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Manage portal accounts, roles, and access.</div>
        </div>
        <button
          onClick={() => setCreating(true)}
          style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
        >
          + New user
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search by name or email…"
          aria-label="Search users"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: '1 1 240px', minWidth: '200px', padding: '10px 14px', border: '1.5px solid var(--border-default)', borderRadius: '8px', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
        <select aria-label="Filter by role" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid var(--border-default)', borderRadius: '8px', fontSize: '13px', fontFamily: "'Inter', sans-serif", background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
          <option value="all">All roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="user">User</option>
        </select>
        <select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid var(--border-default)', borderRadius: '8px', fontSize: '13px', fontFamily: "'Inter', sans-serif", background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
          <option value="never-logged-in">Never logged in</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-page)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>User</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Department</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last login</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Open tickets</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.email === currentUserEmail;
                return (
                  <tr key={u.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: u.role === 'superadmin' ? 'var(--accent-primary)' : 'var(--text-muted)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                          {u.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name} {isSelf && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>(you)</span>}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: u.role === 'superadmin' ? 'var(--accent-soft)' : 'var(--bg-hover)', color: u.role === 'superadmin' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 700 }}>
                        {u.role === 'superadmin' ? '⭐ Superadmin' : '👤 User'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{u.department}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>{fmtLogin(u.lastLoginAt)}</td>
                    <td style={{ padding: '14px 16px' }}><StatusChip user={u} /></td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{openTicketCount(u.name)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <UserRowActions
                        user={u}
                        isSelf={isSelf}
                        onEdit={() => setEditing(u)}
                        onResetPassword={() => setResetting(u)}
                        onConfirm={(action, message) => setConfirm({ action, user: u, message })}
                      />
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No users match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {creating && <UserCreateModal onClose={() => setCreating(false)} />}
      {editing && <UserEditModal user={editing} onClose={() => setEditing(null)} />}
      {resetting && <UserResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
      {confirm && (
        <ConfirmDialog
          title={confirm.message.title}
          body={confirm.message.body}
          confirmLabel={confirm.message.confirmLabel}
          confirmStyle={confirm.message.danger ? 'danger' : 'primary'}
          onConfirm={handleConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function UserRowActions({ user, isSelf, onEdit, onResetPassword, onConfirm }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const item = (label, onClick, danger = false) => (
    <button
      key={label}
      role="menuitem"
      onClick={() => { setOpen(false); onClick(); }}
      style={{ width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', color: danger ? '#B91C1C' : 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', borderRadius: '6px' }}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Actions for ${user.name}`}
        aria-expanded={open}
        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}
      >
        Actions ▾
      </button>
      {open && (
        <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: '200px', background: 'var(--bg-surface)', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', padding: '4px', zIndex: 100, textAlign: 'left' }}>
          {item('Edit details', onEdit)}
          {item(user.role === 'superadmin' ? 'Demote to user' : 'Promote to superadmin', () =>
            onConfirm(user.role === 'superadmin' ? 'demote' : 'promote', {
              title: user.role === 'superadmin' ? 'Demote to regular user?' : 'Promote to superadmin?',
              body: user.role === 'superadmin'
                ? `${user.name} will lose admin powers immediately.`
                : `${user.name} will gain admin powers including the Users panel.`,
              confirmLabel: user.role === 'superadmin' ? 'Demote' : 'Promote',
              danger: user.role === 'superadmin',
            })
          )}
          {item('Reset password', onResetPassword)}
          {item('Force re-OTP on next login', () =>
            onConfirm('forceOtp', {
              title: 'Force re-OTP?',
              body: `${user.name} will be required to re-verify via OTP on their next login.`,
              confirmLabel: 'Force re-OTP',
            })
          )}
          {!isSelf && item(
            user.active ? 'Deactivate account' : 'Reactivate account',
            () => onConfirm(user.active ? 'deactivate' : 'reactivate', {
              title: user.active ? 'Deactivate this account?' : 'Reactivate this account?',
              body: user.active
                ? `${user.name} will be blocked from logging in until reactivated.`
                : `${user.name} will be able to log in again.`,
              confirmLabel: user.active ? 'Deactivate' : 'Reactivate',
              danger: user.active,
            }),
            user.active
          )}
        </div>
      )}
    </div>
  );
}

function UserCreateModal({ onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('IT & Technology');
  const [role, setRole] = useState('user');
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');
  const panelRef = useRef(null);
  useModalFocusTrap(panelRef);

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const submit = async e => {
    e.preventDefault();
    const res = await adminCreateUser({ name, email, role, department, tempPassword });
    if (res.error) { setError(res.error); return; }
    onClose();
  };

  return (
    <>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 500 }} />
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Create user" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-surface)', borderRadius: '14px', zIndex: 501, width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden', outline: 'none' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Create user</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField label="Full name"><input aria-label="Full name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></FormField>
          <FormField label="Email"><input aria-label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} /></FormField>
          <FormField label="Department"><input aria-label="Department" value={department} onChange={e => setDepartment(e.target.value)} style={inputStyle} /></FormField>
          <FormField label="Role">
            <select aria-label="Role" value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
              <option value="user">User</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </FormField>
          <FormField label="Temporary password" hint="At least 8 characters. User must change it on first login."><input aria-label="Temporary password" type="text" value={tempPassword} onChange={e => setTempPassword(e.target.value)} style={inputStyle} /></FormField>
          {error && <div style={{ padding: '10px 12px', background: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>{error}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
            <button type="submit" style={primaryBtn}>Create</button>
          </div>
        </form>
      </div>
    </>
  );
}

function UserEditModal({ user, onClose }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [department, setDepartment] = useState(user.department);
  const panelRef = useRef(null);
  useModalFocusTrap(panelRef);

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const submit = e => {
    e.preventDefault();
    updateUser(user.id, { name: name.trim(), email: email.trim().toLowerCase(), department: department.trim() });
    onClose();
  };

  return (
    <>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 500 }} />
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Edit ${user.name}`} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-surface)', borderRadius: '14px', zIndex: 501, width: '440px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden', outline: 'none' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Edit user</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormField label="Full name"><input aria-label="Full name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></FormField>
          <FormField label="Email"><input aria-label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} /></FormField>
          <FormField label="Department"><input aria-label="Department" value={department} onChange={e => setDepartment(e.target.value)} style={inputStyle} /></FormField>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
            <button type="submit" style={primaryBtn}>Save</button>
          </div>
        </form>
      </div>
    </>
  );
}

function UserResetPasswordModal({ user, onClose }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const panelRef = useRef(null);
  useModalFocusTrap(panelRef);

  useEffect(() => {
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const submit = async e => {
    e.preventDefault();
    if (pw.length < 8) { setError('Temp password must be at least 8 characters.'); return; }
    await resetUserPassword(user.id, pw);
    setDone(true);
  };

  return (
    <>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 500 }} />
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Reset password for ${user.name}`} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-surface)', borderRadius: '14px', zIndex: 501, width: '440px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden', outline: 'none' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-default)' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Reset password — {user.name}</h2>
        </div>
        {done ? (
          <div style={{ padding: '20px 22px' }}>
            <div style={{ padding: '12px 14px', background: '#ECFDF5', color: '#065F46', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
              ✓ Password reset. Share this temp password with {user.name} via a secure channel. They will be prompted to re-verify via OTP on next login.
            </div>
            <div style={{ background: 'var(--bg-page)', padding: '12px 14px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{pw}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button onClick={onClose} style={primaryBtn}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormField label="New temporary password" hint="At least 8 characters. User must change on next login.">
              <input aria-label="Temporary password" type="text" value={pw} onChange={e => setPw(e.target.value)} style={inputStyle} autoFocus />
            </FormField>
            {error && <div style={{ padding: '10px 12px', background: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>{error}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
              <button type="submit" style={primaryBtn}>Reset</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

// Radix AlertDialog — destructive-action confirmation with full a11y, focus
// trap, ESC and click-outside handling for free.
function ConfirmDialog({ title, body, confirmLabel, confirmStyle, onConfirm, onCancel }) {
  const confirmBg = confirmStyle === 'danger' ? '#B91C1C' : 'var(--accent-primary)';
  return (
    <AlertDialog.Root open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 600, animation: 'radixIn 150ms cubic-bezier(0.16,1,0.3,1)' }} />
        <AlertDialog.Content style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xl)',
          zIndex: 601, width: '440px', maxWidth: '95vw',
          boxShadow: 'var(--shadow-modal)', overflow: 'hidden', outline: 'none',
          fontFamily: "'Inter', sans-serif",
          animation: 'radixIn 180ms cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div style={{ padding: '22px 24px 4px' }}>
            <AlertDialog.Title style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</AlertDialog.Title>
            <AlertDialog.Description style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.55 }}>{body}</AlertDialog.Description>
          </div>
          <div style={{ padding: '16px 24px 20px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <AlertDialog.Cancel asChild>
              <button onClick={onCancel} style={ghostBtn}>Cancel</button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button onClick={onConfirm} style={{ ...primaryBtn, background: confirmBg }}>{confirmLabel}</button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

const FormField = ({ label, hint, children }) => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
    {children}
    {hint && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{hint}</span>}
  </label>
);

const inputStyle = { padding: '10px 14px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)' };
const ghostBtn = { padding: '9px 16px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" };
const primaryBtn = { padding: '9px 18px', background: 'var(--accent-primary)', color: 'var(--text-inverse)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" };

// ─── System health card (admin only) ──────────────────────────────────────────
function SystemHealthCard() {
  const [state, setState] = useState({ loading: true, ok: false, jira: false, anthropic: false, ts: null });
  const webhook = useWebhookState();
  const workflow = useJiraWorkflow();
  const assignable = useAssignableUsers();

  const refresh = async () => {
    try {
      const res = await fetch('/api/v1/admin-status');
      if (!res.ok) throw new Error('http ' + res.status);
      const d = await res.json();
      setState({ loading: false, ok: true, jira: d.jira, anthropic: d.anthropic, ts: d.ts });
    } catch {
      setState({ loading: false, ok: false, jira: false, anthropic: false, ts: null });
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  const dot = (active) => ({ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: active ? '#16A34A' : '#DC2626', marginRight: '8px' });
  const amber = { display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', marginRight: '8px' };
  const webhookFresh = webhook.lastWebhookAt && (Date.now() - new Date(webhook.lastWebhookAt).getTime()) < 5 * 60_000;

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '16px 18px', border: '1px solid var(--border-default)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>System health</div>
        <button onClick={refresh} aria-label="Refresh system health" style={{ fontSize: '11px', padding: '4px 10px', background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 700 }}>↻ Refresh</button>
      </div>
      {state.loading ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Checking…</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li style={{ fontSize: '13px', color: 'var(--text-primary)' }}><span style={dot(state.ok)} />BFF proxy {state.ok ? 'reachable' : 'unreachable'}</li>
          <li style={{ fontSize: '13px', color: 'var(--text-primary)' }}><span style={dot(state.ok && state.jira)} />Jira integration {state.ok && state.jira ? 'configured' : 'not configured'}</li>
          <li style={{ fontSize: '13px', color: 'var(--text-primary)' }}><span style={dot(state.ok && state.anthropic)} />Anthropic API {state.ok && state.anthropic ? 'configured' : 'not configured'}</li>
          <li style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            <span style={webhook.lastWebhookAt ? (webhookFresh ? dot(true) : amber) : dot(false)} />
            Webhooks {webhook.lastWebhookAt ? `(last ${new Date(webhook.lastWebhookAt).toLocaleTimeString()})` : 'never received'}
          </li>
          <li style={{ fontSize: '13px', color: 'var(--text-primary)' }}><span style={dot(workflow.source !== 'fallback')} />Workflow {workflow.source === 'fallback' ? 'using fallback' : `live (${workflow.statuses.length} statuses)`}</li>
          <li style={{ fontSize: '13px', color: 'var(--text-primary)' }}><span style={dot(assignable.source !== 'fallback' && assignable.users.length > 0)} />Assignable users {assignable.users.length > 0 ? `(${assignable.users.length} from Jira)` : 'using seed list'}</li>
        </ul>
      )}
      {state.ts && <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>Last checked {new Date(state.ts).toLocaleTimeString()}</div>}
    </div>
  );
}

// ─── Maintenance mode toggle (admin only) ─────────────────────────────────────
function MaintenanceToggleCard() {
  const [m, setM] = useState(getMaintenanceMode());
  const [draft, setDraft] = useState(m.message || 'Scheduled maintenance in progress.');
  useEffect(() => subscribeMaintenance(setM), []);

  const toggle = () => {
    if (m.active) {
      setMaintenanceMode(false, '', _currentActor);
    } else {
      setMaintenanceMode(true, draft, _currentActor);
    }
  };

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', padding: '16px 18px', border: '1px solid var(--border-default)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Maintenance mode</div>
        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: m.active ? '#FEE2E2' : '#DCFCE7', color: m.active ? '#B91C1C' : '#15803D', fontWeight: 700 }}>
          {m.active ? 'ON' : 'OFF'}
        </span>
      </div>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        disabled={m.active}
        aria-label="Maintenance message"
        rows={2}
        placeholder="Banner message users will see…"
        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid var(--border-default)', borderRadius: '7px', fontSize: '12px', fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none', background: m.active ? 'var(--bg-hover)' : 'var(--bg-input)', color: m.active ? 'var(--text-muted)' : 'var(--text-primary)' }}
      />
      <button
        onClick={toggle}
        style={{ marginTop: '10px', width: '100%', padding: '9px', background: m.active ? '#DC2626' : '#111111', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
      >
        {m.active ? 'Disable maintenance mode' : 'Enable maintenance mode'}
      </button>
      {m.active && m.enabledBy && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Enabled by {m.enabledBy} at {new Date(m.enabledAt).toLocaleTimeString()}</div>}
    </div>
  );
}

// ─── Global search palette (Cmd/Ctrl+K) ───────────────────────────────────────
function GlobalSearchPalette({ open, onClose, onNavigate, role }) { // eslint-disable-line no-unused-vars
  const can = useCan();
  const [q, setQ] = useState('');
  const [, _setVer] = useState(0);
  useEffect(() => subscribeTickets(_setVer), []);
  useEffect(() => subscribeUsers(_setVer), []);

  useEffect(() => {
    if (open) setQ('');
    const handleKey = e => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return { docs: [], tickets: [], users: [] };
    const isAdmin = can('users.edit');

    const docs = listDocSummaries()
      .filter(d => d.title.toLowerCase().includes(query) || d.description.toLowerCase().includes(query) || d.category.toLowerCase().includes(query))
      .slice(0, 5);

    const tickets = MOCK_TICKETS
      .filter(t => t.id.toLowerCase().includes(query) || t.title.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query))
      .slice(0, 5);

    const users = isAdmin
      ? listUsers()
          .filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
          .slice(0, 5)
      : [];

    return { docs, tickets, users };
  }, [q, role]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const totalCount = results.docs.length + results.tickets.length + results.users.length;

  return (
    <>
      <div onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,54,0.55)', zIndex: 700 }} />
      <div role="dialog" aria-modal="true" aria-label="Search portal" style={{
        position: 'fixed', top: '12vh', left: '50%', transform: 'translateX(-50%)',
        width: '600px', maxWidth: '94vw', background: 'var(--bg-surface)', borderRadius: '14px',
        boxShadow: '0 24px 72px rgba(0,0,0,0.28)', zIndex: 701,
        display: 'flex', flexDirection: 'column', maxHeight: '70vh', overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          <input
            autoFocus
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search docs, tickets, users…"
            aria-label="Global search"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', fontFamily: "'Inter', sans-serif", color: 'var(--text-primary)', background: 'transparent' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 6px', background: 'var(--bg-hover)', borderRadius: '4px', fontWeight: 700 }}>ESC</span>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {q.trim() === '' ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Start typing to search across the portal. <br />Tip: use <strong>⌘K</strong> / <strong>Ctrl+K</strong> from anywhere.
            </div>
          ) : totalCount === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No matches for "{q}".</div>
          ) : (
            <>
              {results.docs.length > 0 && (
                <ResultsGroup
                  label="Documents"
                  icon="📚"
                  items={results.docs.map(d => ({ key: d.title, title: d.title, sub: `${d.category} · ${d.description.slice(0, 80)}` }))}
                  onPick={() => { onNavigate('docs'); onClose(); }}
                />
              )}
              {results.tickets.length > 0 && (
                <ResultsGroup
                  label="Tickets"
                  icon="🎟️"
                  items={results.tickets.map(t => ({ key: t.id, title: t.title, sub: `${t.id} · ${t.priority} · ${t.status}` }))}
                  onPick={() => { onNavigate('mytickets'); onClose(); }}
                />
              )}
              {results.users.length > 0 && (
                <ResultsGroup
                  label="Users"
                  icon="👥"
                  items={results.users.map(u => ({ key: u.id, title: u.name, sub: `${u.email} · ${u.role}` }))}
                  onPick={() => { onNavigate('users'); onClose(); }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ResultsGroup({ label, icon, items, onPick }) {
  return (
    <div style={{ padding: '6px 8px' }}>
      <div style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon} {label}
      </div>
      {items.map(it => (
        <button
          key={it.key}
          onClick={onPick}
          style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: "'Inter', sans-serif" }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-page)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{it.title}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{it.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Chat assistant widget (all authenticated users) ─────────────────────────
function ChatAssistantWidget({ effectiveUser, effectiveRole }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', content}
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sessionIdRef = useRef(null);
  const scrollRef = useRef(null);

  // Reset conversation when the effective user changes (login / view-as switch)
  useEffect(() => {
    setMessages([]);
    setError('');
    sessionIdRef.current = null;
  }, [effectiveUser?.email, effectiveRole]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const buildUserContext = () => {
    if (!effectiveUser) return undefined;
    const openTickets = MOCK_TICKETS
      .filter(t => t.assignee === effectiveUser.name && (t.status === 'Open' || t.status === 'In Progress'))
      .slice(0, 10)
      .map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority }));
    return {
      name: effectiveUser.name,
      role: effectiveRole === 'superadmin' ? 'superadmin' : 'user',
      openTickets,
    };
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setError('');
    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setDraft('');
    setBusy(true);

    // Start a chat session lazily on first message
    if (!sessionIdRef.current) {
      sessionIdRef.current = startChatSession({
        userName: effectiveUser?.name,
        userEmail: effectiveUser?.email,
        userRole: effectiveRole,
      });
    }
    appendChatMessage(sessionIdRef.current, 'user', text);

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          userContext: buildUserContext(),
          portalContext: { docs: listDocSummaries() },
        }),
      });
      if (res.status === 503) {
        setError('The chat assistant is not configured on the server.');
        setBusy(false);
        return;
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const reply = (data.reply || '').trim() || '(no reply)';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      appendChatMessage(sessionIdRef.current, 'assistant', reply);
    } catch (e) {
      setError(e.message || 'Could not reach the chat assistant.');
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat assistant"
          style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 950,
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--accent-primary)', color: '#fff', border: 'none',
            boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
            cursor: 'pointer', fontSize: '24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          💬
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="TechOps assistant"
          style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 950,
            width: '380px', maxWidth: 'calc(100vw - 32px)',
            height: '540px', maxHeight: 'calc(100vh - 80px)',
            background: 'var(--bg-surface)', borderRadius: '14px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div style={{ background: '#111111', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>💬</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>TechOps Assistant</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Ask anything about the portal or IT</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', padding: '24px 16px' }}>
                Hi{effectiveUser?.name ? ` ${effectiveUser.name.split(' ')[0]}` : ''} 👋<br />
                Ask me how the portal works, where to find a doc, or anything IT-related.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '9px 13px', borderRadius: '12px',
                  background: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  border: m.role === 'assistant' ? '1px solid var(--border-default)' : 'none',
                  boxShadow: m.role === 'assistant' ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '9px 13px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Thinking…
                </div>
              </div>
            )}
            {error && (
              <div role="alert" style={{ background: '#FEF2F2', color: '#B91C1C', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>
                ⚠ {error}
              </div>
            )}
          </div>

          <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-default)', display: 'flex', gap: '8px' }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a question…"
              aria-label="Type a question"
              rows={1}
              style={{ flex: 1, padding: '9px 12px', border: '1.5px solid var(--border-default)', borderRadius: '8px', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'none', maxHeight: '120px', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={send}
              disabled={!draft.trim() || busy}
              aria-label="Send message"
              style={{ padding: '9px 14px', background: !draft.trim() || busy ? 'var(--border-strong)' : 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: !draft.trim() || busy ? 'not-allowed' : 'pointer' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Maintenance banner — fixed top of app when active ────────────────────────
function MaintenanceBanner() {
  const [m, setM] = useState(getMaintenanceMode());
  useEffect(() => subscribeMaintenance(setM), []);
  if (!m.active) return null;
  return (
    <div role="status" style={{ background: '#FEF3C7', borderBottom: '2px solid #FDE68A', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Inter', sans-serif" }}>
      <span style={{ fontSize: '16px' }}>🛠</span>
      <div style={{ flex: 1, fontSize: '13px', color: '#92400E', fontWeight: 700 }}>
        {m.message}
        {m.enabledBy && <span style={{ marginLeft: '8px', fontWeight: 400 }}>— posted by {m.enabledBy}</span>}
      </div>
    </div>
  );
}

// ─── Chat logs page (admin only) ──────────────────────────────────────────────
function ChatLogsPage() {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeChat(() => setVersion(v => v + 1)), []);
  const [active, setActive] = useState(null);

  const sessions = useMemo(() => listChatSessions(), [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmtTs = iso => new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Chat logs</h1>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Every user conversation with the TechOps assistant. Used to tune the bot and decide future caps.</div>
      </div>

      {sessions.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-default)' }}>
          📭 No chat sessions yet. They'll appear here as users start chatting.
        </div>
      ) : (
        <div className="pomelo-audit-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) 1fr', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-default)', overflow: 'hidden', maxHeight: '70vh', overflowY: 'auto' }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {sessions.map(s => {
                const isActive = active?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setActive(s)}
                      style={{ width: '100%', textAlign: 'left', border: 'none', borderTop: '1px solid var(--border-subtle)', background: isActive ? 'var(--accent-soft)' : 'var(--bg-surface)', padding: '12px 16px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{s.userName}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fmtTs(s.startedAt)}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {s.messages.length} message{s.messages.length === 1 ? '' : 's'}{s.userRole === 'superadmin' ? ' · admin' : ''}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-default)', padding: '18px', minHeight: '320px' }}>
            {active ? (
              <>
                <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{active.userName} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>· {active.userEmail || 'no email'}</span></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Started {fmtTs(active.startedAt)} · {active.messages.length} messages</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {active.messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%', padding: '9px 13px', borderRadius: '12px',
                        background: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-hover)',
                        color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                        fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.5,
                      }}>
                        {m.content}
                        <div style={{ fontSize: '10px', color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: '4px' }}>{fmtTs(m.ts)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Select a session on the left to read the conversation.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit log page (admin only) ──────────────────────────────────────────────
function AuditLogPage() {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeAudit(setVersion), []);
  const [actionFilter, setActionFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [query, setQuery] = useState('');

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listAudit().filter(e => {
      if (actionFilter !== 'all' && !e.action.startsWith(actionFilter)) return false;
      if (actorFilter !== 'all' && e.actorEmail !== actorFilter) return false;
      if (q) {
        const hay = `${e.action} ${e.actorName} ${e.targetLabel || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [actionFilter, actorFilter, query, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const uniqueActors = useMemo(() => {
    const m = new Map();
    listAudit().forEach(e => m.set(e.actorEmail, e.actorName));
    return Array.from(m.entries());
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmtTs = iso => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
  };

  const actionLabel = a => {
    const map = {
      'user.create': '➕ User created',
      'user.update': '✏️ User edited',
      'user.promote': '⬆️ Promoted to superadmin',
      'user.demote': '⬇️ Demoted to user',
      'user.deactivate': '🚫 User deactivated',
      'user.reactivate': '✅ User reactivated',
      'user.force_re_otp': '🔁 Force re-OTP',
      'user.reset_password': '🔑 Password reset',
      'admin.view_as': '👁 View-as switched',
      'session.login': '🔓 Admin login',
      'session.logout': '🔒 Admin logout',
    };
    return map[a] || a;
  };

  const renderDetails = e => {
    if (!e.details) return null;
    if (e.action === 'admin.view_as') {
      return e.details.mode === 'user'
        ? <span>switched to <strong>regular-user view</strong></span>
        : <span>impersonating <strong>{e.details.targetName}</strong></span>;
    }
    if (e.action === 'user.promote' || e.action === 'user.demote') {
      return <span>{e.details.from} → <strong>{e.details.to}</strong></span>;
    }
    if (e.action === 'user.update' && Array.isArray(e.details.changedKeys)) {
      return <span>changed {e.details.changedKeys.join(', ')}</span>;
    }
    if (e.action === 'user.create' && e.details.role) {
      return <span>as <strong>{e.details.role}</strong> in {e.details.department}</span>;
    }
    return null;
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Audit log</h1>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Append-only record of admin actions. Entries are immutable (charter R-10).</div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Search action / actor / target…"
          aria-label="Search audit log"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: '1 1 240px', minWidth: '200px', padding: '10px 14px', border: '1.5px solid var(--border-default)', borderRadius: '8px', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
        />
        <select aria-label="Filter by category" value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid var(--border-default)', borderRadius: '8px', fontSize: '13px', fontFamily: "'Inter', sans-serif", background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
          <option value="all">All categories</option>
          <option value="user">User actions</option>
          <option value="admin">Admin/view-as</option>
          <option value="session">Sessions</option>
        </select>
        <select aria-label="Filter by actor" value={actorFilter} onChange={e => setActorFilter(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid var(--border-default)', borderRadius: '8px', fontSize: '13px', fontFamily: "'Inter', sans-serif", background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
          <option value="all">All actors</option>
          {uniqueActors.map(([email, name]) => <option key={email} value={email}>{name}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--bg-surface)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
        {entries.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No audit entries yet. Mutations from the Users panel will appear here.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {entries.map(e => (
              <li key={e.id} style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '150px', fontFamily: 'monospace' }}>{fmtTs(e.ts)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>{actionLabel(e.action)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    <strong>{e.actorName}</strong>
                    {e.targetLabel && <> · target: <strong>{e.targetLabel}</strong></>}
                    {renderDetails(e) && <> · {renderDetails(e)}</>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Resources dropdown (groups reference pages) ─────────────────────────────
const RESOURCE_ITEMS = [
  { id: 'docs',     Icon: BookOpen,      label: 'Documentation',   hint: 'IT guides and how-tos' },
  { id: 'priority', Icon: Target,        label: 'Priority Guide',  hint: 'P0–P3 definitions' },
  { id: 'sla',      Icon: ClipboardList, label: 'SLA & Standards', hint: 'Response and resolution targets' },
];

// ─── Shared style for Radix DropdownMenu surfaces ────────────────────────────
const radixMenuContentStyle = {
  minWidth: '240px',
  background: 'var(--bg-elevated)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-dropdown)',
  padding: '6px',
  border: '1px solid var(--border-default)',
  zIndex: 1000,
  fontFamily: "'Inter', sans-serif",
};
const radixMenuItemStyle = (isActive) => ({
  width: '100%', textAlign: 'left',
  background: isActive ? 'var(--accent-soft)' : 'transparent',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '10px',
  fontSize: '13px',
  outline: 'none',
  userSelect: 'none',
});

function ResourcesDropdown({ section, onPick }) {
  const active = RESOURCE_ITEMS.find(r => r.id === section);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Resources"
          title={active ? `Resources · ${active.label}` : 'Resources'}
          style={{
            ...S.navTab(Boolean(active)),
            display: 'flex', alignItems: 'center', gap: '5px',
          }}
        >
          <BookOpen size={15} strokeWidth={2} />
          <span className="pomelo-btn-label">{active ? active.label : 'Resources'}</span>
          <ChevronDown size={13} strokeWidth={2.4} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} align="start" style={radixMenuContentStyle}>
          {RESOURCE_ITEMS.map(r => {
            const isActive = section === r.id;
            return (
              <DropdownMenu.Item key={r.id} onSelect={() => onPick(r.id)} style={radixMenuItemStyle(isActive)}>
                <span style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' }}><r.Icon size={16} strokeWidth={2} /></span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: isActive ? 600 : 500, color: 'var(--text-primary)' }}>{r.label}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{r.hint}</div>
                </span>
                {isActive && <Check size={14} strokeWidth={2.4} style={{ color: 'var(--accent-primary)' }} />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Theme toggle button (light / dark) ──────────────────────────────────────
// Lives in the nav between the notification bell and the avatar. Visible to
// every authenticated user — theme is a personal preference, not gated by role.
function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          onClick={toggleTheme}
          aria-label={label}
          className="pomelo-icon-btn"
          style={{
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            lineHeight: 1,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '32px',
          }}
        >
          {isDark ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content sideOffset={6} style={tooltipContentStyle}>{label}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

const tooltipContentStyle = {
  background: 'var(--text-primary)',
  color: 'var(--bg-surface)',
  padding: '5px 9px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '11.5px',
  fontFamily: "'Inter', sans-serif",
  fontWeight: 500,
  letterSpacing: '0.005em',
  zIndex: 1100,
  boxShadow: 'var(--shadow-card)',
};

// ─── Admin tools dropdown ────────────────────────────────────────────────────
// Groups the four admin-only destinations behind a single nav button to
// reclaim space and keep related actions together.
const ADMIN_TOOLS = [
  { id: 'admin',    Icon: Wrench,        label: 'Admin Console',  hint: 'Kanban + system controls',   cap: 'admin.kanban_view' },
  { id: 'users',    Icon: UsersIcon,     label: 'Users',           hint: 'Manage portal accounts',     cap: 'users.edit' },
  { id: 'audit',    Icon: ScrollText,    label: 'Audit log',       hint: 'Immutable action history',   cap: 'audit.view' },
  { id: 'chatlogs', Icon: MessageCircle, label: 'Chat logs',       hint: 'AI assistant conversations', cap: 'chatlogs.view' },
];

function AdminToolsDropdown({ section, onPick }) {
  const can = useCan();
  const items = ADMIN_TOOLS.filter(t => can(t.cap));
  const active = items.find(t => t.id === section);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Admin tools"
          title={active ? `Admin · ${active.label}` : 'Admin tools'}
          className="pomelo-icon-btn"
          style={{
            padding: '6px 13px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            background: active ? 'var(--accent-primary)' : 'var(--accent-soft)',
            color: active ? 'var(--text-inverse)' : 'var(--accent-primary)',
            fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '5px',
          }}
        >
          <Wrench size={15} strokeWidth={2} />
          <span className="pomelo-btn-label">{active ? active.label : 'Admin'}</span>
          <ChevronDown size={13} strokeWidth={2.4} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} align="end" style={radixMenuContentStyle}>
          {items.map(t => {
            const isActive = section === t.id;
            return (
              <DropdownMenu.Item key={t.id} onSelect={() => onPick(isActive ? 'home' : t.id)} style={radixMenuItemStyle(isActive)}>
                <span style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' }}><t.Icon size={16} strokeWidth={2} /></span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontWeight: isActive ? 600 : 500, color: 'var(--text-primary)' }}>{t.label}</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.hint}</div>
                </span>
                {isActive && <Check size={14} strokeWidth={2.4} style={{ color: 'var(--accent-primary)' }} />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Admin View Mode pill ─────────────────────────────────────────────────────
// Visible only to real superadmins. Lets them downgrade their view to "regular
// user" or impersonate a specific user without changing the underlying session.
function AdminViewModePill({ viewAs, onSet, allUsers, currentUserName }) {
  const LabelIcon = viewAs === null ? Star : viewAs === 'user' ? User : Eye;
  const labelTextOnly =
    viewAs === null ? 'Admin Mode'
    : viewAs === 'user' ? 'User View'
    : `Viewing as ${viewAs.name.split(' ')[0]}`;
  const labelColor = viewAs === null ? 'var(--accent-primary)' : '#D97706';
  const borderColor = viewAs === null ? 'var(--accent-primary)' : '#F59E0B';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Switch admin view mode"
          title={labelTextOnly}
          className="pomelo-icon-btn"
          style={{
            padding: '6px 12px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${borderColor}`,
            background: 'var(--bg-elevated)', color: labelColor,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
          }}
        >
          <LabelIcon size={14} strokeWidth={2} />
          <span className="pomelo-btn-label">{labelTextOnly}</span>
          <ChevronDown size={13} strokeWidth={2.4} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content sideOffset={6} align="end" style={radixMenuContentStyle}>
          <DropdownMenu.Label style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>View Mode</DropdownMenu.Label>
          <DropdownMenu.Item onSelect={() => onSet(null)} style={radixMenuItemStyle(viewAs === null)}>
            <Star size={14} strokeWidth={2} style={{ color: viewAs === null ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
            <span style={{ flex: 1, fontWeight: viewAs === null ? 600 : 500 }}>Admin (default)</span>
            {viewAs === null && <Check size={14} strokeWidth={2.4} style={{ color: 'var(--accent-primary)' }} />}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => onSet('user')} style={radixMenuItemStyle(viewAs === 'user')}>
            <User size={14} strokeWidth={2} style={{ color: viewAs === 'user' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
            <span style={{ flex: 1, fontWeight: viewAs === 'user' ? 600 : 500 }}>View as regular user</span>
            {viewAs === 'user' && <Check size={14} strokeWidth={2.4} style={{ color: 'var(--accent-primary)' }} />}
          </DropdownMenu.Item>
          <DropdownMenu.Separator style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
          <DropdownMenu.Label style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Impersonate user</DropdownMenu.Label>
          {allUsers.filter(u => u.name !== currentUserName).map(u => {
            const active = viewAs && typeof viewAs === 'object' && viewAs.email === u.email;
            return (
              <DropdownMenu.Item
                key={u.email}
                onSelect={() => onSet({ name: u.name, email: u.email, department: u.department, role: u.role })}
                style={{ ...radixMenuItemStyle(active), justifyContent: 'space-between' }}
              >
                <span style={{ fontWeight: active ? 600 : 500 }}>{u.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{u.role === 'superadmin' ? 'admin' : u.role}{active ? ' ✓' : ''}</span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── RBAC context ─────────────────────────────────────────────────────────────
// One source of truth for "what can the effective user do right now?". Read
// via useCan() at every gating site. The provider lives inside AppContent so
// `can` flips automatically when impersonation, login, role edits, or
// capability toggles happen.
const RbacContext = createContext({
  can: () => false,
  roles: [],
  currentRole: null,
  settings: { defaultAssigneeName: DEFAULT_ASSIGNEE.name, defaultAssigneeEmail: DEFAULT_ASSIGNEE.email },
});
function useCan()      { return useContext(RbacContext).can; }
function useRoles()    { return useContext(RbacContext).roles; }
function useRbacCtx()  { return useContext(RbacContext); }

// ─── Main App (inner) ─────────────────────────────────────────────────────────
function AppContent() {
  const { seedNotifications, addNotification } = useNotifications();
  const [section, setSection] = useState('home');
  const [toast, setToast] = useState(null);
  const [role, setRole] = useState('user');
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [docs, setDocs] = useState(DOCS);
  const [suggestions, setSuggestions] = useState([]);
  // Bumped whenever the roles registry or settings change so consumers
  // (and the `can` memo below) re-evaluate without prop drilling.
  const [rolesVersion, setRolesVersion] = useState(0);
  const [settingsVersion, setSettingsVersion] = useState(0);
  useEffect(() => subscribeRoles(setRolesVersion), []);
  useEffect(() => subscribeSettings(setSettingsVersion), []);
  // viewAs: null = see as self (real role); 'user' = downgrade self to user view;
  // {user object} = impersonate that specific user. Session-only — resets on refresh.
  const [viewAs, setViewAs] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Global ⌘K / Ctrl+K → open palette
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const effectiveRole = viewAs === 'user' ? 'user' : (viewAs && typeof viewAs === 'object' ? viewAs.role : role);
  // effectiveUser carries roleId so RBAC gating (useCan) flips correctly when
  // impersonating. The 'view as regular user' shortcut downgrades to the
  // default role rather than referencing a specific user.
  const effectiveUser = useMemo(() => {
    if (viewAs && typeof viewAs === 'object') return viewAs;
    if (viewAs === 'user') return currentUser ? { ...currentUser, roleId: getDefaultRoleId() } : null;
    return currentUser;
  }, [viewAs, currentUser]);
  const isImpersonating = viewAs !== null;

  // Build the `can` callback. Recomputes whenever the effective user changes
  // OR the roles registry version bumps (e.g. admin toggled a capability) OR
  // the settings change — the last is referenced via settingsVersion only so
  // strip consumers re-render too.
  const can = useCallback(
    (capId) => hasPermission(effectiveUser, capId, listRoles()),
    [effectiveUser, rolesVersion], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const currentRoleObj = effectiveUser?.roleId ? findRole(effectiveUser.roleId) : null;
  const rbacValue = useMemo(
    () => ({ can, roles: listRoles(), currentRole: currentRoleObj, settings: getSettings() }),
    [can, rolesVersion, settingsVersion, currentRoleObj], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const session = getSession();
    if (session) {
      // Back-fill roleId for sessions created before the RBAC migration
      // landed — derive from the legacy role string. Once the user logs in
      // again, the createSession write will carry roleId natively.
      const roleId = session.roleId
        || LEGACY_ROLE_TO_ROLE_ID[session.role]
        || getDefaultRoleId();
      setCurrentUser({ name: session.name, email: session.email, department: session.department, roleId });
      setRole(session.role);
      setIsAuthenticated(true);
      setAuditActor({ name: session.name, email: session.email });
      seedNotifications(buildSeedNotifications(session.name));
    }
    // Load the live Jira project metadata on boot — all fall back silently.
    loadJiraWorkflow();
    loadAssignableUsers();
    loadIssueTypes();
    loadComponents();
  }, [seedNotifications]);

  // Background Jira poll — runs while authenticated. Reconciles linked tickets
  // every 60s; harmless when Jira is unreachable (BFF returns unavailable:true).
  useEffect(() => {
    if (!isAuthenticated) return;
    pollJira('PESD1');
    const id = setInterval(() => pollJira('PESD1'), 60_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // Webhook event polling — every 5s. Cheap because BFF buffers in memory and
  // only returns events newer than `since`.
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => pollWebhookEvents(), 5_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  const handleLogin = (user) => {
    const roleId = user.roleId || LEGACY_ROLE_TO_ROLE_ID[user.role] || getDefaultRoleId();
    setCurrentUser({ name: user.name, email: user.email, department: user.department, roleId });
    setRole(user.role);
    setIsAuthenticated(true);
    setViewAs(null);
    setAuditActor({ name: user.name, email: user.email });
    if (hasPermission({ roleId }, 'audit.view', listRoles())) recordAudit('session.login', { name: user.name, email: user.email });
    seedNotifications(buildSeedNotifications(user.name));
  };

  const handleLogout = () => {
    if (currentUser && hasPermission(currentUser, 'audit.view', listRoles())) {
      recordAudit('session.logout', { name: currentUser.name, email: currentUser.email });
    }
    clearSession();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setRole('user');
    setViewAs(null);
    setAuditActor(null);
    setSection('home');
  };

  // Record view-mode changes (impersonation is a sensitive admin action — R-10).
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    if (!hasPermission(currentUser, 'system.impersonate', listRoles())) return;
    if (viewAs === null) return; // skip the initial null on login
    const detail =
      viewAs === 'user' ? { mode: 'user' }
      : { mode: 'impersonate', targetEmail: viewAs.email, targetName: viewAs.name };
    recordAudit('admin.view_as', { name: currentUser.name, email: currentUser.email }, null, detail);
  }, [viewAs, isAuthenticated, currentUser]);

  const initials = effectiveUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? '?';

  // Most-used destinations stay as direct buttons; the three reference pages
  // are grouped under a Resources dropdown below.
  const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'submit', label: 'Submit Ticket', icon: PlusCircle },
    { id: 'mytickets', label: 'My Tickets', icon: Ticket },
  ];
  const RESOURCE_IDS = new Set(['docs', 'priority', 'sla']);

  // Per-section capability requirements. A section without an entry is
  // public. When the effective view's `can` flips below the required
  // capability (impersonation, role demotion, capability toggle), bounce
  // back home — the viewed user wouldn't see it.
  const SECTION_CAPS = useMemo(() => ({
    admin:    'admin.kanban_view',
    users:    'users.edit',
    roles:    'roles.edit',
    audit:    'audit.view',
    chatlogs: 'chatlogs.view',
    devportal:'tickets.view_assigned',
  }), []);
  useEffect(() => {
    const required = SECTION_CAPS[section];
    if (required && !can(required)) setSection('home');
  }, [section, can, SECTION_CAPS]);

  // Re-seed notifications when the view flips so the impersonated/downgraded
  // view shows that user's notification history rather than the real session's.
  useEffect(() => {
    if (!isAuthenticated) return;
    const viewName = viewAs && typeof viewAs === 'object' ? viewAs.name : currentUser?.name;
    if (viewName) seedNotifications(buildSeedNotifications(viewName));
  }, [viewAs, isAuthenticated, currentUser?.name, seedNotifications]);

  const renderPage = () => {
    let page;
    switch (section) {
      case 'home':      page = <HomePage setSection={setSection} role={effectiveRole} currentUser={effectiveUser} />; break;
      case 'submit':    page = <SubmitPage setSection={setSection} showToast={(msg, type) => setToast({ message: msg, type: type || 'success' })} currentUser={effectiveUser} />; break;
      case 'docs':      page = <DocImportExportPage role={effectiveRole} suggestions={suggestions} setSuggestions={setSuggestions} currentUser={effectiveUser} onDocEdit={(doc) => addNotification({ type: 'doc_edit', title: `Document updated: ${doc.title}`, body: `${effectiveUser?.name || 'You'} made changes to ${doc.title}.`, actorName: effectiveUser?.name || 'You', docId: doc.id })} />; break;
      case 'priority':  page = <PriorityGuidePage />; break;
      case 'sla':       page = <SLAPage />; break;
      case 'mytickets': page = <MyTicketsPage role={effectiveRole} currentUser={effectiveUser} />; break;
      case 'admin':     page = can('admin.kanban_view') ? <AdminPage /> : <HomePage setSection={setSection} role={effectiveRole} currentUser={effectiveUser} />; break;
      case 'users':     page = can('users.edit') ? <UsersPanelPage currentUserEmail={currentUser?.email} /> : <HomePage setSection={setSection} role={effectiveRole} currentUser={effectiveUser} />; break;
      case 'audit':     page = can('audit.view') ? <AuditLogPage /> : <HomePage setSection={setSection} role={effectiveRole} currentUser={effectiveUser} />; break;
      case 'chatlogs':  page = can('chatlogs.view') ? <ChatLogsPage /> : <HomePage setSection={setSection} role={effectiveRole} currentUser={effectiveUser} />; break;
      default:          page = <HomePage setSection={setSection} role={effectiveRole} currentUser={effectiveUser} />;
    }
    return <ErrorBoundary key={section}>{page}</ErrorBoundary>;
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLogin={handleLogin} onToast={(msg, type) => setToast({ message: msg, type: type || 'success' })} />
        {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      </>
    );
  }

  return (
    <RbacContext.Provider value={rbacValue}>
    <div style={S.app}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        * { box-sizing: border-box; }
        button:focus-visible { outline: none; box-shadow: var(--focus-ring); }
        input:focus, textarea:focus, select:focus { box-shadow: var(--focus-ring); }
        /* Subtle press feedback on every interactive surface */
        button:active { transform: scale(0.98); }
        button { transition: transform 0.08s ease-out, background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }

        /* ── Radix dropdown / dialog open-close animations ─────────────── */
        @keyframes radixIn   { from { opacity: 0; transform: translateY(-4px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes radixOut  { from { opacity: 1; transform: translateY(0) scale(1); }        to { opacity: 0; transform: translateY(-4px) scale(0.97); } }
        [data-radix-popper-content-wrapper] > * { transform-origin: var(--radix-popper-transform-origin); }
        [data-state="open"][data-radix-menu-content],
        [data-state="open"][data-radix-popover-content],
        [data-state="open"][data-radix-tooltip-content] { animation: radixIn 150ms cubic-bezier(0.16,1,0.3,1); }
        [data-state="closed"][data-radix-menu-content],
        [data-state="closed"][data-radix-popover-content] { animation: radixOut 100ms ease-in; }

        /* ── Theme tokens ─────────────────────────────────────────────────
           Light (default) — applied when [data-theme="light"] or unset.
           Dark — applied when [data-theme="dark"] is set on <html>.
           Status colours (red/green/yellow/blue) are semantic and stay
           hardcoded throughout the codebase — not themed.
        ───────────────────────────────────────────────────────────────── */
        :root, [data-theme="light"] {
          /* Warmer neutrals — zinc family, Apple-leaning */
          --bg-page: #FAFAF9;
          --bg-surface: #FFFFFF;
          --bg-elevated: #FFFFFF;
          --bg-input: #FAFAF9;
          --bg-input-disabled: #F4F4F5;
          --bg-hover: #F4F4F5;
          --bg-overlay: rgba(15,15,18,0.45);
          --bg-nav: #FFFFFF;
          --border-default: #E4E4E7;
          --border-subtle: #F4F4F5;
          --border-strong: #D4D4D8;
          --text-primary: #0A0A0B;
          --text-secondary: #52525B;
          --text-muted: #A1A1AA;
          --text-inverse: #FFFFFF;
          --accent-primary: #6366F1;
          --accent-soft: #EEF2FF;
          --shadow-card: 0 1px 2px rgba(15,15,18,0.04), 0 2px 6px rgba(15,15,18,0.06);
          --shadow-dropdown: 0 1px 3px rgba(15,15,18,0.06), 0 8px 24px rgba(15,15,18,0.10), 0 16px 40px rgba(15,15,18,0.06);
          --shadow-modal: 0 4px 12px rgba(15,15,18,0.08), 0 32px 80px rgba(15,15,18,0.15);
          --focus-ring: 0 0 0 3px rgba(99,102,241,0.18);
        }
        [data-theme="dark"] {
          --bg-page: #0B0B0E;
          --bg-surface: #17171A;
          --bg-elevated: #1C1C20;
          --bg-input: #1C1C20;
          --bg-input-disabled: #1C1C20;
          --bg-hover: #232328;
          --bg-overlay: rgba(0,0,0,0.7);
          --bg-nav: #0F0F12;
          --border-default: #2A2A2F;
          --border-subtle: #1F1F23;
          --border-strong: #3F3F46;
          --text-primary: #FAFAFA;
          --text-secondary: #A1A1AA;
          --text-muted: #71717A;
          --text-inverse: #FFFFFF;
          --accent-primary: #818CF8;
          --accent-soft: rgba(129,140,248,0.12);
          --shadow-card: 0 1px 2px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
          --shadow-dropdown: 0 1px 3px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.6), 0 16px 48px rgba(0,0,0,0.3);
          --shadow-modal: 0 4px 12px rgba(0,0,0,0.5), 0 32px 80px rgba(0,0,0,0.7);
          --focus-ring: 0 0 0 3px rgba(129,140,248,0.30);
        }
        :root {
          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-xl: 20px;
        }
        body {
          background: var(--bg-page);
          color: var(--text-primary);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-feature-settings: 'cv11', 'ss01', 'ss03';
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        /* Smooth theme transitions — short, color-only so we don't interfere
           with hover/scale animations elsewhere. */
        html[data-theme] body,
        html[data-theme] [data-themed],
        html[data-theme] .pomelo-themed,
        html[data-theme] input, html[data-theme] select, html[data-theme] textarea, html[data-theme] button {
          transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
        }
        /* ── Responsive tiers ─────────────────────────────────────────────
           XL  (>= 1440px) — everything visible, full labels
           LG  (1200-1439) — hide "⌘K" hint + nav button shorter labels
           MD  (900-1199)  — admin button labels hidden, icon-only; avatar shows initials only
           SM  (768-899)   — central nav tabs collapse; search becomes icon
           XS  (< 768)     — phone layout, stack grids
        ────────────────────────────────────────────────────────────────── */
        .pomelo-nav-right { flex-wrap: nowrap; gap: 8px; }
        @media (max-width: 1439px) {
          .pomelo-btn-shortcut { display: none !important; }
        }
        @media (max-width: 1199px) {
          /* Hide admin button labels — keep only icons. aria-label provides screen-reader text */
          .pomelo-btn-label { display: none !important; }
          /* Shrink avatar name to initials at mid widths */
          .pomelo-avatar-name { display: none !important; }
          /* Tighter button padding so icons sit closer */
          .pomelo-icon-btn { padding: 6px 10px !important; }
        }
        @media (max-width: 899px) {
          /* Hide search label too */
          .pomelo-search-label { display: none !important; }
          /* Narrow gap between nav-right items */
          .pomelo-nav-right { gap: 5px !important; }
        }
        @media (max-width: 768px) {
          /* Stack any two-column admin grids to a single column */
          .pomelo-stack-on-mobile { display: flex !important; flex-direction: column !important; }
          /* Allow nav right to wrap on phones */
          .pomelo-nav-right { flex-wrap: wrap !important; justify-content: flex-end; gap: 6px !important; }
          /* Hide the central nav tabs on phones — users navigate via search */
          .pomelo-nav-tabs { display: none !important; }
          /* Tighter main padding */
          .pomelo-main { padding: 16px 12px !important; }
          /* Audit log split-view stacks */
          .pomelo-audit-grid { grid-template-columns: 1fr !important; }
          /* Even tighter nav padding on phones */
          .pomelo-nav { padding: 0 14px !important; }
        }
      `}</style>

      <MaintenanceBanner />
      <Tooltip.Provider delayDuration={250} skipDelayDuration={100}>
      <nav className="pomelo-nav" style={S.nav}>
        <div style={S.navLogo}>
          <div>
            <div style={S.navLogoText}>Pomelo</div>
            <div style={S.navLogoSub}>TechOps Portal</div>
          </div>
        </div>

        <div className="pomelo-nav-tabs" style={S.navTabs}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setSection(item.id)} style={{ ...S.navTab(section === item.id), display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon size={15} strokeWidth={2} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <ResourcesDropdown section={RESOURCE_IDS.has(section) ? section : null} onPick={setSection} />
        </div>

        <div className="pomelo-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Global search trigger */}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search (Cmd+K)"
                className="pomelo-icon-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                <Search size={14} strokeWidth={2.2} />
                <span className="pomelo-search-label">Search</span>
                <span className="pomelo-btn-shortcut" style={{ marginLeft: '4px', padding: '1px 5px', background: 'var(--border-default)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '10px' }}>⌘K</span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content sideOffset={6} style={tooltipContentStyle}>Search (⌘K / Ctrl+K)</Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          {/* View-mode pill — visible to anyone who can impersonate. Stays
              visible even while impersonating so it's the escape hatch back. */}
          {hasPermission(currentUser, 'system.impersonate', listRoles()) && (
            <AdminViewModePill
              viewAs={viewAs}
              onSet={setViewAs}
              allUsers={MOCK_USERS}
              currentUserName={currentUser?.name}
            />
          )}

          {/* Admin tools — single dropdown grouping Users / Roles / Audit / Chat Logs / Admin Console */}
          {(can('admin.kanban_view') || can('users.edit') || can('roles.edit') || can('audit.view') || can('chatlogs.view')) && (
            <AdminToolsDropdown section={section} onPick={setSection} />
          )}

          {/* Notification bell */}
          <NotificationBell onNavigate={(target) => setSection(target)} />

          {/* Theme toggle — light/dark switch, visible to all users */}
          <ThemeToggleButton />

          {/* Avatar — clickable to open profile */}
          <button
            onClick={() => setProfileOpen(true)}
            aria-label={`Open profile for ${effectiveUser?.name || 'user'}`}
            title={effectiveUser?.name}
            style={{ ...S.navUser, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            <div style={S.avatar}>{initials}</div>
            <span className="pomelo-avatar-name" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{effectiveUser?.name}</span>
            {isImpersonating && (
              <span style={{ marginLeft: '6px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E', fontWeight: 700, letterSpacing: '0.04em' }}>VIEWING</span>
            )}
          </button>
        </div>
      </nav>
      </Tooltip.Provider>

      <main className="pomelo-main" style={{ ...S.main, maxWidth: (section === 'admin' || section === 'users' || section === 'audit' || section === 'chatlogs') ? '1400px' : '1100px', padding: (section === 'admin' || section === 'users' || section === 'audit' || section === 'chatlogs') ? '32px 28px' : undefined }}>
        {renderPage()}
      </main>

      <footer style={S.footer}>
        Pomelo TechOps &nbsp;|&nbsp; Support Hours: Mon–Fri, 9:30 AM – 6:30 PM &nbsp;|&nbsp; Emergency: Slack #techops-urgent
      </footer>

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      {profileOpen && <ProfileModal currentUser={effectiveUser} setCurrentUser={setCurrentUser} role={effectiveRole} onClose={() => setProfileOpen(false)} onLogout={handleLogout} />}
      <ChatAssistantWidget effectiveUser={effectiveUser} effectiveRole={effectiveRole} />
      <GlobalSearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={target => setSection(target)}
        role={effectiveRole}
      />
    </div>
    </RbacContext.Provider>
  );
}

// ─── Root export — wraps AppContent in NotificationProvider ──────────────────
export default function PomeloTechOpsPortal() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}
