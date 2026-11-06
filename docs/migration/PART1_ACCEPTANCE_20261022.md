# Part 1 acceptance — 22 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Subsequent authorized publication: [production 1.0.4/code5](ANDROID_RELEASE_1_0_4_20261022.md) now contains the accepted source follow-up. Statements about the unchanged 1.0.3 public APK below describe the acceptance checkpoint before that separate release, not current landing metadata.

## Decision and scope

**PASS for the requested Part 1 emulator checklist**, with the named evidence below. This closes the finite follow-up cases recorded in the [acceptance matrix](PART12_ACCEPTANCE_MATRIX_20261021.md), not every possible device/fault combination and not the entire product roadmap. Test environments use isolated `com.picket.mobile.qa`, synthetic guest data and generated cloud owners A/B; the user's production package and finances were not cleared or mutated by these fault exercises. TalkBack speech remains **USER ACCEPTED**.

The measured release-like QA package is not debuggable, uses normal HTTPS API/Auth/Storage origins and preserves the same QA data. It remains an instrumented x86_64 test artifact, **not** a public production APK. No GitHub push or landing publication is included.

## Acceptance evidence

Runtime paths below are relative to ignored `.artifacts/roadmap-qa/`; retained reports link the relevant source changes, failed attempts and scope.

| Area | Result and evidence |
| --- | --- |
| Expiry/revocation/offline A–B–A | PASS `natural-expiry-fdf29503/result.json`: natural expiry, real server refusal/refresh revocation, offline transitions, owner-isolated photos/queue and exactly one replay. Earlier interrupted expiry runs are invalid, not successes. |
| Cold callbacks/deep links | PASS configured real Google cold callback `part1-google-cold-callback-result.json`, real recovery redirect/password verification and named cold/early/configuration recreation intent cases in the matrix. Not all alternate PKCE configurations. |
| Large-cache calendar | PASS compact preview/offline viewer; five nondebug cold loads **1.914–3.310s**, gallery-only **247–406ms**, 50 metadata rows, preinstall encrypted full-image cache 27,454,780 characters. `calendar-nondebug-settled/results.json`. |
| Calendar interaction/reboot | PASS three batches/36 actual Android scroll gestures: 358 frames, P95 **18.05/26.21/18.21ms**, max **35.13ms**, no >100ms frame. First launch after observed reboot: enabled calendar **16.185s** including UI dumps/viewport scroll, then day-28 sheet opened, below the existing 20s harness bound. `calendar-nondebug-steady/results.json`, `calendar-nondebug-postboot-ui/result.json`. Not a universal 60fps or real-phone guarantee. |
| Camera/OCR interruption | PASS six native fault cases, held actual ML Kit/server OCR owner races, delivered picker Activity recreation, and full process-death accepted fallback/A–B–A. User-approved behavior restores the old draft and asks to select again when Android never delivers a selection. See [picker report](PICKER_INTERRUPTION_TDD_20261021.md). |
| Camera actual full storage | PASS actual ENOSPC before cold launch and at a timing-only paused real restore: 0 writable bytes, production guard ENOSPC, original title editable, ciphertext identical, original image reopens after freeing the exact filler/cold restart. `real-enospc-capture-cold-corrected/result.json`, `real-enospc-capture-guard/result.json`; [failed ANR / reserved-block correction](REAL_ENOSPC_ANDROID_20261021.md). |
| Keepsake media | PASS concurrent actual encrypted writes/uploads/PATCH lost response/version conflict; A–B–A during request; EACCES cleanup; actual ENOSPC replacement preserves the old row/photo. `media-concurrency-73a9288b/result.json`, `media-concurrency-bfba9484/result.json`, `real-enospc-current/result.json`. Native integration probes are explicitly distinguished from manual simultaneous UI taps. |
| Notifications | PASS 12 tier/date/HTTPS native fixtures, late owner response suppression, background expiry/warm return, actual OS budget notification and late reminder scheduling/exact cancellation. `partner-background-current/result.json`, `reminder-owner-0f42a95d/result.json`; [reminder race report](REMINDER_OWNER_RACE_TDD_20261021.md). Partner content is not represented as an OS push advertisement. |
| Large fonts/keyboard/accessibility | PASS 35 authenticated routes at 150/200%, actual form footers, auth/onboarding, dialogs and new recovery action screenshots reviewed. Native money paste/caret/delete cases retained; TalkBack speech user accepted. `receipt-recovery-font-current/results.json` and route/font reports in matrix. |
| Repeated dependent mutations | PASS three mixed bulk cycles, failed-only retry and native offline wallet→three dependent transactions→three reconnect interruptions→authoritative IDs/sum/no duplicates after restart. `bulk-repeated-current/results.json`, `dependent-mutations-b4eb48c5/result.json`. Actual provider triple concurrent guest commits/old retries also PASS `guest-concurrent-09fa1b6a/result.json`. |
| Receipt server retention/recovery | PASS real PostgreSQL ordering races and deployed migrations `001/003/004`; actual API ownership/key-fence matrix and Android validation→resolve→edit/restart→one receipt/transaction. [Recovery TDD and rollback](RECEIPT_ATTEMPT_RECOVERY_TDD_20261021.md). |
| Backup/update regressions retained | PASS actual Document Picker/Share Sheet, decrypted payload/photo/ledger equality, midrestore rollback and QA Android installer/data preservation. Authentic historical Flutter exports and real-phone update acceptance remain separate external inputs, not fabricated from synthetic fixtures. |

## Verification

| Gate | Result |
| --- | --- |
| Build | PASS `calendar-nondebug-native-build-final.log`; isolated nondebug x86_64 1.0.3/code4, 72,395,568 bytes, SHA-256 `7bd332beecde0c58bf30117aa6fdd5c493051b3da92d2a244de5b85739fd5a7f`, source `b4e883a` |
| Types | PASS `part1-close-typecheck.log` |
| Lint | PASS zero errors, 24 existing warnings, `part1-close-lint.log` |
| Mobile tests | PASS **415/415**, zero failures/skips, `part1-usable-space-final-tests.log` |
| Scoped coverage | Photo vault 100% lines /95% branches /91.30% functions. Other auth/capture/preview/notification/reducer coverage retained in execution report; no invented whole-app percentage. |
| API/SQL retained gates | 82 API tests PASS, analyzer no issues; SQL functional and real PostgreSQL concurrency/deployment evidence retained. No later API logic changes after those gates. |
| Pattern/diff/link review | 36 changed source files: zero credential literals matching private-key/Google-secret/Supabase-secret patterns; zero console.log matching files in the prior same-source check. Narrow check, not a full security audit. `git diff --check` clean; **81 Markdown files, zero missing local link paths** after synchronization. |

## Historical failures and dependencies

- Debug/SwiftShader jank and first-after-boot 24.449/26.228s samples remain failed diagnostics, not rewritten. Release-like measurements are separate, not a controlled proof that disabling debug alone caused every improvement.
- First release-like postboot telemetry run missed events; direct UI inspection was not a timing PASS. Initial direct-UI attempts had a reboot-readiness race and an offscreen-calendar harness error. Corrected run waits for a new boot ID and completed boot, scrolls the observed viewport and opens the actual sheet. Its final screenshot was reviewed; photo-load acceptance is separately covered by the offline viewer case, not inferred from sheet text.
- Actual full-disk ANR, reserved-block API mismatch and failed XML export remain in the storage report. No failure was converted into PASS without a distinct corrected run.
- **Outside Part 1 emulator acceptance:** ARM64 phone camera/biometric/performance/update, real Flutter-export compatibility input, Play Console billing sandbox, staff-account acceptance. These remain in the project index. Their absence prevents claiming the entire application/roadmap or public release ready.

Public landing remains **1.0.3/code4 ARM64**, SHA-256 `83c4cb5c90ae029c80204102beb58bf16f660698ba8d9a1f0362944817e0891e`. Follow-up source fixes require a separate production release decision; do not publish a QA/instrumented APK.
