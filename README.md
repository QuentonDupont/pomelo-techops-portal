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
npm install --legacy-peer-deps   # eslint-plugin-react peer compat
npm run dev:all                  # starts BFF (:3001) + Vite (:5173) in parallel
```

Open <http://localhost:5173>.

Demo credentials (anything works in the OTP screen):

| Role        | Email                        | Password    |
|-------------|------------------------------|-------------|
| superadmin  | `alex.lee@pomelo.com`        | `Admin123!` |
| superadmin  | `quentondupont@gmail.com`    | (set yours) |
| user        | `kai.nguyen@pomelo.com`      | `User123!`  |
| user        | `prim.srisawat@pomelo.com`   | `User123!`  |

## Scripts

| Script                | What it does |
|-----------------------|-------------|
| `npm run dev`         | Vite dev server only (no API proxy target — won't reach Jira/Anthropic) |
| `npm run server`      | BFF only — needs the env vars below |
| `npm run dev:all`     | Both, with prefixed concurrent output |
| `npm run build`       | Production Vite build into `dist/` (code-split: `vendor-react`, `vendor-docx`, `pdf`, `pdf.worker`) |
| `npm run lint`        | ESLint over `src/` and `server/` |
| `npm run lint:fix`    | Same with `--fix` |
| `npm run format`      | Prettier write across `src/` and `server/` |
| `npm run test:e2e`    | Playwright suite (headless by config, run with `--headed` to watch) |
| `npm run test:e2e:ui` | Playwright UI mode |

## Required env (in `.env.local`, never committed)

```
ANTHROPIC_API_KEY=sk-ant-…    # chat assistant + AI doc extraction
JIRA_API_TOKEN=…              # base64 of "user:apikey" — used by submit-ticket
JIRA_BASE_URL=https://pomelofashion.atlassian.net   # optional override
ALLOWED_ORIGIN=https://…      # REQUIRED in production (no localhost fallback)
NODE_ENV=production           # enables CORS hard-fail
```

The BFF **refuses to start** if `VITE_ANTHROPIC_API_KEY` or `VITE_JIRA_API_TOKEN`
are set — those prefixes are bundled into the client by Vite and would leak the
secret. Use the non-VITE names above.

## Project layout

```
/PomeloTechOpsPortal.jsx       # monolithic shell — auth, nav, App router, all admin pages,
                               # mock data stores (MOCK_USERS, MOCK_TICKETS, AUDIT_LOG, CHAT_SESSIONS),
                               # persistence helpers, password hashing, view-mode pill, chat widget
/server/index.js               # Express BFF: helmet, rate-limit, zod-validated /api/v1/* routes,
                               # central error handler
/src/api/                      # client-side API modules: docsApi, jiraApi, claudeApi
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
