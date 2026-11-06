# Android money input event synchronization — 2026-10-21

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Journey and failure

Source: remaining money-entry and camera/library journeys in `APP_COMPLETION_PLAN.md`. Replacing an amount, typing successive digits and editing the middle must preserve digit order while displaying VND grouping marks. No transaction should be submitted during input-only verification.

While testing library replacement on QA Android, injected `789012` became **789.021**. A follow-up entering one digit per ADB command with 0.4-second pauses became **789.120**. Both failed runs are excluded from library acceptance; no transaction was submitted. ADB key injection is not Gboard composition or a physical-keyboard usability study.

Installed React Native 0.86.3 Android source sends text and post-edit selection together in `ReactTextChangedEvent`. The previous wrapper combined `onChangeText` with a separate selection event and treated that cursor as pre-edit. It also echoed selection events into controlled selection state. The installed TypeScript declaration omits the optional selection field exposed by native Android.

## Implementation

- Money edits use `onChange` text and optional caret from the same native event. The caret is runtime-validated; missing or malformed metadata falls back to the edit's diff boundary.
- A synchronous previous-display reference supports consecutive events before a parent render; controlled prop changes still synchronize it.
- A formatting caret correction is released for user selection changes. Native text-caret and formatted-caret echoes do not become a selection feedback loop. Explicit caller selection still has precedence; external callbacks remain forwarded.
- Existing date/calendar integration in the shared input was reviewed and retained with its policy tests in the GREEN checkpoint. It was not newly designed by this increment.
- No new dependency, upload, server mutation, schema migration or backend deployment. Targeted source scan found no credential constants or debug logging added by this increment; this is not a full security audit.

## TDD evidence

| Guarantee | Target | Evidence |
| --- | --- | --- |
| Text/caret must come from one native change event, not a selection echo | `native-money-input.test.ts` source contract | Executed **0 PASS / 1 FAIL** before the wrapper change; RED checkpoint `c927132` |
| Post-edit caret maps through grouping, middle edits, selection replacement, repeated digits, negative drafts and separator deletion | Same target, pure policy cases | PASS |
| User select-all releases the formatting selection lock | Same target | New case executed **3 PASS / 1 FAIL**, then **4/4 PASS** after implementing release policy |
| Invalid/missing selection metadata does not corrupt a draft | Same target | PASS |

GREEN checkpoint: `9a9d9b7`. New policy tests also initially could not resolve the not-yet-created policy module; the executed source-contract RED above is the runtime wiring reproducer. A first QA fix exposed a second native failure: select-all replacement appended new digits to the existing amount. That APK is excluded from acceptance; the selection-release follow-up was built and retested.

## Accepted Android input evidence

Generated owner A only, package `com.picket.mobile.qa`, AVD `emulator-5556`, QA-only API alias `10.0.2.2:18080`. The real production package/account was not changed.

- Consecutive fast select-all replacements: **789.012 → 1.234.567 → 987.654.321 → 111.111 → 789.012**, all equal the intended raw digits.
- Clear field, then enter each digit of `789012` separately: **789.012**.
- No transaction submitted. Artifact: `.artifacts/roadmap-qa/money-event-result.json` and `emulator-5556-money-event-*.xml`.
- Actual Android clipboard copy/paste: `1,234,567` becomes `1.234.567`; backspace at the grouping mark removes the preceding digit, repeated backspace reaches empty, and a second paste `98.765` remains correct. No transaction submitted. Artifact: `money-clipboard-native-results.json` and corresponding XML snapshots.
- Unsaved keepsake editor: middle insertion produces `12.349.567`, backspace restores `1.234.567`, and select-all replacement produces `987.654.321`. No keepsake submitted. Artifact: `money-cursor-native-results.json` and `money-middle-*.xml`. An initial attempt sent its deep-link during cold auth bootstrap and remained on Dashboard; it did not exercise the money editor and is excluded. The warm-owner follow-up reached the editor and passed.

This does not establish all Gboard/IME composition, physical keyboard, currency, clipboard or screen-reader permutations. In particular, the cold-start deep-link timing observed by the harness remains a separate navigation follow-up, not a money fix claim. Library lifecycle results are recorded separately in the capture report.

## Verification and release

- Mobile discovered tests **270/270 PASS**, no skips, using `node --import tsx --test` over `rg --files src -g '*.test.ts'`.
- Focused policy coverage **100% lines / 97.14% branches / 100% functions**; not rendered-component or whole-app coverage.
- Typecheck PASS. Lint **0 errors / 23 existing warnings**.
- Final QA x86_64 release build PASS in **39 seconds**, installed with `adb install -r` without clearing app data.
- Existing unrelated dirty worktree changes were preserved. This is working-tree QA, not clean-checkout production-release acceptance.
- Local checkpoint only; no push, public ARM64 APK or landing update.
