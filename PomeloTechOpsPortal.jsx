import { useState, useEffect, useRef } from 'react';
import DocImportExportPage from './src/components/docs/DocImportExportPage.jsx';

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

const STATUS_COLORS = {
  'Open': '#3B82F6',
  'In Progress': '#8B5CF6',
  'Pending': '#F59E0B',
  'Resolved': '#16A34A',
  'Closed': '#6B7280',
};

const KANBAN_COLUMNS = [
  { id: 'Open',        label: 'Open',        color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'In Progress', label: 'In Progress',  color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'Pending',     label: 'Pending',      color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'Resolved',    label: 'Resolved',     color: '#16A34A', bg: '#F0FDF4' },
];

const SLA_DATA = [
  { priority: 'Critical', response: '15 minutes', resolution: '4 hours', color: '#DC2626' },
  { priority: 'High', response: '1 hour', resolution: '8 hours', color: '#EA580C' },
  { priority: 'Medium', response: '4 hours', resolution: '2 business days', color: '#CA8A04' },
  { priority: 'Low', response: '1 business day', resolution: '5 business days', color: '#16A34A' },
];

// ─── Auth ─────────────────────────────────────────────────────────────────────
const SESSION_KEY  = 'pomelo_techops_session';
const LOCK_KEY     = 'pomelo_login_lock';
const REMEMBER_KEY = 'pomelo_remember_email';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 30_000;
const AUTH_DELAY   = 600;

let MOCK_USERS = [
  { id: 'u1', name: 'Alex Lee',       email: 'alex.lee@pomelo.com',      passwordHash: btoa('salt_u1_Admin123!'),   role: 'superadmin', department: 'IT & Technology' },
  { id: 'u2', name: 'Kai Nguyen',     email: 'kai.nguyen@pomelo.com',    passwordHash: btoa('salt_u2_User123!'),    role: 'user',       department: 'IT & Technology' },
  { id: 'u3', name: 'Prim Srisawat',  email: 'prim.srisawat@pomelo.com', passwordHash: btoa('salt_u3_User123!'),    role: 'user',       department: 'IT & Technology' },
  { id: 'u4', name: 'Quenton Dupont', email: 'quentondupont@gmail.com',  passwordHash: 'c2FsdF91NF9Ub3lvdGFzdXByYTdA', role: 'superadmin', department: 'IT & Technology' },
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const validateCredentials = (email, password) => {
  const sanitised = email.trim().toLowerCase();
  const user = MOCK_USERS.find(u => u.email === sanitised);
  // Always compute a hash to simulate constant-time comparison
  const candidate = btoa('salt_' + (user?.id ?? 'fake') + '_' + password);
  if (!user || candidate !== user.passwordHash) return null;
  const { passwordHash: _, ...safe } = user;
  return safe;
};

const createSession = (user) => {
  const { passwordHash: _, ...safe } = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...safe, loginAt: Date.now() }));
};
const getSession = () => { try { const r = sessionStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const clearSession = () => sessionStorage.removeItem(SESSION_KEY);
const getLockState = () => { try { const r = sessionStorage.getItem(LOCK_KEY); return r ? JSON.parse(r) : { attempts: 0, lockedUntil: 0 }; } catch { return { attempts: 0, lockedUntil: 0 }; } };
const setLockState = (attempts, lockedUntil) => sessionStorage.setItem(LOCK_KEY, JSON.stringify({ attempts, lockedUntil }));
const clearLockState = () => sessionStorage.removeItem(LOCK_KEY);

const registerUser = (firstName, lastName, email, password) => {
  const sanitisedEmail = email.trim().toLowerCase();
  if (MOCK_USERS.some(u => u.email === sanitisedEmail))
    return 'An account with this email already exists.';
  const id = 'u' + Date.now();
  MOCK_USERS.push({
    id,
    name: firstName.trim() + ' ' + lastName.trim(),
    email: sanitisedEmail,
    passwordHash: btoa('salt_' + id + '_' + password),
    role: 'user',
    department: 'IT & Technology',
  });
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
    const registrationError = registerUser(firstName, lastName, email, password);
    setIsLoading(false);
    if (registrationError) { setError(registrationError); return; }
    onToast?.('Welcome To Pomelo TechOps Portal');
    onClose();
  };

  const fieldStyle = {
    width: '100%', padding: '11px 14px', borderRadius: '8px',
    border: '1.5px solid #E2E8F0', fontFamily: "'Lato', sans-serif",
    fontSize: '14px', color: '#1E293B', background: '#F8F9FB',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
  };
  const pwFieldStyle = { ...fieldStyle, paddingRight: '44px' };
  const focusOrange = (e) => { e.target.style.borderColor = '#E8632A'; };
  const blurGray    = (e) => { e.target.style.borderColor = '#E2E8F0'; };

  const Lbl = ({ children }) => (
    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{children}</div>
  );
  const Eye = ({ show, onToggle }) => (
    <button type="button" onClick={onToggle} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '16px', lineHeight: 1, padding: '4px' }}>
      {show ? '🙈' : '👁'}
    </button>
  );
  const Spin = () => (
    <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '460px', maxWidth: '95vw', background: '#fff', borderRadius: '16px', boxShadow: '0 24px 72px rgba(0,0,0,0.22)', overflow: 'hidden', animation: 'slideUp 0.2s ease' }}>

        {/* Header */}
        <div style={{ background: '#1A2B4A', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 900, fontFamily: "'Lato', sans-serif" }}>Create your account</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '2px 6px', borderRadius: '4px' }}>×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* First + Last Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Lbl>First Name</Lbl>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" autoComplete="given-name" style={fieldStyle} onFocus={focusOrange} onBlur={blurGray} />
            </div>
            <div>
              <Lbl>Last Name</Lbl>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" autoComplete="family-name" style={fieldStyle} onFocus={focusOrange} onBlur={blurGray} />
            </div>
          </div>

          {/* Email */}
          <div>
            <Lbl>Email</Lbl>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@pomelo.com" autoComplete="email" style={fieldStyle} onFocus={focusOrange} onBlur={blurGray} />
          </div>

          {/* Password */}
          <div>
            <Lbl>Password</Lbl>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" style={pwFieldStyle} onFocus={focusOrange} onBlur={blurGray} />
              <Eye show={showPassword} onToggle={() => setShowPassword(v => !v)} />
            </div>
            <PasswordStrengthMeter password={password} />
          </div>

          {/* Confirm Password */}
          <div>
            <Lbl>Confirm Password</Lbl>
            <div style={{ position: 'relative' }}>
              <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" style={pwFieldStyle} onFocus={focusOrange} onBlur={blurGray} />
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
          <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '13px 0', background: isLoading ? '#CBD5E1' : '#E8632A', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Lato', sans-serif", fontWeight: 900, fontSize: '15px', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s' }}>
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
          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < score ? color : '#E2E8F0', transition: 'background 0.2s' }} />
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
  const refs = Array.from({ length: 6 }, () => useRef(null));
  const [focusedIdx, setFocusedIdx] = useState(null);

  const handleChange = (idx, raw) => {
    const digit = raw.replace(/[^0-9]/g, '').slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 5) refs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      const next = [...value]; next[idx - 1] = '';
      onChange(next);
      refs[idx - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    const next = Array(6).fill('');
    pasted.split('').forEach((d, i) => { next[i] = d; });
    onChange(next);
    refs[Math.min(pasted.length, 5)].current?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
      {value.map((v, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={v}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={() => { setFocusedIdx(i); refs[i].current?.select(); }}
          onBlur={() => setFocusedIdx(null)}
          style={{
            width: '48px', height: '56px', textAlign: 'center',
            fontSize: '24px', fontWeight: 900,
            border: `2px solid ${focusedIdx === i ? '#E8632A' : '#E2E8F0'}`,
            borderRadius: '10px', outline: 'none',
            fontFamily: "'Lato', sans-serif",
            color: '#1A2B4A', background: '#F8F9FB',
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
    const user = validateCredentials(sanitised, password);
    if (!user) {
      const current = getLockState();
      const newAttempts = current.attempts + 1;
      const lockedUntil = newAttempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
      setLockState(newAttempts, lockedUntil);
      setLockStateLocal({ attempts: newAttempts, lockedUntil });
      setError('Invalid email or password');
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
    <button type="button" onClick={onToggle} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '16px', lineHeight: 1, padding: '4px' }} aria-label={show ? 'Hide password' : 'Show password'}>
      {show ? '🙈' : '👁'}
    </button>
  );

  const FieldInput = ({ type, value, onChange, placeholder, autoComplete, extra = {} }) => (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
      style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontFamily: "'Lato', sans-serif", fontSize: '14px', color: '#1E293B', background: '#F8F9FB', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s', ...extra }}
      onFocus={e => e.target.style.borderColor = '#E8632A'}
      onBlur={e => e.target.style.borderColor = '#E2E8F0'}
    />
  );

  const ErrorBanner = ({ msg }) => msg ? (
    <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
      ⚠ {msg}
    </div>
  ) : null;

  const BackLink = ({ onClick }) => (
    <button type="button" onClick={onClick} style={{ background: 'none', border: 'none', color: '#E8632A', fontWeight: 700, fontSize: '13px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}>
      ← Back to sign in
    </button>
  );

  const submitBtnStyle = (disabled) => ({
    width: '100%', padding: '13px', background: disabled ? '#CBD5E1' : '#E8632A',
    color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Lato', sans-serif",
    fontWeight: 700, fontSize: '15px', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    transition: 'background 0.15s', marginTop: '8px',
  });

  const Label = ({ children }) => (
    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{children}</div>
  );

  const renderRight = () => {
    if (view === 'login') return (
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#1A2B4A', marginBottom: '6px' }}>Welcome back 👋</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '32px' }}>Sign in to your TechOps account</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label>Email</Label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@pomelo.com" autoComplete="email" disabled={isLocked || isLoading}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontFamily: "'Lato', sans-serif", fontSize: '14px', color: '#1E293B', background: isLocked ? '#F1F5F9' : '#F8F9FB', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#E8632A'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
          </div>
          <div>
            <Label>Password</Label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" disabled={isLocked || isLoading}
                style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontFamily: "'Lato', sans-serif", fontSize: '14px', color: '#1E293B', background: isLocked ? '#F1F5F9' : '#F8F9FB', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#E8632A'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
              <EyeToggle show={showPassword} onToggle={() => setShowPassword(v => !v)} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ accentColor: '#E8632A' }} />
              Remember me
            </label>
            <button type="button" onClick={() => setView('forgot-email')} style={{ background: 'none', border: 'none', color: '#E8632A', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
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
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#64748B' }}>
          {"Don't have an account? "}
          <button type="button" onClick={() => setShowSignup(true)} style={{ background: 'none', border: 'none', color: '#E8632A', fontWeight: 700, fontSize: '14px', cursor: 'pointer', padding: 0 }}>
            Sign up
          </button>
        </p>
      </div>
    );

    if (view === 'forgot-email') return (
      <div>
        <BackLink onClick={resetToLogin} />
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#1A2B4A', marginBottom: '6px' }}>Forgot your password?</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '28px' }}>{"We'll send a 6-digit code to your email."}</p>
        <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label>Email</Label>
            <input type="email" value={forgotEmail || email} onChange={e => setForgotEmail(e.target.value)} placeholder="you@pomelo.com" autoComplete="email"
              style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontFamily: "'Lato', sans-serif", fontSize: '14px', color: '#1E293B', background: '#F8F9FB', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#E8632A'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
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
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#1A2B4A', marginBottom: '6px' }}>Check your email</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '8px' }}>
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
            ? <span style={{ color: '#94A3B8' }}>Resend code in {resendCooldown}s</span>
            : <button type="button" onClick={() => setResendCooldown(30)} style={{ background: 'none', border: 'none', color: '#E8632A', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Resend code</button>
          }
        </div>
        <div style={{ marginTop: '16px', padding: '10px 14px', background: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD', fontSize: '12px', color: '#0369A1' }}>
          💡 Dev mode: any 6-digit code will work
        </div>
      </div>
    );

    if (view === 'forgot-password') return (
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#1A2B4A', marginBottom: '6px' }}>Create new password</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '28px' }}>Choose a strong password for your account.</p>
        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Label>New Password</Label>
            <div style={{ position: 'relative' }}>
              <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password"
                style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontFamily: "'Lato', sans-serif", fontSize: '14px', color: '#1E293B', background: '#F8F9FB', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#E8632A'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
              <EyeToggle show={showNewPass} onToggle={() => setShowNewPass(v => !v)} />
            </div>
            <PasswordStrengthMeter password={newPassword} />
          </div>
          <div>
            <Label>Confirm Password</Label>
            <div style={{ position: 'relative' }}>
              <input type={showConfPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password"
                style={{ width: '100%', padding: '11px 44px 11px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', fontFamily: "'Lato', sans-serif", fontSize: '14px', color: '#1E293B', background: '#F8F9FB', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = '#E8632A'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Lato', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>

      {/* Left panel */}
      <div style={{ width: '42%', background: '#1A2B4A', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '44px 52px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 12px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(232,99,42,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: '22px', letterSpacing: '-0.01em' }}>Pomelo</div>
          <div style={{ color: '#E8632A', fontWeight: 700, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '1px' }}>TechOps Portal</div>
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
      <div style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
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
    fontFamily: "'Lato', sans-serif",
    background: '#F8F9FB',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#1E293B',
  },
  nav: {
    background: '#1A2B4A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    height: '60px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
    color: '#FFFFFF',
    fontWeight: 900,
    fontSize: '17px',
    letterSpacing: '0.02em',
  },
  navLogoSub: {
    color: '#E8632A',
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
    padding: '7px 14px',
    borderRadius: '6px',
    border: 'none',
    background: active ? 'rgba(232,99,42,0.18)' : 'transparent',
    color: active ? '#E8632A' : 'rgba(255,255,255,0.65)',
    fontFamily: "'Lato', sans-serif",
    fontSize: '13px',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }),
  navUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'rgba(255,255,255,0.75)',
    fontSize: '13px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#E8632A',
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
    color: '#1A2B4A',
    marginBottom: '4px',
  },
  pageSub: {
    fontSize: '14px',
    color: '#64748B',
    marginBottom: '28px',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  orangeBtn: {
    background: '#E8632A',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontFamily: "'Lato', sans-serif",
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  ghostBtn: {
    background: 'transparent',
    color: '#E8632A',
    border: '1.5px solid #E8632A',
    borderRadius: '8px',
    padding: '8px 16px',
    fontFamily: "'Lato', sans-serif",
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  label: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid #E2E8F0',
    fontFamily: "'Lato', sans-serif",
    fontSize: '14px',
    color: '#1E293B',
    background: '#F8F9FB',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid #E2E8F0',
    fontFamily: "'Lato', sans-serif",
    fontSize: '14px',
    color: '#1E293B',
    background: '#F8F9FB',
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
    border: '1.5px solid #E2E8F0',
    fontFamily: "'Lato', sans-serif",
    fontSize: '14px',
    color: '#1E293B',
    background: '#F8F9FB',
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
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
  },
  statNum: {
    fontSize: '36px',
    fontWeight: 900,
    color: '#1A2B4A',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748B',
    marginTop: '4px',
  },
  footer: {
    background: '#1A2B4A',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    padding: '16px 24px',
    fontSize: '13px',
    marginTop: 'auto',
  },
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 9999,
      background: '#1A2B4A', color: '#fff', padding: '14px 22px',
      borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: '12px',
      animation: 'slideUp 0.3s ease',
      maxWidth: '360px',
    }}>
      <span style={{ fontSize: '20px' }}>✅</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Ticket submitted!</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{message}</div>
      </div>
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
      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A2B4A', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>🧠</span> Smart Priority Suggester
        {step > 0 && <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '11px' }}>Reset</button>}
      </div>
      {step < 3 ? (
        <>
          <div style={{ fontSize: '14px', color: '#334155', marginBottom: '12px' }}>
            Q{step + 1}: {questions[step]}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => suggest(true)} style={{ ...S.orangeBtn, padding: '7px 18px', fontSize: '13px' }}>Yes</button>
            <button onClick={() => suggest(false)} style={{ ...S.ghostBtn }}>No</button>
          </div>
        </>
      ) : (
        <div style={{ fontSize: '14px', color: '#334155' }}>
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
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200,
        animation: 'fadeIn 0.2s ease',
      }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '520px', maxWidth: '95vw',
        background: '#fff', zIndex: 201, boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.25s ease',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{doc.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#1A2B4A' }}>{doc.title}</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{doc.category}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94A3B8', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <DocMarkdown content={doc.content} />
        </div>
        {/* Read Full Article CTA */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', background: '#FAFBFC' }}>
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
        width: '260px', flexShrink: 0, background: '#fff',
        borderRight: '1px solid #E2E8F0',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, maxHeight: 'calc(100vh - 60px)',
        overflowY: 'auto',
      }}>
        {/* Sidebar back button */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #E2E8F0' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#E8632A', fontWeight: 700, fontSize: '13px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
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
                <div style={{ padding: '6px 18px', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
                        background: isActive ? '#FFF5F0' : 'transparent',
                        borderRight: isActive ? '3px solid #E8632A' : '3px solid transparent',
                        transition: 'background 0.1s',
                        fontFamily: "'Lato', sans-serif",
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8F9FB'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{d.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: isActive ? 700 : 400, color: isActive ? '#E8632A' : '#334155', lineHeight: 1.3 }}>{d.title}</span>
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
            <span style={{ ...S.badge('#64748B'), fontSize: '11px' }}>{activeDoc.category}</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#1A2B4A', marginBottom: '10px', lineHeight: 1.2 }}>
            {activeDoc.title}
          </h1>
          <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>{activeDoc.summary}</p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: '#E2E8F0', marginBottom: '28px' }} />

        {/* Article body */}
        <DocMarkdown content={activeDoc.content} />

        {/* Next / Prev navigation */}
        {otherDocs.length > 0 && (
          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>More Articles</div>
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
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8632A'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(232,99,42,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
                >
                  <span style={{ fontSize: '22px' }}>{d.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A2B4A' }}>{d.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{d.category}</div>
                  </div>
                  <span style={{ color: '#E8632A', fontSize: '16px' }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocMarkdown({ content }) {
  const lines = content.split('\n');
  return (
    <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.7 }}>
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} style={{ fontSize: '20px', fontWeight: 900, color: '#1A2B4A', marginBottom: '12px', marginTop: i === 0 ? 0 : '20px' }}>{line.slice(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: '16px', fontWeight: 700, color: '#1A2B4A', marginBottom: '8px', marginTop: '18px' }}>{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '6px', marginTop: '14px' }}>{line.slice(4)}</h3>;
        if (line.startsWith('- [ ] ')) return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}><span style={{ color: '#CBD5E1' }}>☐</span><span>{line.slice(6)}</span></div>;
        if (line.startsWith('- **') || line.startsWith('- ')) return <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}><span style={{ color: '#E8632A', flexShrink: 0 }}>•</span><span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} /></div>;
        if (line.startsWith('| ')) return null;
        if (line === '') return <div key={i} style={{ height: '8px' }} />;
        if (line.startsWith('**')) return <p key={i} style={{ marginBottom: '6px' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />;
        return <p key={i} style={{ marginBottom: '6px' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />;
      })}
    </div>
  );
}

// ─── Ticket Detail ────────────────────────────────────────────────────────────
function TicketDetail({ ticket, onBack, role, onStatusChange, onAssigneeChange }) {
  const [newMsg, setNewMsg] = useState('');
  const [messages, setMessages] = useState(ticket.messages);
  const messagesEndRef = useRef(null);

  const statusOrder = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'];
  const currentIdx = statusOrder.indexOf(ticket.status);

  const sendMsg = () => {
    if (!newMsg.trim()) return;
    setMessages([...messages, {
      from: 'You',
      time: new Date().toISOString().slice(0, 16).replace('T', ' '),
      text: newMsg.trim(),
    }]);
    setNewMsg('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#E8632A', fontWeight: 700, fontSize: '14px', cursor: 'pointer', padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        ← Back to My Tickets
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '4px' }}>{ticket.id}</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#1A2B4A' }}>{ticket.title}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={S.badge(PRIORITY_COLORS[ticket.priority])}>{ticket.priority}</span>
          <span style={S.badge(STATUS_COLORS[ticket.status])}>{ticket.status}</span>
        </div>
      </div>

      {/* Status Tracker */}
      <div style={{ ...S.card, marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '16px' }}>Status Tracker</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {statusOrder.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < statusOrder.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: i <= currentIdx ? '#E8632A' : '#E2E8F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i <= currentIdx ? '#fff' : '#94A3B8',
                  fontSize: '13px', fontWeight: 700,
                  border: i === currentIdx ? '3px solid #FDBA74' : '3px solid transparent',
                  boxSizing: 'border-box',
                }}>
                  {i < currentIdx ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: '11px', color: i <= currentIdx ? '#E8632A' : '#94A3B8', fontWeight: i === currentIdx ? 700 : 400, whiteSpace: 'nowrap' }}>{s}</div>
              </div>
              {i < statusOrder.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: i < currentIdx ? '#E8632A' : '#E2E8F0', margin: '0 4px', marginBottom: '20px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Timeline */}
        <div style={S.card}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '14px' }}>Activity Timeline</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ticket.timeline.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E8632A', flexShrink: 0, marginTop: '3px' }} />
                  {i < ticket.timeline.length - 1 && <div style={{ width: '1px', flex: 1, background: '#E2E8F0', marginTop: '4px' }} />}
                </div>
                <div style={{ paddingBottom: '8px' }}>
                  <div style={{ fontSize: '13px', color: '#334155', fontWeight: 400 }}>{t.action}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>{t.date} · {t.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div style={S.card}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '14px' }}>Details</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#64748B' }}>Assignee</span>
              {role === 'superadmin' ? (
                <div style={{ position: 'relative' }}>
                  <select
                    value={ticket.assignee || ''}
                    onChange={e => onAssigneeChange(ticket.id, e.target.value || null)}
                    style={{ ...S.select, width: 'auto', padding: '3px 24px 3px 8px', fontSize: '13px', fontWeight: 700, color: '#1A2B4A' }}
                  >
                    <option value="">Unassigned</option>
                    {ALL_AGENTS.filter(a => a !== 'Unassigned').map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: '#1A2B4A', fontWeight: 700 }}>{ticket.assignee || 'Unassigned'}</span>
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
                <span style={{ fontSize: '13px', color: '#64748B' }}>{k}</span>
                <span style={{ fontSize: '13px', color: '#1A2B4A', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Description</div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>{ticket.description}</div>
          </div>
          {role === 'superadmin' && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: '#64748B', flexShrink: 0 }}>Change Status</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <select
                  value={ticket.status}
                  onChange={e => onStatusChange(ticket.id, e.target.value)}
                  style={{ ...S.select, padding: '6px 28px 6px 10px', fontSize: '13px' }}
                >
                  {['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8', fontSize: '11px' }}>▾</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messaging */}
      <div style={S.card}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '14px' }}>Messages</div>
        <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {messages.map((m, i) => {
            const isYou = m.from === 'You';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: isYou ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: isYou ? '#E8632A' : '#1A2B4A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '11px', fontWeight: 700,
                }}>
                  {m.from[0]}
                </div>
                <div style={{ maxWidth: '70%' }}>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '3px', textAlign: isYou ? 'right' : 'left' }}>
                    {m.from} · {m.time}
                  </div>
                  <div style={{
                    background: isYou ? '#E8632A' : '#F1F5F9',
                    color: isYou ? '#fff' : '#334155',
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
          <div style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '8px' }}>This ticket is closed.</div>
        )}
      </div>
    </div>
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300, animation: 'fadeIn 0.15s ease' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: '16px', zIndex: 301,
        width: '540px', maxWidth: '95vw', maxHeight: '85vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#1A2B4A', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
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
            <span style={{ ...S.badge('#64748B'), fontSize: '11px' }}>{ticket.category}</span>
          </div>

          {/* Description */}
          <div style={{ background: '#F8F9FB', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Description</div>
            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>{ticket.description}</div>
          </div>

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
              <div key={k} style={{ background: '#F8F9FB', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{k}</div>
                <div style={{ fontSize: '13px', color: '#1A2B4A', fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Activity Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ticket.timeline.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E8632A', flexShrink: 0, marginTop: '3px' }} />
                    {i < ticket.timeline.length - 1 && <div style={{ width: '1px', flex: 1, background: '#E2E8F0', marginTop: '3px' }} />}
                  </div>
                  <div style={{ paddingBottom: '6px' }}>
                    <div style={{ fontSize: '13px', color: '#334155' }}>{t.action}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>{t.date} · {t.actor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message count */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px', fontSize: '13px', color: '#64748B' }}>
            💬 {ticket.messages?.length || 0} message{ticket.messages?.length !== 1 ? 's' : ''} — open ticket in My Tickets to reply
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ currentUser, setCurrentUser, role, onClose, onLogout }) {
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400, animation: 'fadeIn 0.15s ease' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: '16px', zIndex: 401,
        width: '400px', maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#1A2B4A', padding: '20px 22px 40px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>My Profile</div>
        </div>

        {/* Avatar — overlapping header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-32px', marginBottom: '16px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: '#E8632A', border: '3px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '22px', fontWeight: 900,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>{initials}</div>
        </div>

        {/* Role badge */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: '100px',
            background: role === 'superadmin' ? '#E8632A18' : '#1A2B4A18',
            color: role === 'superadmin' ? '#E8632A' : '#1A2B4A',
            fontSize: '12px', fontWeight: 700,
          }}>
            {role === 'superadmin' ? '⭐ Super Admin' : '👤 User'}
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
              {role === 'superadmin' ? (
                <input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={S.input}
                />
              ) : (
                <div style={{ fontSize: '14px', color: '#1A2B4A', fontWeight: 700, padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>{form[key]}</div>
              )}
            </div>
          ))}

          {role === 'superadmin' && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button onClick={onClose} style={S.ghostBtn}>Cancel</button>
              <button onClick={save} style={S.orangeBtn}>Save Changes</button>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <div style={{ padding: '0 22px 22px' }}>
          <div style={{ height: '1px', background: '#F1F5F9', margin: '0 0 16px' }} />
          <button
            onClick={onLogout}
            style={{
              width: '100%', background: 'transparent',
              color: '#DC2626', border: '1.5px solid #DC2626',
              borderRadius: '8px', padding: '10px',
              fontFamily: "'Lato', sans-serif", fontWeight: 700,
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, animation: 'fadeIn 0.15s ease' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: '16px', zIndex: 501,
        width: '600px', maxWidth: '95vw', maxHeight: '88vh',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#1A2B4A' }}>Create New Document</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={S.label}>Icon</label>
              <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={2} placeholder="📄" style={{ ...S.input, textAlign: 'center', fontSize: '20px' }} />
              {err('icon')}
            </div>
            <div>
              <label style={S.label}>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title" style={{ ...S.input, borderColor: errors.title ? '#DC2626' : '#E2E8F0' }} />
              {err('title')}
            </div>
            <div>
              <label style={S.label}>Category *</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Security" style={{ ...S.input, borderColor: errors.category ? '#DC2626' : '#E2E8F0' }} />
              {err('category')}
            </div>
          </div>
          <div>
            <label style={S.label}>Summary *</label>
            <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="One or two sentences describing the document." style={{ ...S.textarea, minHeight: '72px', borderColor: errors.summary ? '#DC2626' : '#E2E8F0' }} />
            {err('summary')}
          </div>
          <div>
            <label style={S.label}>Content * <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94A3B8' }}>— supports # headings, ## subheadings, - bullet lists, **bold**</span></label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder={'# Document Title\n\n## Section\nYour content here...'} style={{ ...S.textarea, minHeight: '220px', fontFamily: 'monospace', fontSize: '13px', borderColor: errors.content ? '#DC2626' : '#E2E8F0' }} />
            {err('content')}
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, animation: 'fadeIn 0.15s ease' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: '14px', zIndex: 501,
        width: '480px', maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#1A2B4A' }}>Edit Suggestion</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={S.label}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={S.input} />
          </div>
          <div>
            <label style={S.label}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...S.textarea, minHeight: '100px' }} />
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

function SuggestionCard({ suggestion, currentUser, role, onEdit, onDelete }) {
  const isOwn = suggestion.author === currentUser.name;
  const canEdit = isOwn;
  const canDelete = isOwn || role === 'superadmin';
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
            width: '30px', height: '30px', borderRadius: '50%', background: '#1A2B4A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0,
          }}>{initials}</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A2B4A' }}>{suggestion.author}</div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{timeAgo}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {canEdit && (
            <button onClick={() => onEdit(suggestion)} style={{ background: 'none', border: '1.5px solid #E2E8F0', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', color: '#475569', fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>Edit</button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(suggestion.id)} style={{ background: 'none', border: '1.5px solid #FECACA', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', color: '#DC2626', fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>Delete</button>
          )}
        </div>
      </div>
      <div style={{ fontSize: '15px', fontWeight: 900, color: '#1A2B4A' }}>{suggestion.title}</div>
      <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>{suggestion.description}</div>
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
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A2B4A', marginBottom: '12px' }}>💡 Suggest a Documentation Topic</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Topic title — what should be documented?" style={{ ...S.input, borderColor: errors.title ? '#DC2626' : '#E2E8F0' }} />
          {errors.title && <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '3px' }}>{errors.title}</div>}
        </div>
        <div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what you need — why it would be helpful, who it's for, what it should cover." style={{ ...S.textarea, minHeight: '80px', borderColor: errors.description ? '#DC2626' : '#E2E8F0' }} />
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
function HomePage({ setSection, role, currentUser }) {
  const open = MOCK_TICKETS.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  const resolved = MOCK_TICKETS.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
  const [activeTicket, setActiveTicket] = useState(null);
  const firstName = currentUser?.name?.split(' ')[0] || 'there';

  return (
    <div>
      {/* Edge-to-edge hero banner */}
      <div style={{ position: 'relative', left: '50%', transform: 'translateX(-50%)', width: '100vw', marginTop: '-32px', marginBottom: '28px', background: 'linear-gradient(150deg, #1A2B4A 0%, #1E3560 55%, #2B4F8A 100%)', padding: '64px 40px 68px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Subtle radial glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 80% at 50% 120%, rgba(43,79,138,0.6) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#E8632A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '14px' }}>
            IT Service Management
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
            Pomelo TechOps Portal
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.65)', margin: '0 0 36px', fontWeight: 400 }}>
            Your single hub for IT support, documentation, and service requests.
          </p>
          <button onClick={() => setSection('submit')} style={{ background: '#E8632A', color: '#fff', border: 'none', borderRadius: '100px', padding: '16px 40px', fontFamily: "'Lato', sans-serif", fontWeight: 900, fontSize: '16px', cursor: 'pointer', letterSpacing: '0.01em' }}>
            Submit a Ticket
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { num: MOCK_TICKETS.length, label: 'Total Tickets', color: '#1A2B4A' },
          { num: open, label: 'Active', color: '#E8632A' },
          { num: resolved, label: 'Resolved', color: '#16A34A' },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{ ...S.statNum, color: s.color }}>{s.num}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A2B4A', marginBottom: '14px' }}>Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { icon: '🔑', label: 'Password Reset', desc: 'Reset account or MFA', section: 'docs' },
          { icon: '🖥️', label: 'Hardware Request', desc: 'Replacement or loaner', section: 'submit' },
          { icon: '🌐', label: 'VPN Setup', desc: 'Remote access guide', section: 'docs' },
          { icon: '🎟️', label: 'My Tickets', desc: 'View & track requests', section: 'mytickets' },
        ].map(q => (
          <button key={q.label} onClick={() => setSection(q.section)} style={{
            background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: '10px',
            padding: '16px 20px', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '14px',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8632A'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(232,99,42,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
          >
            <span style={{ fontSize: '24px' }}>{q.icon}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A2B4A' }}>{q.label}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{q.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A2B4A', marginBottom: '14px' }}>Recent Activity</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {MOCK_TICKETS.slice(0, 3).map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTicket(t)}
            style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', width: '100%', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8632A'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(232,99,42,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
          >
            <span style={S.badge(PRIORITY_COLORS[t.priority])}>{t.priority}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A2B4A' }}>{t.title}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{t.id} · {t.category}</div>
            </div>
            <span style={S.badge(STATUS_COLORS[t.status])}>{t.status}</span>
            <span style={{ color: '#CBD5E1', fontSize: '16px', flexShrink: 0 }}>↗</span>
          </button>
        ))}
      </div>

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
};

function PlatformCheckbox({ value, selected, onChange }) {
  const checked = selected.includes(value);
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '7px 12px', borderRadius: '7px', cursor: 'pointer',
      background: checked ? '#FFF5F0' : '#F8F9FB',
      border: `1.5px solid ${checked ? '#E8632A' : '#E2E8F0'}`,
      fontSize: '13px', color: checked ? '#E8632A' : '#475569',
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
        background: checked ? '#E8632A' : '#fff',
        border: `1.5px solid ${checked ? '#E8632A' : '#CBD5E1'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
      </span>
      {value}
    </label>
  );
}

function FieldHint({ text }) {
  return <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '5px', lineHeight: 1.5 }}>{text}</div>;
}

function SubmitPage({ setSection, showToast }) {
  const [form, setForm] = useState(EMPTY_FORM);
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

  const submit = () => {
    if (!validate()) return;
    const year = new Date().getFullYear();
    const num = String(Math.floor(Math.random() * 9000) + 1000);
    const id = `TKT-${year}-${num}`;
    showToast(`Your ticket ${id} has been submitted. We'll respond within SLA hours.`);
    setForm(EMPTY_FORM);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const err = (k) => errors[k] ? <div style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px' }}>{errors[k]}</div> : null;
  const borderOf = (k) => ({ borderColor: errors[k] ? '#DC2626' : '#E2E8F0' });

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
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }}>▾</span>
              </div>
              <FieldHint text="Which shop is affected or needs to be updated?" />
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
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }}>▾</span>
              </div>
              <FieldHint text="Which department are you part of?" />
              {err('department')}
            </div>
          </div>

          {/* Priority */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ ...S.label, marginBottom: 0 }}>Priority *</label>
              <button
                onClick={() => setShowSuggester(!showSuggester)}
                style={{ background: 'none', border: 'none', color: '#E8632A', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                {showSuggester ? 'Hide suggester' : '🧠 Not sure? Use Smart Suggester'}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <select
                value={form.priority}
                onChange={e => handleChange('priority', e.target.value)}
                style={{ ...S.select, ...borderOf('priority') }}
              >
                <option value="">Select priority</option>
                {Object.keys(PRIORITY_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94A3B8' }}>▾</span>
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
                <div style={{ fontSize: '13px', color: '#334155' }}>
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
                border: '2px dashed #E2E8F0', borderRadius: '10px', padding: '24px',
                textAlign: 'center', cursor: 'pointer', background: '#FAFBFC',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#E8632A'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📎</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>Click to upload files</div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>Screenshots, exports, spreadsheets — any files that help illustrate the issue</div>
              <input ref={fileInputRef} type="file" multiple onChange={handleFiles} style={{ display: 'none' }} />
            </div>
            {form.files.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {form.files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F1F5F9', borderRadius: '7px', padding: '8px 12px' }}>
                    <span style={{ fontSize: '14px' }}>📄</span>
                    <span style={{ flex: 1, fontSize: '13px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ fontSize: '12px', color: '#94A3B8', flexShrink: 0 }}>{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <FieldHint text="If you have more files to share, contact the TechOps representative directly and they'll add them to the ticket." />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px', borderTop: '1px solid #F1F5F9' }}>
            <button onClick={() => { setForm(EMPTY_FORM); setErrors({}); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={S.ghostBtn}>Clear Form</button>
            <button onClick={submit} style={S.orangeBtn}>Submit Ticket</button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Docs Sidebar ─────────────────────────────────────────────────────────────
function DocsSidebar({ docs, selectedDoc, onSelect }) {
  const categories = [...new Set(docs.map(d => d.category))];

  return (
    <div style={{
      width: '220px', flexShrink: 0,
      background: '#fff', borderRight: '1px solid #E2E8F0',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: 'calc(100vh - 60px)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>All Documents</span>
        <span style={{
          background: '#F1F5F9', color: '#64748B',
          fontSize: '11px', fontWeight: 700,
          padding: '2px 7px', borderRadius: '100px',
        }}>{docs.length}</span>
      </div>

      {/* Doc list grouped by category */}
      <div style={{ flex: 1, padding: '8px 0' }}>
        {categories.map(cat => {
          const catDocs = docs.filter(d => d.category === cat);
          return (
            <div key={cat} style={{ marginBottom: '4px' }}>
              <div style={{ padding: '6px 16px 4px', fontSize: '10px', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {cat}
              </div>
              {catDocs.map(doc => {
                const isActive = selectedDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => onSelect(doc)}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                      padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px',
                      background: isActive ? '#FFF5F0' : 'transparent',
                      borderRight: `3px solid ${isActive ? '#E8632A' : 'transparent'}`,
                      transition: 'background 0.1s',
                      fontFamily: "'Lato', sans-serif",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8F9FB'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>{doc.icon}</span>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? '#E8632A' : '#334155',
                      lineHeight: 1.35,
                    }}>{doc.title}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocsPage({ role, docs, setDocs, suggestions, setSuggestions, currentUser }) {
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [filterCat, setFilterCat] = useState('All');
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [fullPageDoc, setFullPageDoc] = useState(null);

  // Full-page article reader — renders over the whole page
  if (fullPageDoc) {
    return (
      <DocFullPage
        doc={fullPageDoc}
        allDocs={docs}
        onClose={() => setFullPageDoc(null)}
        onSelect={setFullPageDoc}
      />
    );
  }

  const docCategories = ['All', ...Array.from(new Set(docs.map(d => d.category)))];
  const filtered = docs.filter(d => {
    const matchCat = filterCat === 'All' || d.category === filterCat;
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.summary.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleDeleteSuggestion = (id) => setSuggestions(s => s.filter(x => x.id !== id));
  const handleSaveSuggestion = (updated) => {
    setSuggestions(s => s.map(x => x.id === updated.id ? updated : x));
    setEditingSuggestion(null);
  };

  return (
    <div style={{ display: 'flex', margin: '0 -28px', minHeight: '100%' }}>
      <DocsSidebar docs={docs} selectedDoc={selectedDoc} onSelect={setSelectedDoc} />
      <div style={{ flex: 1, minWidth: 0, padding: '0 28px 32px' }}>

      {/* Section 1: Documentation Library */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '10px', paddingTop: '32px' }}>
        <div style={S.pageTitle}>Documentation Library</div>
        {role === 'superadmin' && (
          <button onClick={() => setShowNewDoc(true)} style={S.orangeBtn}>+ New Document</button>
        )}
      </div>
      <div style={S.pageSub}>Guides, policies, and how-to articles from the IT team.</div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documentation…"
          style={{ ...S.input, maxWidth: '320px' }}
        />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {docCategories.map(c => (
            <button key={c} onClick={() => setFilterCat(c)} style={{
              padding: '7px 14px', borderRadius: '100px',
              border: '1.5px solid',
              borderColor: filterCat === c ? '#E8632A' : '#E2E8F0',
              background: filterCat === c ? '#FFF5F0' : '#fff',
              color: filterCat === c ? '#E8632A' : '#64748B',
              fontFamily: "'Lato', sans-serif",
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px', marginBottom: '40px' }}>
        {filtered.map(doc => (
          <button key={doc.id} onClick={() => setSelectedDoc(doc)} style={{
            ...S.card, textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8632A'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(232,99,42,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '28px', lineHeight: 1 }}>{doc.icon}</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A2B4A', marginBottom: '3px' }}>{doc.title}</div>
                <span style={{ ...S.badge('#64748B'), fontSize: '10px' }}>{doc.category}</span>
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>{doc.summary}</div>
            <div style={{ fontSize: '12px', color: '#E8632A', fontWeight: 700, marginTop: 'auto' }}>Read article →</div>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '2px solid #E2E8F0', marginBottom: '28px' }} />

      {/* Section 2: Topic Suggestions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={S.pageTitle}>Topic Suggestions</div>
        <span style={{ fontSize: '13px', color: '#94A3B8' }}>{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ ...S.pageSub, marginBottom: '20px' }}>
        Share ideas, questions, or requests with the TechOps team. Anyone can suggest — super admins will review and create the docs.
      </div>

      <NewSuggestionForm currentUser={currentUser} onSubmit={(s) => setSuggestions(prev => [s, ...prev])} />

      {suggestions.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
          <div style={{ fontSize: '14px' }}>No suggestions yet — be the first to post one!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {suggestions.map(s => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              currentUser={currentUser}
              role={role}
              onEdit={setEditingSuggestion}
              onDelete={handleDeleteSuggestion}
            />
          ))}
        </div>
      )}

      {selectedDoc && (
        <DocPanel
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onReadFull={(d) => { setSelectedDoc(null); setFullPageDoc(d); }}
        />
      )}
      {showNewDoc && <NewDocModal onSave={doc => { setDocs(d => [...d, doc]); setShowNewDoc(false); }} onClose={() => setShowNewDoc(false)} />}
      {editingSuggestion && <EditSuggestionModal suggestion={editingSuggestion} onSave={handleSaveSuggestion} onClose={() => setEditingSuggestion(null)} />}
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
            <div style={{ fontSize: '14px', color: '#334155', marginBottom: '12px', lineHeight: 1.6 }}>{p.definition}</div>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Examples</div>
              {p.examples.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#475569', marginBottom: '3px' }}>
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
              <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                {['Priority', 'Response Time', 'Resolution Target', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLA_DATA.map((row, i) => (
                <tr key={row.priority} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#FAFBFC' : '#fff' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={S.badge(row.color)}>{row.priority}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 700, color: '#1A2B4A' }}>{row.response}</td>
                  <td style={{ padding: '14px 16px', fontSize: '14px', color: '#334155' }}>{row.resolution}</td>
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
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A2B4A', marginBottom: '12px' }}>Support Hours</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              ['Monday – Friday', '9:30 AM – 6:30 PM (ICT)'],
              ['Saturday', 'On-call only'],
              ['Sunday & Public Holidays', 'Emergency only'],
              ['Emergency Channel', 'Slack #techops-urgent'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>{k}</span>
                <span style={{ color: '#1A2B4A', fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A2B4A', marginBottom: '12px' }}>Standards & Compliance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'All tickets acknowledged within SLA response time',
              'Status updates every 4 hours for Critical/High tickets',
              'Root cause analysis provided for all Critical incidents',
              'Monthly SLA report shared with department heads',
              'Escalation to IT Manager after 2× resolution time',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#334155' }}>
                <span style={{ color: '#E8632A', flexShrink: 0 }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyTicketsPage({ role }) {
  const [tickets, setTickets] = useState(MOCK_TICKETS);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const statuses = ['All', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed'];
  const filtered = filter === 'All' ? tickets : tickets.filter(t => t.status === filter);

  const handleStatusChange = (id, newStatus) => {
    setTickets(ts => ts.map(t => t.id === id ? { ...t, status: newStatus, updated: new Date().toISOString().slice(0, 10) } : t));
    setSelected(s => s && s.id === id ? { ...s, status: newStatus } : s);
  };

  const handleAssigneeChange = (id, assignee) => {
    setTickets(ts => ts.map(t => t.id === id ? { ...t, assignee } : t));
    setSelected(s => s && s.id === id ? { ...s, assignee } : s);
  };

  if (selected) {
    return <TicketDetail ticket={selected} onBack={() => setSelected(null)} role={role} onStatusChange={handleStatusChange} onAssigneeChange={handleAssigneeChange} />;
  }

  return (
    <div>
      <div style={S.pageTitle}>My Tickets</div>
      <div style={S.pageSub}>Track and manage all your IT requests.</div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '7px 14px', borderRadius: '100px', border: '1.5px solid',
            borderColor: filter === s ? '#E8632A' : '#E2E8F0',
            background: filter === s ? '#FFF5F0' : '#fff',
            color: filter === s ? '#E8632A' : '#64748B',
            fontFamily: "'Lato', sans-serif",
            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
          }}>{s}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 && (
          <div style={{ ...S.card, textAlign: 'center', color: '#94A3B8', padding: '40px' }}>No tickets found.</div>
        )}
        {filtered.map(t => (
          <button key={t.id} onClick={() => setSelected(t)} style={{
            ...S.card, textAlign: 'left', cursor: 'pointer', width: '100%',
            display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E8632A'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(232,99,42,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A2B4A' }}>{t.title}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>{t.id} · {t.category} · Updated {t.updated}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              <span style={S.badge(PRIORITY_COLORS[t.priority])}>{t.priority}</span>
              <span style={S.badge(STATUS_COLORS[t.status])}>{t.status}</span>
              <span style={{ color: '#CBD5E1', fontSize: '16px' }}>›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Admin Kanban ─────────────────────────────────────────────────────────────
function AdminPage() {
  const [tickets, setTickets] = useState([...MOCK_TICKETS]);
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
    setTickets(ts => ts.map(t => t.id === id
      ? { ...t, status: newStatus, updated: new Date().toISOString().slice(0, 10) }
      : t
    ));
  };

  const assignTicket = (id, assignee) => {
    setTickets(ts => ts.map(t => t.id === id ? { ...t, assignee: assignee || null } : t));
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
      {/* Admin Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1A2B4A 0%, #0F1F36 100%)',
        borderRadius: '14px', padding: '18px 24px', marginBottom: '22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#E8632A', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🛠</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: '16px' }}>IT Admin — Kanban Board</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: '2px' }}>Drag cards between columns to update status · Click a card to view details</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#E8632A', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{totalOpen}</div>
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
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filter:</div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)} style={{
              padding: '5px 12px', borderRadius: '100px', border: '1.5px solid',
              borderColor: filterPriority === p ? (PRIORITY_COLORS[p] || '#1A2B4A') : '#E2E8F0',
              background: filterPriority === p ? ((PRIORITY_COLORS[p] || '#1A2B4A') + '15') : '#fff',
              color: filterPriority === p ? (PRIORITY_COLORS[p] || '#1A2B4A') : '#64748B',
              fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}>{p}</button>
          ))}
        </div>
        <div style={{ width: '1px', height: '18px', background: '#E2E8F0' }} />
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {['All', ...agentOptions, 'Unassigned'].map(a => (
            <button key={a} onClick={() => setFilterAssignee(a)} style={{
              padding: '5px 12px', borderRadius: '100px', border: '1.5px solid',
              borderColor: filterAssignee === a ? '#1A2B4A' : '#E2E8F0',
              background: filterAssignee === a ? '#EFF2F7' : '#fff',
              color: filterAssignee === a ? '#1A2B4A' : '#64748B',
              fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}>{a}</button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', alignItems: 'start' }}>
        {KANBAN_COLUMNS.map(col => {
          const colTickets = columnTickets(col.id);
          const isDragTarget = dragOver === col.id;
          return (
            <div
              key={col.id}
              onDragOver={e => onDragOver(e, col.id)}
              onDrop={e => onDrop(e, col.id)}
              style={{
                background: isDragTarget ? col.bg : '#F1F5F9',
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
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A2B4A' }}>{col.label}</span>
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
                  <div style={{ padding: '20px', textAlign: 'center', color: '#CBD5E1', fontSize: '12px' }}>
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
                      background: dragId === t.id ? 'rgba(255,255,255,0.5)' : '#fff',
                      borderRadius: '9px',
                      border: '1.5px solid #E2E8F0',
                      padding: '12px 13px',
                      cursor: 'grab',
                      opacity: dragId === t.id ? 0.5 : 1,
                      transition: 'opacity 0.15s, box-shadow 0.15s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  >
                    {/* Priority + ID */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                      <span style={{ ...S.badge(PRIORITY_COLORS[t.priority]), fontSize: '10px' }}>{t.priority}</span>
                      <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>{t.id}</span>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A2B4A', lineHeight: 1.4, marginBottom: '8px' }}>
                      {t.title}
                    </div>

                    {/* Meta */}
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '9px' }}>
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
                            background: '#1A2B4A', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 700, flexShrink: 0,
                          }}>
                            {t.assignee.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span style={{ fontSize: '11px', color: '#475569', fontWeight: 700 }}>{t.assignee}</span>
                        </>
                      ) : (
                        <>
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: '#F1F5F9', border: '1.5px dashed #CBD5E1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#94A3B8', fontSize: '11px', flexShrink: 0,
                          }}>+</div>
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Unassigned</span>
                        </>
                      )}
                    </div>

                    {/* Assignee Dropdown */}
                    {editingAssignee === t.id && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          marginTop: '8px', background: '#fff', border: '1.5px solid #E2E8F0',
                          borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                          overflow: 'hidden',
                        }}
                      >
                        {[...agentOptions, null].map(a => (
                          <button key={a || 'unassign'} onClick={() => assignTicket(t.id, a)} style={{
                            width: '100%', textAlign: 'left', padding: '8px 12px',
                            background: t.assignee === a ? '#F0F4FF' : 'transparent',
                            border: 'none', cursor: 'pointer', fontFamily: "'Lato', sans-serif",
                            fontSize: '12px', color: a ? '#1A2B4A' : '#94A3B8',
                            fontWeight: t.assignee === a ? 700 : 400,
                            display: 'flex', alignItems: 'center', gap: '7px',
                          }}>
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                              background: a ? '#1A2B4A' : '#F1F5F9',
                              border: a ? 'none' : '1.5px dashed #CBD5E1',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: a ? '#fff' : '#94A3B8', fontSize: '8px', fontWeight: 700,
                            }}>
                              {a ? a.split(' ').map(n => n[0]).join('') : '—'}
                            </div>
                            {a || 'Unassign'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Updated date */}
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', fontSize: '10px', color: '#CBD5E1' }}>
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
          <div onClick={() => setDetailTicket(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300, animation: 'fadeIn 0.15s ease' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: '16px', zIndex: 301, width: '480px', maxWidth: '95vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'slideUp 0.2s ease',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{ background: '#1A2B4A', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                <span style={{ ...S.badge('#64748B'), fontSize: '11px' }}>{detailTicket.category}</span>
              </div>

              {/* Description */}
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, marginBottom: '16px' }}>{detailTicket.description}</div>

              {/* Meta grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', background: '#F8F9FB', borderRadius: '8px', padding: '12px' }}>
                {[
                  ['Assignee', detailTicket.assignee || 'Unassigned'],
                  ['Department', detailTicket.department || '—'],
                  ['Shop', detailTicket.shop || '—'],
                  ['Submitted', detailTicket.created],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{k}</div>
                    <div style={{ fontSize: '13px', color: '#1A2B4A', fontWeight: 700 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Move to column */}
              <div style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Move to</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {KANBAN_COLUMNS.map(col => (
                    <button
                      key={col.id}
                      onClick={() => {
                        moveTicket(detailTicket.id, col.id);
                        setDetailTicket(t => ({ ...t, status: col.id }));
                      }}
                      style={{
                        padding: '7px 14px', borderRadius: '7px', border: '1.5px solid',
                        borderColor: detailTicket.status === col.id ? col.color : '#E2E8F0',
                        background: detailTicket.status === col.id ? col.bg : '#fff',
                        color: detailTicket.status === col.id ? col.color : '#64748B',
                        fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700, cursor: 'pointer',
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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PomeloTechOpsPortal() {
  const [section, setSection] = useState('home');
  const [toast, setToast] = useState(null);
  const [role, setRole] = useState('user');
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [docs, setDocs] = useState(DOCS);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setCurrentUser({ name: session.name, email: session.email, department: session.department });
      setRole(session.role);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (user) => {
    setCurrentUser({ name: user.name, email: user.email, department: user.department });
    setRole(user.role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearSession();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setRole('user');
    setSection('home');
  };

  const initials = currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() ?? '?';

  const NAV_ITEMS = [
    { id: 'home', label: '🏠 Home' },
    { id: 'submit', label: '+ Submit Ticket' },
    { id: 'docs', label: '📚 Documentation' },
    { id: 'priority', label: '🎯 Priority Guide' },
    { id: 'sla', label: '📋 SLA & Standards' },
    { id: 'mytickets', label: '🎟️ My Tickets' },
  ];

  const renderPage = () => {
    switch (section) {
      case 'home': return <HomePage setSection={setSection} role={role} currentUser={currentUser} />;
      case 'submit': return <SubmitPage setSection={setSection} showToast={(msg) => setToast(msg)} />;
      case 'docs': return <DocImportExportPage role={role} suggestions={suggestions} setSuggestions={setSuggestions} currentUser={currentUser} />;
      case 'priority': return <PriorityGuidePage />;
      case 'sla': return <SLAPage />;
      case 'mytickets': return <MyTicketsPage role={role} />;
      case 'admin': return role === 'superadmin' ? <AdminPage /> : <HomePage setSection={setSection} role={role} currentUser={currentUser} />;
      default: return <HomePage setSection={setSection} role={role} currentUser={currentUser} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLogin={handleLogin} onToast={(msg) => setToast(msg)} />
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div style={S.app}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid #E8632A; outline-offset: 2px; }
      `}</style>

      <nav style={S.nav}>
        <div style={S.navLogo}>
          <div>
            <div style={S.navLogoText}>Pomelo</div>
            <div style={S.navLogoSub}>TechOps Portal</div>
          </div>
        </div>

        <div style={S.navTabs}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} style={S.navTab(section === item.id)}>
              {item.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Admin button — super admin only */}
          {role === 'superadmin' && (
            <button
              onClick={() => setSection(section === 'admin' ? 'home' : 'admin')}
              style={{
                padding: '6px 13px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                background: section === 'admin' ? '#E8632A' : 'rgba(232,99,42,0.15)',
                color: section === 'admin' ? '#fff' : '#E8632A',
                fontFamily: "'Lato', sans-serif", fontSize: '12px', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '5px',
                transition: 'all 0.15s',
              }}
            >
              🛠 {section === 'admin' ? 'Exit Admin' : 'IT Admin'}
            </button>
          )}

          {/* Avatar — clickable to open profile */}
          <button
            onClick={() => setProfileOpen(true)}
            style={{ ...S.navUser, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={S.avatar}>{initials}</div>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{currentUser.name}</span>
          </button>
        </div>
      </nav>

      <main style={{ ...S.main, maxWidth: section === 'admin' ? '1400px' : '1100px', padding: section === 'admin' ? '32px 28px' : undefined }}>
        {renderPage()}
      </main>

      <footer style={S.footer}>
        Pomelo TechOps &nbsp;|&nbsp; Support Hours: Mon–Fri, 9:30 AM – 6:30 PM &nbsp;|&nbsp; Emergency: Slack #techops-urgent
      </footer>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {profileOpen && <ProfileModal currentUser={currentUser} setCurrentUser={setCurrentUser} role={role} onClose={() => setProfileOpen(false)} onLogout={handleLogout} />}
    </div>
  );
}
