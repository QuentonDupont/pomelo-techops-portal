# NOTICES — Third-Party Dependency Licenses

**Project:** Pomelo TechOps Portal
**Maintained by:** LEXIS, Principal Legal Counsel (IP & Copyright Compliance)
**Effective Date:** 2026-04-06
**Last Reviewed:** 2026-04-06

This file documents all third-party software dependencies used in the Pomelo TechOps Portal, their applicable licenses, and the required attribution notices. Pomelo Fashion is obligated to retain these notices in any internal distribution of this software.

---

## Direct Runtime Dependencies

### react
- **Version:** ^18.3.1
- **License:** MIT
- **Copyright:** Copyright (c) Meta Platforms, Inc. and affiliates.
- **Repository:** https://github.com/facebook/react
- **Usage:** Core UI rendering library
- **Attribution:** License and copyright notice must be retained.

---

### react-dom
- **Version:** ^18.3.1
- **License:** MIT
- **Copyright:** Copyright (c) Meta Platforms, Inc. and affiliates.
- **Repository:** https://github.com/facebook/react
- **Usage:** React DOM renderer for browser environments
- **Attribution:** License and copyright notice must be retained.

---

### axios
- **Version:** ^1.14.0
- **License:** MIT
- **Copyright:** Copyright (c) 2014–present Matt Zabriskie & Collaborators
- **Repository:** https://github.com/axios/axios
- **Usage:** HTTP client for Jira API and Paperclip API requests
- **Attribution:** License and copyright notice must be retained.

---

### docx
- **Version:** ^9.6.1
- **License:** MIT
- **Copyright:** Copyright (c) 2016 Dolan Miu
- **Repository:** https://github.com/dolanmiu/docx
- **Usage:** Generates .docx output files from portal data
- **Attribution:** License and copyright notice must be retained.

---

### file-saver
- **Version:** ^2.0.5
- **License:** MIT
- **Copyright:** Copyright (c) 2016 Eli Grey
- **Repository:** https://github.com/eligrey/FileSaver.js
- **Usage:** Client-side file download trigger
- **Attribution:** License and copyright notice must be retained.

---

### react-dropzone
- **Version:** ^15.0.0
- **License:** MIT
- **Copyright:** Copyright (c) 2018 Param Aggarwal
- **Repository:** https://github.com/react-dropzone/react-dropzone
- **Usage:** Drag-and-drop file upload interface component
- **Attribution:** License and copyright notice must be retained.

---

### jszip

> **FORMAL LICENSE ELECTION — MIT**
>
> JSZip version ^3.10.1 is dual-licensed under MIT and GPL-3.0. The Pomelo TechOps Portal **formally and explicitly elects to use JSZip under the MIT license option**. The GPL-3.0 license option is not adopted and does not apply to this project. This election is recorded here as the authoritative statement of Pomelo Fashion's license choice for this dependency.
>
> This election was reviewed and documented by LEXIS (Principal Legal Counsel) on 2026-04-06 and applies to all current and future versions of JSZip used in this project unless a new formal election is made and recorded in a superseding revision of this file.

- **Version:** ^3.10.1
- **License Elected:** MIT (dual-license — MIT elected; GPL-3.0 NOT adopted)
- **Copyright:** Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso
- **Repository:** https://github.com/Stuk/jszip
- **Usage:** ZIP archive creation for bulk file export features
- **Attribution:** MIT license and copyright notice must be retained.

---

## Direct Development Dependencies

### vite
- **Version:** ^5.4.10
- **License:** MIT
- **Copyright:** Copyright (c) 2019-present, VoidZero Inc. (Evan You)
- **Repository:** https://github.com/vitejs/vite
- **Usage:** Frontend build tooling and dev server (dev only, not shipped in production bundle)
- **Attribution:** License and copyright notice must be retained.

---

### @vitejs/plugin-react
- **Version:** ^4.3.1
- **License:** MIT
- **Copyright:** Copyright (c) 2019-present, VoidZero Inc. (Evan You)
- **Repository:** https://github.com/vitejs/vite-plugin-react
- **Usage:** Vite plugin enabling React fast refresh and JSX transform (dev only)
- **Attribution:** License and copyright notice must be retained.

---

### @playwright/test
- **Version:** ^1.58.2
- **License:** Apache-2.0
- **Copyright:** Copyright (c) Microsoft Corporation.
- **Repository:** https://github.com/microsoft/playwright
- **Usage:** End-to-end testing framework (dev / CI only, not shipped in production bundle)
- **Attribution:** The Apache-2.0 license requires retention of the copyright notice and the license text. No NOTICE file has been identified from upstream as requiring separate inclusion, but the license text must be available upon request per Apache-2.0 Section 4(b).

---

## Fonts — External CDN Asset

### Google Fonts / Lato

- **License:** SIL Open Font License 1.1 (OFL-1.1)
- **Copyright:** Copyright (c) 2010 Łukasz Dziedzic (dziedzic@typoland.com), with Reserved Font Name "Lato".
- **Source:** https://fonts.google.com/specimen/Lato
- **OFL-1.1 Full Text:** https://openfontlicense.org/
- **Usage:** Lato typeface loaded at runtime via Google Fonts CDN (`fonts.googleapis.com` / `fonts.gstatic.com`)
- **Delivery method:** CDN (not self-hosted)

**Privacy flag — OPEN ITEM:**
Loading fonts via Google Fonts CDN causes the end user's browser to make a request to Google's servers. Under the EU Court of Justice ruling (January 2022, LG Munich I), transmitting a user's IP address to Google via an embedded font CDN without explicit consent may constitute a GDPR violation. Although Pomelo TechOps Portal is an internal employee-facing tool and GDPR scope for internal tools carries reduced risk, LEXIS recommends evaluating self-hosting of the Lato font files as a remediation measure. This item remains open pending a decision by CORTEX (CTO) and COMPASS (CPO).

**Recommended action:** Self-host Lato font files under `/public/fonts/` and remove the Google Fonts CDN `<link>` from `index.html`. Assign to FORGE (BE/FE Lead). Priority: MEDIUM.

---

## Note on Transitive Dependencies

This NOTICES file documents direct dependencies only. Transitive (indirect) dependencies are installed under `node_modules/` and carry their own license files. All transitive dependencies are permissive (MIT, ISC, BSD, Apache-2.0) based on the dependency tree of the packages listed above. No copyleft (GPL/AGPL/SSPL) transitive dependencies have been identified. A full transitive audit is available upon request from LEXIS.

---

## Pending Items

| Item | Status | Owner |
|------|--------|-------|
| Paperclip API — full license and ToS review | PENDING — license terms not yet obtained from vendor | FORGE to obtain; LEXIS to review upon receipt |
| Google Fonts / Lato — self-hosting evaluation | OPEN — CDN privacy flag raised | CORTEX / COMPASS decision required |

---

*This document is maintained by LEXIS (Principal Legal Counsel, IP & Copyright Compliance) and must be updated whenever a new dependency is added or an existing dependency is upgraded to a new major version. Any change to this file requires LEXIS sign-off.*
