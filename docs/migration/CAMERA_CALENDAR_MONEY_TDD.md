# Camera, receipt calendar, money entry and logo refresh

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Scope

Expo Android only. Keep existing transaction validation, OCR, private receipt upload and backend endpoints. Camera preview uses Expo Camera SDK 57 (`~57.0.6`), with permission explanation, settings recovery, readiness/busy gating, and unmount on blur/background. Library selection remains explicit; cancel returns to the scanner. Capturing feeds the existing OCR review and pending-receipt pipeline. Manual entry opens the existing transaction form.

Home shows the generated Picket logo and receipt calendar for the selected month. Calendar entries are scoped to the current account or guest store. Purchased date takes priority, then linked transaction date, then record creation date. A day with saved receipts opens a sheet with photos/details; a day with no receipt opens capture. Load failure never masquerades as an empty day. Cloud images use short-lived private signed URLs, refreshed on screen focus/month change. This is not a new offline cloud-image cache.

The add-transaction controls are icon-only but retain accessible names. Amount inputs explicitly opt into VND digit grouping; OTP, dates, quantities and reminder-day counts do not. Formatting never converts through floating point or changes the raw digit string passed to existing validators.

## TDD evidence

- `money-input.test.ts`: initial RED was the missing formatter module; GREEN covers empty/zero/negative/large digit strings, dot/comma/space grouped paste and invalid drafts.
- `receipt-calendar.test.ts`: initial RED was the missing date-selection module; GREEN covers purchase/transaction/creation precedence and invalid dates.
- UI policy tests validate accessible image labels/decorative thumbnails and 48 dp pressables. TypeScript and mobile regression suite are run separately.
- No checkpoint commits were created; the pre-existing mixed worktree is preserved. No backend changes or financial-record mutations are required for this UI task.

## Branding

`apps/mobile/assets/picket-logo.png` was generated with the built-in image tool as a transparent 1280px PNG, inspired by the supplied camera/wallet/receipt and scan-corner logo. Prompt: crisp flat vector-like camera/wallet body, receipt, circular lens, four scan corners, exact wordmark “Picket”; coral/peach/mauve/cream palette; no extra text, texture or watermark. Used by the Expo icon/adaptive icon, login branding and Home header.

## Verification status

Code and device results are recorded below after the native build. Do not interpret pure helper coverage as camera or whole-app E2E coverage. Real camera photo quality, focus and torch require a physical device in addition to emulator smoke tests.

- `npm run test:mobile`: 100 tests passed, zero failed.
- `npm run typecheck --prefix apps/mobile`: passed.
- `npm run lint --prefix apps/mobile`: zero errors, 25 existing warnings (including unused imports in planning/reconciliation); the new calendar callback's reload dependency is intentional.
- `node --import tsx --test --experimental-test-coverage --test-coverage-include='**/money-input.ts' --test-coverage-include='**/receipt-calendar.ts' src/core/ui/money-input.test.ts src/core/ui/receipt-calendar.test.ts`: 3 tests passed, 100% lines/branches/functions for those two pure helpers only.

Reference: [Expo Camera SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/camera/).

## Native release observations

- Signed x86_64 APK built successfully and installed with `adb install -r`, preserving the signed-in account. In-app camera preview renders the emulator's virtual scene, shutter captures an image, and OCR review shows that captured image. This does not establish OCR accuracy for an actual receipt.
- On the transaction form, entering `1234567` produces visible `1.234.567`; the draft was discarded without creating a transaction.
- Home shows the logo, icon-only add control and receipt calendar. Tapping an empty day opens the in-app camera. The current account returned no receipt-image entries for this month, so the saved-image sheet is implemented but not yet device-verified with a real saved receipt.
- The system photo picker opens only after tapping the library control. An isolated check (`cancel-test-scanner.xml` → `cancel-test-picker.xml` → one Back → `cancel-test-return.xml`) confirms cancellation returns to the live scanner with its shutter available. No photo was selected or uploaded in that check.
- ARM64 release built successfully: `.artifacts/ui-redesign/picket-camera-calendar-arm64.apk` (69,986,327 bytes, ~66.7 MiB). Emulator release: `.artifacts/ui-redesign/picket-camera-calendar-emulator.apk` (72,053,403 bytes, ~68.7 MiB). Both use the existing signing key and production API. Camera inclusion increases APK size.
- Native build compatibility: the Windows init script pins codegen tasks to the same drive as each discovered module, resolving mixed `P:`/`D:` relative-path failures after prebuild.
