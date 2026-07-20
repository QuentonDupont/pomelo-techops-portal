// server/email.js
// Transactional email for verification, invites, and password resets.
//
// Provider: Resend (called over plain fetch — no SDK dependency). If no
// RESEND_API_KEY is configured, emails are logged to stdout instead so the
// flows are fully testable in dev (the link appears in the server log).

const FROM = process.env.EMAIL_FROM || 'TechOps <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

async function deliver({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(
      JSON.stringify({ level: 'info', msg: 'email (dev log — no provider)', to, subject, text })
    );
    return { delivered: false, dev: true };
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`Email send failed (${resp.status}): ${detail.slice(0, 200)}`);
  }
  return { delivered: true };
}

const wrap = (heading, body, cta) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h2 style="color:#111">${heading}</h2>
    <p style="color:#444;line-height:1.6">${body}</p>
    ${cta ? `<p><a href="${cta.href}" style="display:inline-block;background:#6366F1;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${cta.label}</a></p>` : ''}
    <p style="color:#999;font-size:12px;margin-top:24px">Pomelo TechOps Portal</p>
  </div>`;

export function sendVerifyEmail(to, token) {
  const href = `${APP_URL}/verify?token=${token}`;
  return deliver({
    to,
    subject: 'Verify your TechOps account',
    text: `Verify your account: ${href}`,
    html: wrap(
      'Verify your account',
      'Confirm your email to finish setting up your TechOps account.',
      {
        href,
        label: 'Verify email',
      }
    ),
  });
}

export function sendInviteEmail(to, token, roleLabel) {
  const href = `${APP_URL}/accept-invite?token=${token}`;
  return deliver({
    to,
    subject: "You've been invited to the TechOps Portal",
    text: `Accept your invite: ${href}`,
    html: wrap(
      'You’ve been invited',
      `You've been invited to the Pomelo TechOps Portal as <b>${roleLabel || 'a member'}</b>. Set your password to get started.`,
      { href, label: 'Accept invite' }
    ),
  });
}

// SLA warning/breach notice for assignees and watchers. kind is
// 'approaching' | 'breached'; metric is 'response' | 'resolution'.
export function sendSlaEmail(to, ticketKey, ticketTitle, kind, metric) {
  const href = `${APP_URL}/#board`;
  const subject =
    kind === 'breached'
      ? `SLA breached: ${ticketKey} ${metric} target missed`
      : `SLA at risk: ${ticketKey} ${metric} target almost consumed`;
  return deliver({
    to,
    subject,
    text: `${subject} — ${ticketTitle}. ${href}`,
    html: wrap(
      kind === 'breached' ? 'SLA breached' : 'SLA at risk',
      `<b>${ticketKey}</b> — ${ticketTitle}<br/>The ${metric} SLA target ${
        kind === 'breached' ? 'has been missed' : 'is nearly consumed'
      }.`,
      { href, label: 'Open the board' }
    ),
  });
}

// Approval request → the designated approver.
export function sendApprovalEmail(to, ticketKey, ticketTitle, requestedBy) {
  const href = `${APP_URL}/#approvals`;
  return deliver({
    to,
    subject: `Approval needed: ${ticketKey}`,
    text: `${requestedBy} requested your approval on ${ticketKey} — ${ticketTitle}. ${href}`,
    html: wrap(
      'Approval needed',
      `<b>${ticketKey}</b> — ${ticketTitle}<br/>Requested by ${requestedBy}.`,
      { href, label: 'Review request' }
    ),
  });
}

// Decision → the requester.
export function sendApprovalDecidedEmail(to, ticketKey, ticketTitle, decision, comment) {
  const href = `${APP_URL}/#mytickets`;
  return deliver({
    to,
    subject: `${ticketKey} ${decision}`,
    text: `Your request ${ticketKey} — ${ticketTitle} was ${decision}.${comment ? ` Comment: ${comment}` : ''} ${href}`,
    html: wrap(
      `Request ${decision}`,
      `<b>${ticketKey}</b> — ${ticketTitle}<br/>${comment ? `Approver comment: “${comment}”` : ''}`,
      { href, label: 'View your tickets' }
    ),
  });
}

// CSAT survey → the requester after resolution.
export function sendCsatEmail(to, ticketKey, ticketTitle, token) {
  const href = `${APP_URL}/#csat?token=${token}`;
  return deliver({
    to,
    subject: `How did we do on ${ticketKey}?`,
    text: `Your request ${ticketKey} — ${ticketTitle} was resolved. Rate the support you received: ${href}`,
    html: wrap(
      'How did we do?',
      `<b>${ticketKey}</b> — ${ticketTitle} has been resolved. We'd love a quick rating.`,
      { href, label: 'Rate your experience' }
    ),
  });
}

export function sendResetEmail(to, token) {
  const href = `${APP_URL}/reset?token=${token}`;
  return deliver({
    to,
    subject: 'Reset your TechOps password',
    text: `Reset your password: ${href}`,
    html: wrap(
      'Reset your password',
      'We received a request to reset your password. This link expires in 1 hour. If you didn’t ask for this, ignore this email.',
      { href, label: 'Reset password' }
    ),
  });
}
