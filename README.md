# Pomelo TechOps Portal

Internal IT operations portal for Pomelo. Lets users submit and track support
tickets, browse the IT documentation library, and chat with an AI assistant.
Lets admins manage the user roster, watch live ticket health, leave internal
notes, audit every admin action, and toggle a site-wide maintenance banner.

## Stack

- **Frontend:** React 18 + Vite 5, vanilla CSS-in-JS, no framework theming
- **BFF:** Express 5 (`server/index.js`) — proxies Jira and Anthropic so secrets
  never reach the client bundle
- **Auth (demo):** in-memory `MOCK_USERS` with SHA-256 + per-user salt; legacy
  btoa hashes are accepted once and auto-upgraded on login
- **Persistence (demo):** `localStorage` under `pomelo:v1:*` keys for users,
  tickets, audit log, chat sessions, and maintenance state
- **Tests:** Playwright (headed by default — see `playwright.config.js`)

## Running locally

```bash
npm install      # clean install — no --legacy-peer-deps needed
npm run dev:all  # starts BFF (:3001) + Vite (:5173) in parallel
```

Open <http://localhost:5173>.

Demo credentials — **dev builds only**; production bundles ship zero seeded
accounts (real accounts come from the backend, or self-signup in mock mode).
Anything works in the OTP screen:

| Role        | Email                        | Password    |
|-------------|------------------------------|-------------|
| superadmin  | `demo.admin@example.com`     | `Demo123!`  |
| user        | `demo.user@example.com`      | `Demo123!`  |

## Scripts

| Script                | What it does |
|-----------------------|-------------|
| `npm run dev`         | Vite dev server only (no API proxy target — won't reach Jira/Anthropic) |
| `npm run server`      | BFF only — needs the env vars below |
| `npm run dev:all`     | Both, with prefixed concurrent output |
| `npm run build`       | Production Vite build into `dist/` (code-split: `vendor-react`, `vendor-docx`, `pdf`, `pdf.worker`) |
| `npm run lint`        | ESLint over `src/`, `server/`, and `PomeloTechOpsPortal.jsx` |
| `npm run lint:fix`    | Same with `--fix` |
| `npm run format`      | Prettier write across `src/`, `server/`, and `PomeloTechOpsPortal.jsx` |
| `npm run test:e2e`    | Playwright suite (headed by config — see `playwright.config.js`) |
| `npm run test:e2e:ui` | Playwright UI mode |

## Required env (in `.env.local`, never committed)

```
ANTHROPIC_API_KEY=sk-ant-…    # chat assistant + AI doc extraction
JIRA_API_TOKEN=…              # base64 of "user:apikey" — used by submit-ticket
JIRA_BASE_URL=https://pomelofashion.atlassian.net   # optional override
JIRA_WEBHOOK_SECRET=…         # REQUIRED in production — webhook rejects all traffic without it
ALLOWED_ORIGIN=https://…      # REQUIRED in production; comma-separated list allowed
NODE_ENV=production           # enables CORS hard-fail
COOKIE_SECURE=true            # session-cookie Secure flag override (defaults to true in prod)

# Backend mode (optional — app runs on mock/localStorage without these)
DATABASE_URL=postgres://…     # activates the DB-backed /api/{auth,tickets,users,roles,audit,docs}
JWT_SECRET=…                  # REQUIRED once DATABASE_URL is set
VITE_API_BASE_URL=https://…   # client-side switch: point the SPA at the BFF
```

See `.env.example` (committed) for the full annotated reference.

The BFF **refuses to start** if `VITE_ANTHROPIC_API_KEY` or `VITE_JIRA_API_TOKEN`
are set — those prefixes are bundled into the client by Vite and would leak the
secret. Use the non-VITE names above.

## Project layout

```
/PomeloTechOpsPortal.jsx       # app shell — nav, section switch, page components, mock data
                               # stores (MOCK_USERS, MOCK_TICKETS, AUDIT_LOG, CHAT_SESSIONS);
                               # being decomposed into src/ slice by slice
/server/index.js               # Express BFF entrypoint: helmet, CORS, rate-limit, router mounting,
                               # central error handler
/server/routes/                # jira.js, webhooks.js, anthropic.js (proxy) + DB-backed
                               # auth/tickets/users/roles/audit/docs (active with DATABASE_URL)
/server/lib/                   # shared log + Jira helpers
/src/api/                      # client API modules: client (shared base), authApi, ticketsApi,
                               # usersApi, rolesApi, auditApi, docsApi, jiraApi, claudeApi
/src/lib/                      # store (localStorage), localAuth, constants, styles
/src/components/               # broken-out components: docs/, NotificationBell
/src/context/                  # NotificationContext (in-memory notifications + bell)
/src/hooks/                    # useDocumentManager
/src/mocks/                    # seed data for docs
/tests/                        # Playwright specs:
                               #   - smoke.spec.js          (login + build integrity)
                               #   - notification-qa.spec.js (bell, dropdown, navigation)
                               #   - admin-features.spec.js  (Sprints 4–11 admin coverage)
```

## Charter

This repo follows the charter at [`CLAUDE.md`](./CLAUDE.md). Highlights:

- **R-06** Security by default — no client-bundled secrets, validated inputs,
  helmet headers, per-IP rate-limit, sanitized upstream errors
- **R-07** Test before ship — Playwright suite must pass on every PR
- **R-10** Immutable audit trail — every admin action lands in the in-memory
  audit log; viewable on the **📜 Audit** page
- **R-13** Accessibility — all modals carry `role="dialog"` + `aria-modal` +
  labels; every input/button has an accessible name; modal focus is trapped

## What's mocked vs. real

This is a portal demo. **Tickets, users, audit, and chat sessions are stored
client-side in `localStorage`**. The BFF only proxies external services (Jira
+ Anthropic) — it does not own data. For production you'd want a real database
and real auth provider behind these flows.
