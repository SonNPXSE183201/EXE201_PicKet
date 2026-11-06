# Quiet Planning and receipt calendar updates — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Scope: Expo Android, existing API contracts. User requested stable layouts during planning-method changes and balance visibility changes, no calendar header reload button, then continuation of completion groups 1/2. No commit/push or public release.

## Cause and change

1. Every finance realtime event previously refreshed every slice. A preference write therefore reloaded transactions, toggled history loading and inserted the technical Planning message. Realtime now batches affected table names; profile/preferences refresh profile only. Mixed events union their dependent slices once. Full polling, reconnect and unknown event types retain the full refresh fallback. Pending offline mutations still prevent remote snapshots from overwriting local edits.
2. Calendar focus loading depended on session and transaction object identities. A fresh but equivalent transactions array reset the calendar loading state. It now depends on owner, token, month and the stable ID/date associations only; balance/amount changes alone cannot invalidate the gallery. Owner/month changes create a separate calendar scope so previous selection/photos cannot leak across accounts/months.
3. Refresh retains the loaded gallery and selected day; failures keep the same-owner/month snapshot instead of clearing it. A successful image retry clears previous failed-image state. The calendar no longer inserts a spinner into the layout. First load is exposed as accessibility busy and day actions remain disabled until that scope has a snapshot.
4. Removed the `Tải lại` action beside `Lịch hóa đơn`. Error/image recovery actions remain available. A focused 60-second quiet poll discovers receipt-only changes and reconnect recovery without relying on unrelated finance arrays. This is periodic receipt revalidation, **not instantaneous receipt websocket delivery**; timer and request are cancelled on blur/unmount, overlapping polls are skipped.
5. Removed Planning's technical loading text. History loading/error still guard month-close actions; an incomplete fetch cannot silently authorize a close.

## TDD and verification

- RED: 4 failing tests reproduced broad preference refresh, mixed-event overfetch, calendar reset/header reload, and Planning technical text. An additional RED assertion caught missing quiet polling/cleanup before it was implemented.
- GREEN: `npx tsx --test src/core/sync/refresh-finance-slices.test.ts src/core/ui/interaction-regression.test.ts`: 12/12. UI checks are source contracts, not React rendering tests.
- Full mobile npm `test:*` scripts: **194/194 PASS**. Typecheck PASS; lint zero errors/24 pre-existing warnings; whitespace diff check PASS. Targeted debug/credential scan found no matches in changed refresh/calendar modules; not a full security audit.
- `npx tsx --test --experimental-test-coverage src/core/sync/refresh-finance-slices.test.ts src/core/ui/receipt-gallery-policy.test.ts`: both policy modules 100% lines, combined 92.59% branches/85.71% functions. This does not measure TSX or whole-app coverage.
- First lint detected render-time ref assignment/effect state reset in the calendar draft; corrected before acceptance by scoped component identity and updating the snapshot ref only after a successful async load.
- Production x86_64 Gradle release built with forced JS rebundling, package/signature/production endpoint checked before installation. No Dart API changes or migration.

Latest local emulator APK: `.artifacts/ui-redesign/picket-completion-emulator.apk`, version 1.0.1/code 2, **72,200,928 bytes**, SHA-256 `fa63c728f323a641a25d4d342b658142a21a1e7ee06ed0115e5d2647c72057a4`. Installed main package `com.picket.mobile`; final build PASS (41 seconds). This supersedes earlier local x86_64 hashes only; public ARM64 on the landing page remains unchanged.

## Android evidence

- Main Google session retained. Planning initially `Phong bì`; switched to `Đơn giản` then back to `Phong bì`. No technical text in native hierarchy. `Tháng đang xem` bounds stayed exactly `[55,1144][1025,1218]` across all three snapshots. No budgets or transactions were created/archived by this test.
- Dashboard: native hierarchy/screenshot has calendar heading with no header reload action. Balance toggles do not expose a ProgressBar in the inspected hierarchy.
- Opened the existing 1 May 2026 synthetic receipt (CUA HANG ANH DAO, 250,000 VND), then airplane mode + Wi-Fi off + force-stop/reopen. Same image rendered offline; inspected online/offline screenshots, not merely an ImageView label. Network restored afterward. This extends groups 1/2 regression evidence but does not prove owner-switch/URL-expiry/cache-budget matrices.
- After reopening that cached receipt and closing its sheet, changed balance visibility, scrolled back to the calendar: May 1 remained selected, photo day retained, no spinner. This directly checks that a visibility preference does not remount/reset calendar selection.
- Evidence: `.artifacts/roadmap-qa/planning-new-{before,simple,envelope}.xml`, `calendar-stable.png`, `calendar-may-photo-online.png`, `calendar-photo-offline.png`, `calendar-photo-offline-restart.xml`, `calendar-selected-visibility-after.xml`.
- Final APK includes the quiet poll. A timed native poll observation is **inconclusive**: the starting snapshot had May 1 selected, but the ending snapshot was an account-edit screen rather than the calendar. No save/archive was pressed. Do not count this interrupted observation as either a poll pass or proof that polling navigates the app; controlled poll acceptance remains open.

## Still open / next gates

Groups 1/2 are **not wholly complete**. Keep the remaining camera permission/background/font/real capture matrices, receipt URL expiry/cache-budget/account-switch, natural token expiry/revoke/owner switch mid-request, old queue/disk-full recovery, keepsake encrypted/bounded local photos and concurrent cleanup/retry as open. The separate Android encrypted-backup stall is also unresolved. Do not infer those passes from this increment.

Realtime affected-slice policy is unit-tested and native UI outcomes checked; an instrumented two-client websocket/request-count acceptance remains open. Polling/receipt-only remote creation and signed-URL replacement still need controlled end-to-end fixtures. An initial post-install deep-link attempt landed on Dashboard; warm navigation into Planning worked, so this increment does not claim general cold-link acceptance.
