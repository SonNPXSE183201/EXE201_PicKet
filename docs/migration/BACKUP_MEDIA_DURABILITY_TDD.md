# Backup media durability follow-up — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Scope: groups 1/2 from [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md). No commit/push, public release, BE/schema/RLS changes. Main account not used for restore testing.

## Restore-response loss fix

`restoreEncryptedBackup` previously removed all newly uploaded objects in `finally` unless the restore response returned successfully. A server commit followed by response loss could therefore leave restored records pointing at deleted photos.

Added `restore-media-policy.ts` coordinator: pre-submit upload/validation failures may clean this attempt's completed uploads; after entering the restore call, any rejection is treated as ambiguous and objects are retained. No claim of atomic restore retry/idempotency or durable orphan cleanup. Retaining uncertain objects is preferable to deleting potentially live images; auditing them remains a follow-up.

TDD: `restore-media-policy.test.ts` executed RED for the missing coordinator, then **4/4 GREEN**. Guarantees: lost commit response retains media; validation rejection prevents submission and cleans only completed uploads; partial upload failure cleans completed uploads without masking original error; confirmed success retains media. Target coverage via `node --import tsx --experimental-test-coverage --test src/core/export/restore-media-policy.test.ts`: **100% lines/functions, 93.75% branches**. Full mobile **182/182**, typecheck PASS, lint 0 errors/24 pre-existing warnings. This is not native controlled cloud-restore acceptance.

## Native guest backup attempt — NOT round-trip acceptance

- Cleared **only the disposable `com.picket.mobile.qa` package**, whose generated cloud users had already been purged. Main app storage untouched. Entered guest.
- Generated a synthetic encrypted `picket-guest-backup-v1` fixture using the existing codec: one wallet opening 100,000 VND, one expense 12,345, one receipt and one keepsake with the public CORD image (120,052 bytes). Public test password, no personal credentials. Fixture 429,089 bytes. This is not a real historical Flutter backup.
- Opened Restore, entered fixture password, used Android Document Picker → Downloads → `guest-roundtrip-input.picket`. UI remained at **Đang đọc file backup** during the observed wait, with QA process CPU activity. No summary/RESTORE confirmation reached. No restore mutation was submitted and no Share Sheet export completed.
- Automated attempt to find the confirmation field eventually failed because that field never appeared; stopped QA package. Screenshot `guest-backup-progress.png`, UI XML `guest-restore-summary*.xml`. No app crash in the inspected AndroidRuntime/ReactNativeJS error filter; that does not prove absence of all runtime faults.
- Record this as an unresolved Android decrypt/performance or scheduling problem, not proven corruption, a confirmed root cause, or a successful round-trip. Next: measure KDF/decrypt stages on Android, preserve PBKDF2/AES-GCM format/strength, improve responsive progress/cancellation as appropriate, then rerun native restore/export and compare decrypted payload/image bytes.

## Production emulator handoff

- A normal Gradle build initially reused the old QA JS bundle despite a changed environment. The first bundle assertion failed, but the shell sequence continued and temporarily installed that main-package build; app was stopped immediately after detecting the QA endpoint. QA proxy/reverse were already shut down, no personal mutation was performed. Do not reuse that intermediate APK.
- Forced JS rebundle through ignored task-local init script; checked APK bytes contain production HTTPS API and **do not** contain QA loopback. Default local `.env.local` preflight correctly rejects HTTP; explicit production HTTPS environment passes. Do not interpret preflight as inspecting an already built bundle.
- Final local production x86_64 `.artifacts/ui-redesign/picket-completion-emulator.apk`: **72,193,615 bytes**, SHA-256 `c033e96d1fd20c1d83730f142f692537f2e55f1b4714466e95c5613c749ac249`. Build PASS 43s/834 tasks, signature verification PASS; installed `-r`, main package `com.picket.mobile` retained Google session, Home `Chào Son Nguyen`, balance -261,345 VND. Emulator left open, QA package stopped, no adb reverse.
- Public ARM64 APK and landing unchanged; latest emulator-only source changes are not yet public. Only fixture accounts/rows/images were permanently purged; no personal data removed.
