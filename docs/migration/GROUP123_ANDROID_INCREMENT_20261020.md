# Android increment: guest receipt, two-device conflict and split reporting

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Date: 2026-10-20. Source plan: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), groups 1–3. No commit/push, backend change, migration or public ARM64 release in this increment.

Newer follow-up: [ANDROID_EXTENDED_MATRIX_20261020.md](ANDROID_EXTENDED_MATRIX_20261020.md) records additional native results, current APK checksum and 228-test verification. Remaining items below describe this earlier increment and are superseded only for explicitly accepted branches in the newer report.

## Native evidence accepted

Tests use an isolated `com.picket.mobile.qa` package and generated accounts A/B. The user's Google account is not used for ledger mutations.

| Journey | Actual observation | Local evidence under `.artifacts/roadmap-qa/` |
| --- | --- | --- |
| Guest receipt, offline calendar entry | Created a 100,000 VND guest wallet offline; calendar 18 October → library receipt printed 1 May → manual 12,345 VND → saved transaction. Detail had an image. Force-stop/reopen offline retained 87,655 VND and image on 18 October. Network restored and guest exited before cloud login. | `guest-offline-detail.png`, `guest-restart-receipt-final.xml` |
| More than 100 cloud transactions | Deterministic 108-row fixture with two wallets, transfer, split expense and partial refund. Before concurrent edit, native Dashboard matched independently calculated balance 1,112,240, October income 5,250 and net expense 77,206 VND. | `group3-ledger.json` |
| Two Android devices editing one transaction | Android 37.2 queued a title edit offline while Android 35 saved amount 777 and a server note online (version 2). First device reported 409. Explicit title-local/amount-server/category-server/note-server selection queued the merge. After app resume, API was version 3, local title plus server amount/note. Second Android force-stop/reopen displayed the same values. | `two-android-merge-editor.xml`, `two-android-merge-queued.xml`, `two-android-merged-second-device.xml`, `group3-after-merge.json` |
| Split/refund category reporting | The original Insights incorrectly assigned split spending to the original category. New QA APK showed travel 54,244 and food 23,239 VND, net expense 77,483, income 5,250 and net flow −72,233 after the concurrent edit. | `split-fixed-insights-ready.xml` |
| Planning allocations/headline | Final QA APK displayed the same food/travel amounts as Insights and monthly net expense 77,483 VND after subtracting the 100 VND refund. | `planning-split-refund-ready.xml`, `planning-category-second.xml` |
| Full-list search | Native list counted 108 transactions; searching `QA LEDGER 104` returned exactly one matching row. | `ledger-108-native.xml`, `ledger-search-104.xml` |
| Allocation cache after offline restart | First attempt exposed an initial-empty-history cache overwrite. After the guard fix, a fresh online warm followed by airplane mode/force-stop/reopen retained both category amounts and net totals. | `split-cache-warmed-final.xml`, `split-offline-restart-final.xml`, `group3-insights-final.png` |

The second emulator is dedicated `Picket_QA_35`, using an already installed Android 35 Play Store image with 2 GB guest RAM. Android 37.2 required 4 GB even when requested lower; it was not used for the second instance to avoid memory pressure. No existing AVD data was erased.

## Fix and TDD evidence

- Insights and Planning now load actual split allocations in batches of at most 25 transaction IDs using the existing API/client and budget allocation rule. Explicit or proportional refunds reduce the matching categories.
- Split snapshots are stored through the existing encrypted, owner-scoped offline cache. Fallback requires exact month and transaction revision; failure does not silently become zero expenditure.
- Initial provider hydration exposes an empty list. Its zero-request successful split load no longer overwrites the previously populated durable snapshot. This additional regression was RED then GREEN and the offline native rerun passed; no claim of instant cache-first rendering is made.
- Planning blocks month close while allocations are unavailable, and displays `—` instead of a provisional unsplit amount. Its monthly total now subtracts refunds, matching server month-close semantics.
- Regression target: `apps/mobile/src/core/ui/category-spending.test.ts`. Initial missing helper was RED; implementation was GREEN. Additional presentation/close guards were RED before the corresponding changes and GREEN afterwards. Source-contract assertions are not React/native rendering coverage.
- `npx tsx --test` over the existing API/auth/billing/subscription/transaction/notification/keepsake/OCR/export/sync/UI targets: final **203 passed, 0 failed**. The focused target has four tests, including the hydration cache guard.
- Focused Node coverage for `category-spending.ts`: **100% lines, 92.31% branches, 88.89% functions**. This is not whole-app or hook coverage.
- Final typecheck passed; lint **0 errors/23 existing warnings** after removing unused router imports in the two touched screens. Scoped secret/log scan had no matches; scoped `git diff --check` passed. This is not a full security audit.
- QA and production x86_64 Gradle release builds passed. Production package/signature and HTTPS API endpoint were checked, with no QA proxy URL in the bundle. Installed production APK with `adb install -r`, retained Google session and opened Dashboard; no main-account mutations were performed. Current local artifact: `.artifacts/ui-redesign/picket-completion-emulator.apk`, 72,209,648 bytes, SHA-256 `5b518eb61566ef27badac216c1e476ff1ece98b33e059d769c868872aeadffa0`.
- Generated cloud accounts A/B and their ledger/budgets were purged, QA media folders cleaned, proxy stopped, network restored, QA data on the primary emulator cleared. Second emulator is stopped; its dedicated AVD is retained for future two-device tests (generated test cache only, cloud accounts deleted). Existing AVDs/main application storage were not erased. Public landing APK was not replaced. No TDD checkpoint commits were made because the user explicitly prohibited commits.

## Remaining acceptance—not implied complete

- Group 1: multi-receipt same day, denied permissions/Settings/resume, camera hardware quality, image URL expiry/account change, full font/cursor/large-number matrix.
- Group 2: real token expiry A–B offline, receipt cache eviction/budget, disk-full/WAL recovery and race stress, keepsake media encryption/bounded local orphan cleanup.
- Group 3: broader mixed validation/network bulk failures, repeated conflict/keep-server/cancel variants, concurrent month-close/rollover, Review Inbox receipt fixtures and cross-screen consistency. Prior reports cover only their named tested branches.
- Dedicated physical-device, Play sandbox, staff/admin and authentic Flutter-backup requirements remain separate. Synthetic fixtures and emulator results cannot substitute for them.
