# Web receipt review status — TDD evidence

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Date: 2026-10-16. Source: [FEATURE_PARITY.md](FEATURE_PARITY.md), Accessibility and OCR review/confidence.

Journey: when opening a saved receipt on Next.js, a user should immediately know whether the receipt needs review or has been confirmed, including with a screen reader.

| Stage | Command | Result |
| --- | --- | --- |
| RED | `npm run test:auth` in `web` | New source-policy test failed: detail page did not inspect `review_required`. |
| GREEN | `npm run test:auth` in `web` | 3/3 tests pass; detail page renders an announced status for review-required and confirmed receipts. |
| Regression | `npm run build`, `npm run lint`, `npm run typecheck` in `web` | All pass; production build includes dynamic `/receipts/[id]`. |

The new test is a static accessibility policy, not a browser/screen-reader E2E test. Authenticated keyboard and screen-reader testing across the web app remains open. No production deployment was performed, and no TDD checkpoint commit was made because this worktree contains unrelated uncommitted changes and the user did not request a commit.
