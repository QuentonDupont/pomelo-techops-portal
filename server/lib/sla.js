// server/lib/sla.js
// Pure SLA math — no DB access. Deadlines are persisted on the ticket row;
// pause time (status = Waiting for Customer) accumulates in sla_paused_ms and
// shifts both deadlines forward when the clock resumes.

// Statuses that stop the SLA clock (waiting on the requester, not on us).
export const SLA_PAUSED_STATUSES = new Set(['Waiting for Customer']);

// Terminal statuses — mirrors DONE_STATUSES in src/lib/constants.js (server
// modules avoid importing browser-bundled constants to keep the BFF lean).
export const SLA_DONE_STATUSES = new Set([
  'Live',
  "Closed - Won't Do",
  'Resolved',
  'Done',
  'Closed',
]);

// Compute both deadlines from a start instant and a policy row.
export function computeDueDates(startedAt, policy) {
  const start = new Date(startedAt).getTime();
  return {
    responseDueAt: new Date(start + policy.response_minutes * 60_000),
    resolutionDueAt: new Date(start + policy.resolution_minutes * 60_000),
  };
}

// Recompute deadlines after a priority change: the elapsed *active* time is
// preserved, the remaining budget switches to the new policy. Deadlines are
// re-anchored at created_at + accumulated pause.
export function recomputeDueDates(ticket, policy) {
  const anchor = new Date(ticket.created_at).getTime() + Number(ticket.sla_paused_ms || 0);
  return {
    responseDueAt: new Date(anchor + policy.response_minutes * 60_000),
    resolutionDueAt: new Date(anchor + policy.resolution_minutes * 60_000),
  };
}

// When a paused ticket resumes, both deadlines shift forward by the pause
// length. Returns the fields to persist.
export function resumeFromPause(ticket, now = new Date()) {
  if (!ticket.sla_paused_at) return null;
  const pausedMs = now.getTime() - new Date(ticket.sla_paused_at).getTime();
  const shift = d => (d ? new Date(new Date(d).getTime() + pausedMs) : null);
  return {
    slaPausedMs: Number(ticket.sla_paused_ms || 0) + pausedMs,
    responseDueAt: shift(ticket.response_due_at),
    resolutionDueAt: shift(ticket.resolution_due_at),
  };
}

// Percentage of an SLA budget consumed (0..1+), for approaching-breach warnings.
export function fractionConsumed(createdAt, dueAt, pausedMs, now = new Date()) {
  if (!dueAt) return 0;
  const start = new Date(createdAt).getTime() + Number(pausedMs || 0);
  const total = new Date(dueAt).getTime() - start;
  if (total <= 0) return 1;
  return (now.getTime() - start) / total;
}
