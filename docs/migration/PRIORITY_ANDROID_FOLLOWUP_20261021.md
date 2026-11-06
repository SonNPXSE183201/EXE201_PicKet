# Android priorities and budget delivery — 2026-10-21

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Final follow-up decision: [22 October Part 1 emulator acceptance](PART1_ACCEPTANCE_20261022.md) PASS within the named checklist. The failures/open states in this dated report are original checkpoint observations, not current unresolved cases.

Source: `APP_COMPLETION_PLAN.md`, requested parts 1 and 2. This report does not mark either entire part complete. Generated QA owner A/B only, `com.picket.mobile.qa` on `emulator-5556`; no real-user finances changed, backend deployed, push or public APK update.

Current status: [project index](../PROJECT_STATUS.md) and [Part 1 execution](PART1_CURRENT_EXECUTION_20261021.md). This checkpoint's open/failing observations below are historical: subsequent ban/reconnect A–B–A, independent natural expiry/revocation/offline A–B–A and configured real Google cold callback passed. Source now has 415 mobile tests and 82 API tests PASS. Consult the current acceptance matrix; old failures are retained as evidence, not current status.

## Cold-start links: named native cases passed

The session-loading screen intentionally does not mount the Stack. A warm linking action during that interval can be lost. An initial Router-only gate did not fix the earliest native case. Installed Expo Linking separately remembers VIEW intents received before JS listeners, while React Native's initial Activity intent can still reference the earlier URL.

`+native-intent.ts` now uses Expo's latest native URL for a VIEW launch and defers subsequent intents until the session Stack commits. Initial links never await AuthProvider, avoiding a bootstrap deadlock. Pending warm intents keep only the latest; paths and OAuth payloads are not parsed or logged. A launcher without VIEW data does not reuse an old URL.

- Source-contract RED executed with the native intent hook absent; checkpoint `7607ef9`.
- Five focused policy/contract tests PASS, including initial/launcher behavior, multiple pending intents, and unchanged OAuth/recovery paths.
- Native acceptance: cold open keepsakes; cold home followed immediately by keepsakes; capture with selected date; new transaction; repeated keepsakes. All reached their expected screen in **7.9–8.3 seconds**, including ADB startup and UI dumps. This is functional acceptance, not a startup performance target.
- Artifact: `.artifacts/roadmap-qa/bootstrap-intents-result.json` and corresponding XML. GREEN: `a44ceb9`.
- Remaining: external Google OAuth/recovery smoke, broader navigation during failed auth and other route/launcher permutations. No claim of complete navigation acceptance.

## Auth A–B–A: still open, narrower evidence

The complete real-revocation scenario still fails immediate B sign-in after A offline logout with cached photo and pending transaction. A is unbanned and device networking restored by the harness `finally` block. No manual session purge or password-request replay was added.

- Device connectivity reported `VALIDATED`, but that alone does not prove the app can reach Supabase.
- Sanitized temporary QA instrumentation identified B's **request/header phase** reaching the ten-second deadline; not response-body parsing.
- Immediately afterwards, unauthenticated auth health GETs through both dedicated Expo and shared native transports also timed out before headers at five seconds. Host password grant success does not override the device-path failure.
- Permanent error classification distinguishes request/body deadline and explicit caller abort without including URL, body, credentials or tokens. Runtime RED **10 PASS / 2 FAIL**, GREEN **12/12 PASS**; checkpoints `1a1ea2f` / `c6dfae6`.
- Artifact: `.artifacts/roadmap-qa/auth-phase-probe.log`. Probe code and extra health calls were removed from source before the final clean QA build. Root cause and complete A–B–A native acceptance remain unresolved; do not call classification a fix for sign-in.

## Budget Android notification: named native cases passed

Previously budget warnings appeared only inside Picket because their `notifyAt` is null. Added opt-in immediate native delivery, generic lock-screen-safe text and a persisted per-owner/month acknowledgement ledger. Serial recalculations do not resend the same accepted warning; OS failure can retry. If a ledger write fails after OS success, an in-process acknowledgement prevents a repeat while retrying the write. A crash in that narrow OS/ledger gap remains a limitation, not exactly-once delivery proof.

Owner lifecycle guards prevent stale scheduling work from being started after disposal. Logout/disable cleanup dismisses this owner's presented notifications and cancels schedules. A settings-hydration race found during native testing was reproduced with an executed source-contract RED; the switch is now disabled until stored settings load. Global notification presentation is configured with the reminder service, not only after opening the Notifications screen.

- Wiring RED **0/1**, checkpoint `7c75d35`; subsequent policy tests cover concurrent recalculation, owner isolation, month changes, inactive owner, OS error and ledger-write retry. Final focused target **4/4 PASS**.
- Native generated fixture: one actual Android notification, still one after recalculation, no repost after force-stop/restart, none after disabling reminders. Android removed the original notification on force-stop (zero remained); the test was corrected to check no repost, not require OS retention. Earlier failed attempts are excluded.
- Artifacts: `.artifacts/roadmap-qa/budget-os-native-result.json`, `budget-os-notification-record.txt`, `budget-os-fixture.json`, native UI XML. GREEN checkpoint `cd4608c`.
- This is an on-device notification when app recalculation detects a warning. It is **not** server push, background computation while the app is killed, OEM battery-policy acceptance, Partner Notice or the full A–B notification switching matrix. Disabling/re-enabling does not reset the month's delivery ledger.

## Calendar: targeted optimization, performance acceptance still open

Instrumented current A's **20,650,635 base64-character** image cache. Metadata snapshot published at **1499 ms**; fresh metadata at **3436 ms**; decrypted/parsed image cache ready at **5731 ms**, mapping at **5732 ms**. Later image downloads continued until at least **13973 ms**. These are one native trace, not a distribution or before/after benchmark. ADB UI timing also includes dump/scroll latency and is not used as an app frame-time measurement.

The fixture has many receipts referencing the same storage object. The loader previously looked up only receipt ID and redownloaded bytes for evicted IDs despite identical paths. A per-load path index now reuses the current owner's cached/downloaded image across IDs and avoids repeated linear searches. No cross-owner cache is read, and changed paths do not match.

- Executed pure-policy RED **7 PASS / 1 FAIL** for the missing index; attempted RED checkpoint rejected by existing typecheck hook, no bypass.
- Same target GREEN **8/8 PASS**. Cache budget and metadata recovery tests retained.
- Native post-fix performance measurements remain separate. Do not mark large-cache calendar performance complete from policy tests; decrypt/JSON/native-image-render costs still need profiling, especially with distinct image paths.
- Final clean-APK harness follow-up reached home at **9213 ms**, calendar at **16142 ms** and its day sheet **5487 ms** later. Artifact: `calendar-latency-result.json`. These one-run end-to-end numbers include ADB dump/scroll work; they are not a controlled before/after performance acceptance.

## Verification and remaining work

- Current discovered mobile suite **282/282 PASS**, no skips. Typecheck PASS; lint **0 errors / 23 existing warnings** after correcting a newly introduced ref-lifecycle lint error.
- Focused budget-delivery and bootstrap policy coverage: **100% lines, 96.15% branches, 96.30% functions**; not whole-app/rendered-component coverage.
- Final clean QA x86_64 release build **PASS, 37 seconds**; no QA console probes in final production source. APK installed without clearing data. The OS-notification matrix was rerun successfully on that final APK using a new generated fixture (ledger ID ends in `98222507-3811-4119-a199-261ff5d2fd75:2026-10`); toggle left off after acceptance. Test-only fixture rows remain for reproducibility.
- Existing unrelated dirty worktree changes preserved. QA gates do not establish clean-checkout public-release readiness.
- Still open: auth full A–B–A, comprehensive calendar performance, Activity destruction/pending picker recovery, capture mid-write/restore/error/idempotency matrices, concurrent media/cleanup faults, Partner Notice, full large-font/IME matrix and wider network chaos. TalkBack remains user-accepted; do not repeat it as a missing task.
