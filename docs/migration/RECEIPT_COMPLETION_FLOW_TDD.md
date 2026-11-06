# Receipt capture completion and calendar date — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Scope: Expo Android UI/flow and existing Dart API; no backend/schema changes, commit/push or public APK update. User journeys: calendar day → scan → review → create transaction → home/view receipt; icon scan → same completion; same-owner cached photo after restart.

## Findings and implementation

- Calendar empty-day navigation previously dropped the chosen day. OCR's printed date (or today's transaction date) could therefore place the saved image in another month/day, making it appear missing.
- Cloud attachment defaulted to off. Without selecting the checkbox, capture intentionally created only a transaction, not a receipt/image. It now defaults to on, with the existing explicit upload explanation and an opt-out. Images are still uploaded only after the transaction confirmation action.
- Replacing only the transaction form left capture screens below it in the stack. Completion now dismisses the flow to Dashboard then opens a dedicated success screen. Home returns to the receipt's month; View replaces the success screen with receipt detail (guest uses the transaction's local receipt). Back from detail reaches Dashboard rather than the submitted forms.
- Capture exposes a calendar date field. Explicit calendar/manual selection takes precedence over OCR; icon scan uses a valid OCR date, falling back to today. Chosen local dates use local noon to avoid UTC day shifts. Missing receipt drafts fail closed instead of silently creating an image-less transaction.
- Manual entry from the camera replaces the camera screen. Duplicate-receipt View also clears the capture flow before opening the existing receipt.

## TDD / gates

- New receipt-flow policy test first failed because the implementation was absent. Five tests now pass: invalid/leap/calendar dates, OCR/fallback date behavior, completion navigation order, safe home-month routing, and source-contract wiring for cloud/guest/attachment/missing-draft protection.
- Full mobile `test:*` scripts: **199/199 PASS**. Typecheck PASS. Lint zero errors/24 existing warnings. New policy coverage: 100% lines, 95.45% branches, 88.89% functions as reported by Node/tsx; not a full-app coverage claim. Wiring assertions and the fake navigation test do not substitute for Android stack acceptance.
- QA release build PASS (51s), production x86_64 release PASS (54s). Production package, signature and HTTPS API endpoint checked. The generated Expo route declaration initially did not know the new route; the Href boundary follows existing typed-route casting conventions. An initial month-index error was corrected before the tested APK build.
- Checkpoint commits intentionally omitted because the user requires no commit/push. Existing unrelated working-tree changes retained.

## Android acceptance

Testing uses an isolated `com.picket.mobile.qa` package and generated QA accounts, not the main Google user's financial records. Source images: the existing Vietnamese synthetic receipt (printed 01/05/2026) and public CORD receipt already available in the corpus.

1. Calendar day **19 October** → gallery → synthetic image with printed **1 May** → OCR → form keeps **19/10/2026**; attachment checked by default. Named fixture `QA-calendar-flow-1020`, 250,000 VND.
2. Save reaches success screen with both actions. Home reaches Dashboard immediately in October. Day 19 has the saved image. API independently returns **one receipt**, purchasedAt `2026-10-19T05:00:00.000Z`, linked to one transaction.
3. Icon scan → public CORD image → manual correction to 12,345 VND (OCR did not confidently supply a total) → success → View receipt opens the correct fixture `QA-fab-flow-1020`. One UI Back returns to Dashboard's calendar, not capture/form. Initial greeting-only assertion failed because Dashboard retained its scroll position; calendar/navigation inspection confirmed the return.
4. After gallery cache load, airplane mode + Wi-Fi off + force-stop/reopen retains account A and opens the newly created day-19 receipt image. This is a loaded-cache acceptance, not proof of offline availability immediately after save without ever opening/loading the gallery.
5. Switch A → B online; B warms its own empty gallery, then airplane mode/restart still shows an empty day-19 calendar with no A photo. Native sign-out automation initially failed because Android uppercases the confirmation label (`ĐĂNG XUẤT`); corrected the selector, not app behavior. Natural expiry/revoke and owner switching during an in-flight upload are not covered by this case.
6. Return B → A online, then offline/restart: A can again open its new day-19 image. API confirms exactly two receipts and two transactions (250,000 and 12,345 VND), and Android balance is the expected 737,655 VND from a 1,000,000 VND opening wallet. This does not test unsent mutations or switching owner during requests.
7. Deleted exactly the two uploaded receipt objects under generated A's validated owner prefix, purged only the two generated QA users/data, cleared only the isolated QA package and stopped the local QA helper. Restored Wi-Fi/airplane-off. Main package updated without clearing Google session/data.
8. Final main package shows the Google user's Dashboard and visible balance **-1,400,225 VND**. This differs from the earlier session's historical baseline; no before/after ledger comparison of the main account was taken in this increment, so unchanged balance is **not** claimed. Automated financial mutations in this increment targeted the generated QA users only. Do not overwrite the main account to restore a historical test baseline.

Evidence under `.artifacts/roadmap-qa/`: `receipt-flow-ocr-form.xml`, `receipt-flow-success.png`, `receipt-flow-returned-home.xml`, `receipt-flow-calendar-image.png`, `receipt-fab-detail.xml`, `receipt-fab-back-home-confirmed.xml`, `receipt-A-new-photo-offline.png`.

Local production x86_64 APK: `.artifacts/ui-redesign/picket-completion-emulator.apk`, 72,205,944 bytes, SHA-256 `b3357d6ed3cf1bb0f90d14829bc71c4ba8bbe61b5b8361dcbf260d2820d2dd5c`, version 1.0.1/code 2. This is not the ARM64 APK distributed by the landing page.

## Remaining groups 1/2

Do not mark both groups complete. Still open: real camera permission/focus/torch/background combinations, multiple receipts/day and date/timezone extremes, native full font/TalkBack matrices, receipt cache budget/URL expiry and full A–B/expiry/revoke/mid-request-owner transitions, old SQLite queue/disk-full recovery, encrypted/bounded keepsake local photos and concurrent cleanup. Guest completion code is wired but not yet accepted by a full new guest save round-trip in this increment. Backup decryption performance is tracked separately and remains unresolved.

## Group 3: prerequisites and execution order

No new Google OAuth key or payment configuration is required for group 3. Use generated non-staff QA users and the existing Dart/Supabase test access; never close the main user's real accounting months.

1. **Independent clients:** two authenticated client sessions for controlled version races. Existing emulator + API client can reproduce a server conflict, but full two-Android UI acceptance needs another emulator or a physical Android device. Physical biometrics/Play/staff are group-5 dependencies, not prerequisites here.
2. **Deterministic data fixture:** at least 105 transactions spanning two wallets, multiple categories/months, expense/income/transfer/refund/split and archived rows. Record fixture IDs, expected wallet balances, net spending, limits and rollover totals in a machine-readable ledger before assertions.
3. **Fault injection:** scoped QA proxy can drop a committed response and return controlled 409/validation/network errors. Capture request IDs, versions, success/failure subsets, replay counts and post-restart server counts. Do not apply faults or bulk operations to the main account.
4. **Sequence:** complete dashboard/filter/insight pagination comparison → mixed-result bulk archive/retry-only-failed → two-client conflict/field merge → repeated reconciliation idempotency faults → closed-month/refund/split/rollover boundaries → Review Inbox cross-screen refresh and duplicate/reviewRequired handling.
5. **Evidence/cleanup:** for each case compare Android result with fresh API state and fixture expectations; preserve screenshots/logs with no tokens; remove only the generated QA media/accounts. Retain exact acceptance status in FEATURE_PARITY and APP_COMPLETION_PLAN, not a blanket verified label.

Already covered narrower branches (reconciliation lost-response retry, real-version bulk conflict and Android+API field merge, month-close refusal) remain valid as documented in earlier reports; group 3 extends those tests rather than declaring them all missing again.
