# Extended Android acceptance matrix — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Follow-up to [GROUP123_ANDROID_INCREMENT_20261020.md](GROUP123_ANDROID_INCREMENT_20261020.md). Tests use the isolated QA package and generated cloud owners, not mutations to the user's Google ledger. No backend/migration, commit/push or public APK replacement.

## Observed acceptance

Evidence paths below are under local `.artifacts/roadmap-qa/`; they are not committed fixtures.

| Area | Actual result | Evidence |
| --- | --- | --- |
| Offline A–B–A | Pending title survives restart/logout; offline new login rejected; B sees only B data; returning A replays its own update. | `emulator-matrix-results.json` |
| Client token clock | Advancing emulator time two hours offline retains cached session/data. Clock restored. This is not server-side expiry/revocation acceptance. | `qa-clock-state.json`, emulator matrix |
| Legacy queue/WAL | QA plaintext queue payload migrated to `enc-v1:`, retained offline and replayed once after reconnect. | `emulator-5554-legacy-queue-native.xml`, `emulator-5554-legacy-reconnect.xml` |
| Full storage | A bounded 2 MiB tmpfs over only QA SQLite storage returned ENOSPC. Wallet save failed; after unmount the original DB recovered and a new wallet saved exactly once. No host disk was filled. | `emulator-5554-storage-full-result.xml` |
| Camera lifecycle | Denial/permanent denial, Settings intent, grant/resume, background/resume and library cancel retained usable camera controls. Grant was injected through adb; this is not a camera hardware-quality test. | `emulator-5556-camera-*.xml` |
| Native cloud JSON restore | Actual app export via Share Sheet → Document Picker → restore removed a post-export QA mutation; re-export/API matched the original one-row snapshot. | `native-backup-results.json` |
| Guest encrypted image restore | Actual guest `.picket` export/restore/re-export preserved the complete decoded payload and receipt image checksum. Ciphertexts differed as expected. Wrong password rejected without changing balance 87,655 VND. | `guest-encrypted-roundtrip-results.json`, `backup-wrong-password-results.json` |
| Receipt owner isolation | B could not sign A's image and had an empty calendar; A's warmed image survived offline force-stop/reopen. | `receipt-owner-results.json` |
| Review Inbox | Review-required receipt was confirmed; uncategorized transaction assigned a both-kind category; resolved flags disappeared, duplicate warnings remained. | `review-matrix-results.json`, `emulator-5554-review-inbox-resolved-final.xml` |
| Bulk authoritative validation | Open-month row archived, closed-month row rejected: 1/2. Retry retained only the rejected row and reported 0/1; server rows matched. | `bulk-locked-results.json` |
| Concurrent close | Two API clients raced month-close: one success, one conflict. Split/refund net expense 900; carry applied once. Native Android read back closed month and next limits 19,440/19,660. | `planning-race-results.json`, `emulator-5554-planning-race-native-*.xml` |
| Money input | Zero, negative, above-domain maximum and unsafe integer rejected before mutation; 1,234,567 displayed as `1.234.567`. | `money-native-results.json` |
| Guest reminders | Native bill creation preserved 5,000 VND. Repeated reminder updates registered one future OS alarm; turning reminders off removed it. Enabled preference survived restart. Actual delivery/reboot rescheduling remains unverified. | `qa35-alarm-scheduled.txt`, reminder XML |
| Accessibility sample | Dashboard captured at 360 dp/font 150% and 200%. TalkBack service registered, but system permission UI interrupted focus traversal; no spoken-audio audit accepted. | `font-*-360dp-*.png`, `talkback-smoke-results.json` |

The encrypted guest backup is Expo-produced, not an authentic historical Flutter export. Concurrent close uses two API clients plus Android readback, not two simultaneous UI submissions.

## Fixes driven by native testing

- Transaction creation and guest persistence reject invalid/unsafe/out-of-domain amounts before writes.
- Transaction editor includes categories whose kind is `both`; a restored category can now resolve Review Inbox.
- Date picker dismisses the amount keyboard before opening. Previously returning from the calendar could leave the keyboard over the submit button and accidentally append a digit.
- At font scale 150% or higher, or width below 360 dp, the floating scan action uses an icon-only button while retaining its accessibility label. Normal-size presentation is unchanged.
- New regression assertions were observed RED then GREEN. Source-contract assertions do not substitute for rendered/native tests.

Verification: all discovered mobile `src/**/*.test.ts` **228 passed / 0 failed**, TypeScript PASS, lint **0 errors / 23 pre-existing warnings**. Focused FAB policy coverage: 100% lines / 87.5% branches / 80% functions; guest-finance coverage: 100% lines / 78.26% branches / 87.88% functions. These are not whole-app coverage figures.

## APK handoff and cleanup

- QA release build passed; rebuilt APK was rerun at 360 dp/font 150% and 200%. Visual inspection confirmed the compact scan icon; font/density were restored afterwards.
- Production x86_64 release build passed. Verified package `com.picket.mobile`, version 1.0.1/code 2, expected signing certificate and production HTTPS API URL; QA proxy URL absent from bundled JS.
- Installed with `adb install -r`: Google session retained, Dashboard opened with existing balance −1,450,225 VND and four wallets. No main-account financial mutation was performed.
- Current local emulator APK: `.artifacts/ui-redesign/picket-completion-emulator.apk`, **72,210,176 bytes**, SHA-256 `cfbdd3f8ca711082eb23e3f223aeab0e4a54ce7fe0397f4b305971a96cc18e10`. This is x86_64, not the phone/landing ARM64 artifact.
- Exact generated A/B owner IDs were checked before cleanup; QA receipt image and keepsake object folders deleted, ledger/budgets purged and auth accounts deleted. Expired QA tokens initially blocked storage cleanup; renewed sessions for those generated owners completed it before account deletion.
- QA proxy and Gradle daemon stopped. Primary QA app data cleared, network/font/density/time restored and adb returned to non-root. Secondary dedicated AVD is stopped; its isolated guest/local QA cache remains for future tests, with cloud QA accounts deleted. Existing AVDs and main app storage were not erased.
- Scoped secret/log grep found no matches in the new amount/date/FAB changes; `git diff --check` passed. This is not a full security audit. No commit/push, backend deployment or public APK update.

## Explicitly still open

- Real server token expiry/revocation; cache URL expiry and multi-image eviction budget; repeated conflict keep-server/cancel/re-conflict; one bulk batch mixing success, queued network writes and conflicts.
- Keepsake photo encryption at rest and reference-aware bounded local orphan cleanup. Research found existing owner-bound AES-GCM primitives reusable, but integration across rendering/upload/backup/rollback is not implemented in this increment.
- Corrupt/oversize/missing-image backup and failure-mid-restore native matrix; authentic Flutter-produced backup.
- Multiple receipts on one day; full cursor/paste/delete matrix; all-screen large fonts and spoken TalkBack; actual notification delivery/reboot, budget/partner notice variants.
- Physical ARM64 camera/biometric acceptance, Play sandbox configuration and staff/admin account acceptance remain external dependencies.

Do not promote whole groups 1–3 to verified from these individual passing branches. See the completion plan for the broader remaining scope.
