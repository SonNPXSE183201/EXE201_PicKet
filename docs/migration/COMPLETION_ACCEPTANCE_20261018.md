# Acceptance increment — 2026-10-18

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Source plan: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), steps 1/2. Scope is this increment, not all roadmap capabilities.

## Observed before code changes

- On the signed-in Pixel 5 account, selected May 2026 on Home. May 1 has a receipt marker/thumbnail. Tapping it opened the saved synthetic receipt image and merchant `CUA HANG ANH DAO`; detail showed 250,000 VND and confirmed status. Evidence: `.artifacts/ui-redesign/completion-may.xml`, `completion-receipt-sheet.{xml,png}`, `completion-receipt-detail.xml`. No records were mutated; the receipt was an existing test fixture.
- At font scale 150%, Home's scan FAB was partly covered by the taller navigation bar. Screenshot: `completion-font150.png`. Font was restored to 100% after observation.

## Implemented with RED/GREEN tests

1. Owner-scoped encrypted receipt gallery metadata and image cache, reusing the existing AES-GCM SQLite cache. Images have a 20 MiB base64-character budget per owner and are pruned by current receipt IDs; a changed storage path cannot reuse the previous image. No private signed URLs or access tokens are persisted in gallery metadata. Logout follows existing policy: cached resources remain locked behind the account session, not automatically exposed to guest/another account.
2. Offline gallery load uses only that owner's previously loaded metadata. A request failure without cache remains an error, not an empty calendar. A cache write/disk failure does not discard successfully fetched remote data. Cached data images avoid signed-URL expiry; uncached/failed images expose a retry action.
3. FAB clearance grows with font scale and bottom safe inset to avoid the observed navigation overlap.

RED: new receipt gallery policy and FAB layout tests failed because their intended implementation modules were absent. GREEN: `npm run test:ui` passed 16/16 after implementation. Receipt gallery policy coverage: 100% lines/functions, 96% branches via Node test coverage, for the pure policy only. TypeScript passed. Full mobile suite after gallery policy passed 104 tests; final suite after FAB refinement is recorded separately below.

Final code checks: `npm run test:mobile` passed 105/105, mobile TypeScript passed, lint zero errors/25 existing warnings, changed-file whitespace check passed. No new secrets or logging of tokens were introduced in the changed gallery/cache modules. This is not a whole-repository security audit. A native APK build and device results are separate gates below.

No commits created because the existing mixed worktree must remain separate from unrequested Git operations. No backend migration/deploy or production financial mutation in this increment.

## Not yet claimed

- Cache native offline/restart acceptance waits for the new APK build/install below. Pure tests do not prove Expo native storage/network integration.
- Cache budget means not every historic full-size image can remain offline; photos not previously downloaded or evicted still require a connection. Full receipt edit/detail offline is not implemented by this calendar-specific cache.
- Two-account/expired-token E2E, legacy SQLite/WAL migration, two-device conflict, bulk partial failures, month close UI, real Flutter backup, staff UI, Play sandbox and physical-device biometrics remain in the roadmap.

## Device follow-up

- Native release x86_64 build succeeded (8m59s); `.artifacts/ui-redesign/picket-completion-emulator.apk` installed successfully, retaining the Google session.
- Online May 1 marker was present on the new build (`cache-may-marker.xml`). Enabled airplane mode/Wi-Fi off, force-stopped and relaunched Picket: Home retained the account data and displayed “Đang xem hóa đơn đã lưu trên máy” (`cache-offline-home.xml`). This verifies encrypted metadata cache hydration, not the rendered offline image.
- Further offline-image and font acceptance was interrupted twice by foreground switching to `com.sonnpxse183201.recipehub_mobile`. Stopped input automation rather than operate another app. Restored airplane mode off and Wi-Fi on. Do not mark offline image rendering or FAB visual fix device-verified yet.

## Completed resumed acceptance

- Repeated online May 1 load on the installed completion APK, enabled airplane mode and disabled Wi-Fi, force-stopped/relaunched. Navigated to May 2026 and opened May 1. The full saved receipt image rendered while airplane mode remained enabled: `resume-offline-may.xml`, `resume-offline-image.{xml,png}`. The screenshot visibly includes the airplane indicator and full synthetic receipt. This verifies the previously downloaded image survives native restart offline, not every historic image or offline receipt editing.
- Inspected Home at font scales 150% and 200%: scan FAB is above, not clipped behind, the taller navigation bar (`resume-font150.png`, `resume-font200.png`). It remains an overlay and can cover underlying scroll content until scrolled; this does not constitute full accessibility acceptance.
- Restored font scale 100%, airplane mode off and Wi-Fi on. No existing financial records modified for these checks.

## Bulk archive success acceptance

- Created exactly two disposable expense fixtures in the signed-in test account: `E2E-COMPLETE-1018-A` (1,234 VND) and `E2E-COMPLETE-1018-B` (2,345 VND), using the existing transaction form/default wallet/category. These are separate from pre-existing transactions.
- Opened `/transactions/bulk`, selected only these two named rows, verified the native confirmation explicitly said two transactions, and confirmed archive. UI returned `2/2 giao dịch đã xử lý`, selection count zero, and both fixture rows disappeared (`bulk-select-fixtures.xml`, `bulk-confirm.xml`, `bulk-result.xml`). Fixtures are archived (recoverable server records), not hard-deleted; no receipt/storage objects created.
- This verifies multi-row archive success on Android. Partial-failure/retry remains pending native acceptance; the existing pure `bulk-action.test.ts` covers per-row failure classification but is not substituted for that device scenario.
