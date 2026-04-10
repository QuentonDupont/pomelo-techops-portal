# QA Report — Pomelo TechOps Portal
**Date:** 2026-03-31
**Project root:** /Users/quenton-d/techops
**Framework:** React + Vite (JSX, no TypeScript)
**App URL:** http://localhost:5173 (ran on :5175 during this session — :5173/:5174 were occupied)

---

## Overall Verdict: FAIL

Two issues prevent a clean PASS, both in the Backend domain. Frontend and DevOps pass cleanly.

---

## Agent 2 — Frontend QA Report

**Verdict: PASS**

### Test Configuration
- Browser: Chromium (non-headless — browser visible on screen during run)
- Test runner: Playwright 1.58.2 (installed at `/Users/quenton-d/techops/node_modules/@playwright/test`)
- Viewports tested: 375×812, 812×375, 768×1024, 1440×900, 1920×1080

### Screen-by-Screen Results (all 5 viewports)

| Screen | Viewports | Result | Notes |
|---|---|---|---|
| Login page | All 5 | PASS | Email + password inputs present; no raw markdown rendered |
| Home / Dashboard | All 5 | PASS | Dashboard content visible post-login; no raw markdown headings |
| Submit Ticket | All 5 | PASS | Nav accessible; priority/category/description form content visible |
| Documentation Library | All 5 | PASS | Nav accessible; doc cards rendered; no raw markdown in list view |
| My Tickets | All 5 | PASS | Nav item accessible and resolves |

### Component-Level Checks

| Component | Result | Notes |
|---|---|---|
| Login form inputs | PASS | Fills and submits correctly |
| Inline markdown renderer | PASS | `renderInline` and `renderContent` in `DocImportExportPage.jsx` handle `**bold**`, `` `code` ``, `## headings`, `- lists`, fenced code blocks — none leak as raw text |
| Raw markdown scan (all screens) | PASS | No `## heading` or `**bold**` patterns in rendered `innerText` at any viewport |
| Navigation routing | PASS | Submit Ticket and Docs Library routes resolve correctly |

### Summary
50 automated checks, 0 failures across 5 viewports × 5 screens.

---

## Agent 3 — Backend QA Report

**Verdict: FAIL**

### Architecture Note
There is no real backend. All persistence is in-memory via `mockStore` (module-level `let` in `src/api/docsApi.js`) seeded from `MOCK_DOCS`. Session auth is via `sessionStorage` + `btoa` hashing. No database exists.

### Mock Function Verification

| Function | Status | Notes |
|---|---|---|
| `listDocs(filters)` | PASS | Filters by category, format, status, search. Paginates correctly. Returns `{ docs, total, page, pages }`. |
| `getDoc(id)` | PASS | Finds by id, increments `viewCount`, throws `'Document not found.'` if missing — caught by `wrap()`, returned as `{ data: null, error: string }`. |
| `uploadDocs(fileMetaList, onProgress)` | PASS | Generates correct doc shape, calls `onProgress`, pushes to `mockStore` via `unshift`. Uses Claude API if key configured, falls back to raw text / structured placeholder. |
| `updateDoc(id, updates)` | PASS | Merges updates, sets `updatedAt: new Date().toISOString()`. Throws on missing id. |
| `deleteDoc(id)` | PASS | Soft-deletes: sets `status: 'Archived'`, sets `updatedAt`. Throws on missing id. |
| `getCategories()` | PASS | Returns category counts for `status === 'Active'` docs only. |
| `bulkExportDocs(ids)` | PASS | Filters mockStore by ids array. No role check (acceptable — export is UI-controlled). |
| `restoreDoc(id)` | PASS | Delegates to `updateDoc(id, { status: 'Active' })` — correct, `updatedAt` is set automatically. |
| `bulkArchive(ids)` | **FAIL** | Does NOT set `updatedAt` when archiving. Every other mutation (`updateDoc`, `deleteDoc`, `restoreDoc`) sets `updatedAt`; `bulkArchive` mutates `status` only (`src/api/docsApi.js` lines 288–290). |

### Error Shape Consistency

All public functions use the `wrap()` helper which guarantees `{ data: T | null, error: string | null }` on both success and failure. Shape is consistent across all 8 functions. Error messages are human-readable strings — no raw exception objects exposed.

### Visibility / Role-Based Access Enforcement

| Check | Result | Notes |
|---|---|---|
| `listDocs` filters by `visibility` | **FAIL** | `listDocs` does NOT filter by `visibility`. `doc-009` ("IT Onboarding Checklist (Manager)") has `visibility: 'IT Team Only'` but is returned to all authenticated users regardless of role. |
| `displayDocs` client-side visibility filter | **FAIL** | `DocImportExportPage.jsx` line 324 — `displayDocs` filter checks only `catTab` and `localSearch`; no visibility check. Regular `role: 'user'` accounts can see and open IT-only documents. |
| `getDoc` visibility check | FAIL (same root cause) | No visibility guard on individual document fetch. |
| UI visibility badge (admin table) | PASS | `DocAdminPanel.jsx` correctly displays `🔒 IT only` vs `🌐 Public` labels. |
| Bulk visibility update | PASS | `updateDoc(id, { visibility: bulkVis })` called correctly from `DocImportExportPage.jsx` line 380. |

### Auth Enforcement

| Check | Result | Notes |
|---|---|---|
| Session persistence | PASS | `sessionStorage` used correctly; session restored on page load (line 3128 of `PomeloTechOpsPortal.jsx`). |
| Password hashing | PASS | `btoa('salt_' + userId + '_' + password)` — intentional mock, not a real credential hash. |
| Lockout mechanism | PASS | `LOCK_KEY` in sessionStorage tracks failed attempts; lockout logic present at lines 283–316. |
| Route guard (`admin` section) | PASS | Line 3166: `role === 'superadmin' ? <AdminPage /> : <HomePage />` — non-admins cannot reach AdminPage. |
| Signup creates `role: 'user'` only | PASS | Line 328: all new self-registered users are assigned `role: 'user'`. |

### Findings Summary
- **FAIL 1:** `bulkArchive` does not set `updatedAt` on archived documents — inconsistency with `deleteDoc`/`updateDoc`.
- **FAIL 2:** `visibility: 'IT Team Only'` is not enforced at the API (`listDocs`, `getDoc`) or UI (`displayDocs` derivation) level — all docs are visible to all authenticated users regardless of role.

---

## Agent 4 — DevOps QA Report

**Verdict: PASS**

### Build

| Check | Result | Notes |
|---|---|---|
| `npm run build` exits 0 | PASS | Build completes in 1.31 s, 109 modules transformed |
| Build output present | PASS | `dist/index.html` and `dist/assets/index-xaUhxNKG.js` generated |
| Build warnings | WARNING (non-blocking) | Single chunk is 862 KB (254 KB gzip). Vite warns chunks > 500 KB. Not a blocking error — app functions correctly. Recommend `build.rollupOptions.output.manualChunks` in a future sprint. |
| TypeScript compilation | N/A | Project is JSX-only — no TypeScript files, no `tsc` step required. |

### Dev Server

| Check | Result | Notes |
|---|---|---|
| `npm run dev` starts cleanly | PASS | Server ready in 199 ms |
| App responds HTTP 200 | PASS | Confirmed via `curl` |

### Environment Variables

| Variable | Status | Notes |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | WARNING | Present in `.env.local` but value is empty. App handles this gracefully — `isClaudeConfigured()` returns `false`, structured placeholder content is used for binary file uploads. Not blocking. |
| `VITE_API_BASE_URL` | Not set (intentional) | Absence triggers `USE_MOCK = true` — the designed operating mode. |

### Hardcoded Credentials Scan

| Check | Result | Notes |
|---|---|---|
| Hardcoded Anthropic API keys (`sk-ant-*`) | PASS | None found in source |
| Inline secret assignments | PASS | No `password = "..."`, `secret = "..."`, `token = "..."` literals in source files |
| Mock `btoa` password hashes in `PomeloTechOpsPortal.jsx` lines 290–293 | PASS (intentional) | `btoa('salt_u1_Admin123!')` etc. are explicit mock credentials for a UI-only demo with no backend. No real secrets. |
| Pre-computed base64 hash (`c2FsdF91NF9...`) for u4 | PASS (intentional) | Same classification as above — mock user only. |

### Dependency Audit

| Check | Result | Notes |
|---|---|---|
| All `dependencies` installed | PASS | `axios`, `docx`, `file-saver`, `jszip`, `react`, `react-dom`, `react-dropzone` all present in `node_modules` |
| All `devDependencies` installed | PASS | `@playwright/test`, `@vitejs/plugin-react`, `vite` all present |
| `node_modules` count | PASS | 91 top-level packages installed |

### CSS Breakpoints Audit

No `@media` query breakpoints found. The application uses inline styles exclusively (the `style=` JSX prop pattern throughout `PomeloTechOpsPortal.jsx` and all component files). Responsive layout is achieved via `flexWrap`, percentage widths, and `minWidth`/`maxWidth`. The Playwright viewport tests confirmed all 5 target viewports render and function correctly.

---

## Consolidated Issue Tracker

| # | Severity | Domain | File | Description |
|---|---|---|---|---|
| 1 | High | Backend | `src/api/docsApi.js` line 288–290 | `bulkArchive` does not set `updatedAt` on mutated documents — inconsistent with every other mutation function |
| 2 | High | Backend | `src/api/docsApi.js` + `src/components/docs/DocImportExportPage.jsx` line 324 | `visibility: 'IT Team Only'` is not enforced — all authenticated users can view and open IT-only documents |
| 3 | Info | DevOps | `vite.config.js` | Single JS bundle is 862 KB (254 KB gzip); consider code-splitting |
| 4 | Warning | DevOps | `.env.local` | `VITE_ANTHROPIC_API_KEY` is empty; AI content extraction is disabled |

---

## Recommended Fixes

**Fix 1 — `bulkArchive` missing `updatedAt`** (`src/api/docsApi.js` line 290):
```js
// Before:
mockStore[idx] = { ...mockStore[idx], status: 'Archived' };
// After:
mockStore[idx] = { ...mockStore[idx], status: 'Archived', updatedAt: new Date().toISOString() };
```

**Fix 2 — Enforce visibility filter** (two locations):

Option A — server-side (preferred): add `userRole` param to `listDocs` and filter there:
```js
if (d.visibility === 'IT Team Only' && userRole !== 'superadmin') return false;
```

Option B — client-side: add to `displayDocs` derivation in `DocImportExportPage.jsx` line 324:
```js
const displayDocs = manager.docs.filter(d => {
  if (d.visibility === 'IT Team Only' && role !== 'superadmin') return false;
  if (catTab !== 'All' && d.category !== catTab) return false;
  // ... rest of existing filter
});
```

---

*QA pipeline run: 2026-03-31. Frontend tested with Playwright 1.58.2 (non-headless Chromium). Backend and DevOps assessed via static analysis and direct code inspection.*
