// src/components/docs/studio/templates.js
// Starter templates for the Documentation Studio. Each provides default
// metadata + Markdown scaffolding so authors don't start from a blank page.

export const TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Page',
    icon: '📝',
    description: 'Start from scratch.',
    category: 'Other',
    content: '',
  },
  {
    id: 'runbook',
    name: 'Runbook',
    icon: '📘',
    description: 'Operational procedure for a recurring task or incident.',
    category: 'Policies',
    content: `# Runbook: <Service / Task>

:::info
**Owner:** <team>  ·  **Last reviewed:** <date>  ·  **Severity:** <P1–P4>
:::

## Purpose
What this runbook covers and when to use it.

## Prerequisites
- Access / permissions required
- Tools needed

## Procedure
1. First step
2. Second step
3. Third step

## Verification
- [ ] Confirm the service is healthy
- [ ] Confirm metrics are nominal

## Rollback
Steps to undo the change if something goes wrong.

## Escalation
Who to contact and how, if the procedure fails.`,
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    icon: '🗒️',
    description: 'Agenda, decisions, and action items.',
    category: 'Other',
    content: `# Meeting Notes — <Topic>

**Date:** <date>  ·  **Attendees:** <names>

## Agenda
1. Item one
2. Item two

## Discussion
- Key point

## Decisions
:::success
- Decision made
:::

## Action Items
- [ ] Owner — task — due date
- [ ] Owner — task — due date`,
  },
  {
    id: 'howto',
    name: 'How-To Guide',
    icon: '🧭',
    description: 'Step-by-step instructions for end users.',
    category: 'Software & Apps',
    content: `# How to <do something>

## Overview
A sentence on what the reader will accomplish.

## Before you begin
:::note
List anything the reader needs first.
:::

## Steps
1. Do this
2. Then this
3. Finally this

## Troubleshooting
| Problem | Fix |
| --- | --- |
| Symptom A | Resolution A |
| Symptom B | Resolution B |

## Related
- [Link to related doc](https://)`,
  },
  {
    id: 'decision',
    name: 'Decision Log',
    icon: '⚖️',
    description: 'Record an architectural or process decision (ADR).',
    category: 'Policies',
    content: `# Decision: <Title>

**Status:** Proposed · Accepted · Superseded  ·  **Date:** <date>

## Context
What problem are we solving and what constraints apply?

## Options Considered
1. **Option A** — pros / cons
2. **Option B** — pros / cons

## Decision
:::success
We chose **<option>** because …
:::

## Consequences
- Positive outcome
- Trade-off accepted`,
  },
  {
    id: 'postmortem',
    name: 'Incident Postmortem',
    icon: '🔥',
    description: 'Blameless review of an incident.',
    category: 'Security',
    content: `# Incident Postmortem — <Title>

:::error
**Severity:** <SEV>  ·  **Duration:** <start>–<end>  ·  **Impact:** <users/services affected>
:::

## Summary
One paragraph describing what happened.

## Timeline
| Time | Event |
| --- | --- |
| 00:00 | Detection |
| 00:05 | Investigation began |
| 00:30 | Mitigated |

## Root Cause
What actually caused the incident.

## Resolution
How it was fixed.

## Action Items
- [ ] Preventative fix — owner — due
- [ ] Monitoring improvement — owner — due

## Lessons Learned
:::warning
What we'd do differently next time.
:::`,
  },
];
