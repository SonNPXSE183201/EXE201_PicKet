# Compact web UX — 22 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Delivered and deployed

Production: https://picket.51-79-207-154.sslip.io/login

Runtime source: `38c720b66d3acb5d4ef048ebf165452cb7f70405` on `feat/picket-platform-ocr`.
Image: `picket-web:web-20261022-compact1`.
Release directory: `/opt/picket/releases/web-20261022-compact1`.
Each changed file was committed separately and pushed. Documentation added after deployment does not change the running source revision.

- Replaced the actual Next favicon with a PNG-backed ICO derived from the existing Picket artwork; explicit versioned Picket icon/shortcut/apple metadata also added.
- Login has shorter copy and compact spacing. No global overflow hiding: short screens can still scroll to all controls.
- Four main destinations remain in the user sidebar and phone bottom bar. Account utilities and logout are in the upper-right profile disclosure; notification bell is beside it. Removed “Không gian cá nhân”.
- Primary links explicitly prefetch full routes and expose pending feedback. Selecting the current destination does not request another navigation. No custom cache of financial records was introduced.
- Controls use 40 px desktop / 44 px phone baselines; phone input text remains 16 px. Dashboard quick actions no longer stretch across the whole row.
- Select buttons match Picket. Supported browsers also use branded native pickers with keyboard behavior; unsupported browsers keep their OS picker. Reference: [Chrome customizable select documentation](https://developer.chrome.com/blog/a-customizable-select).
- Receipt capture separates image selection and information review, adds an empty state, compact actions and clearer spacing. Upload consent, rotation, immutable uploads and review-required semantics are retained.

No Expo, shared package, Dart API, database schema, global production setting or landing release was changed.

## TDD and quality gates

Journeys came from the user's screenshots and requested interaction changes.
RED checkpoint: `a39c4d6`; `node --test web/test/compact-workspace.test.mjs` executed four assertions and failed for the missing navigation/login/icon/capture changes.
GREEN: the same four tests pass after implementation; favicon container regression assertions were added in `5d32aec`.

| Gate | Actual result |
| --- | --- |
| `npm run build` in `web` | PASS locally and in production Docker build |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:auth` | 54/54 PASS |
| Node `--experimental-test-coverage` | 97.41% lines, 84.28% branches, 100% functions for loaded test modules |
| `npm audit --omit=dev --audit-level=high` | 0 runtime vulnerabilities |
| `git diff --check` and changed-source secret/debug grep | PASS |

The coverage figure is for modules loaded by the Node tests, not a claim of React/CSS or whole-product coverage. UI source-contract tests supplement, not replace, browser checks.

## Browser and production acceptance

Used generated, separate user/admin QA accounts; credentials stayed in the loopback helper's memory.

- Login at 1366×768, 390×844 and 320×700: document height equals viewport height, no horizontal overflow, all controls accessible without scrolling.
- Six rendered user routes (`dashboard`, `capture`, `accounts`, `profile`, `transactions`, `budgets`) at widths 320/390/768/1366: 24 checks locally and 24 on production, no horizontal overflow. Waited for actual page headings rather than accepting loading fallbacks.
- All six admin routes at widths 390/1366: 12 local and 12 production checks, no horizontal overflow. Phone admin logout returns to `/login`.
- Desktop sidebar: four links; `scrollHeight === clientHeight === 768` in the measured viewport.
- Account disclosure: Escape closes and restores summary focus; outside click closes. Phone logout is visible immediately without scrolling the utility list. Reconciliation confirmation was exercised without modifying real financial data.
- Production sidebar transitions: zero document navigations; one measured sequence was 1142/36/30 ms (first uncached navigation still depends on server/network, repeat destinations were warm). These are observations, not latency guarantees.
- Styled select reports `appearance: base-select`, height 40 px; ArrowDown/Enter selected the bank option without submitting the form.
- Local receipt flow: choose image, rotate, consent, enter merchant/amount and save. Production flow repeated choose/consent/save and showed the review-required status. OCR provider was not invoked or charged by this UX acceptance.
- Screenshots inspected: `output/playwright/compact-login-mobile.png`, `compact-profile-menu.png`, `compact-select.png`, `production-compact-dashboard.png`, `production-compact-capture-mobile.png`, `production-compact-menu-mobile.png` (ignored local QA artifacts, contain only generated QA data).

Candidate preflight: login 200, source-matching favicon, 12 static assets 200, anonymous dashboard redirected to login, anonymous export 401. After activation public favicon bytes matched the committed ICO. Web is running with restart count 0. API/OCR/Caddy container IDs, start times and restart counts match the pre-deployment snapshot. A transient 502 during web replacement was retried successfully by activation health checks.

Cleanup removed the two generated Auth users, their staff/financial fixtures and exactly two generated media objects. Independent Auth inventory confirmed zero remaining release QA accounts. Owner admin and mobile accounts were untouched. Candidate container removed; old image/release retained for rollback.

## Rollback and limits

Restore `/opt/picket/releases/web-20261022-compact1/compose.before.yml` to `/opt/picket/compose.production.yml`, then run production Compose with its existing env file and `up -d --no-deps --no-build web`. Previous image is `picket-web:web-20261022-6993560`; no data rollback is needed.

This is browser UX acceptance, not certification of every mutation, assistive technology, OS picker, Android device, Play Billing or OCR provider. Existing real-device/Billing/staging acceptance gaps remain unchanged. Mobile source was not edited.
