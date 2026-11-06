# Budget warning parity — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Scope and observed defect

Follow-up to `APP_COMPLETION_PLAN.md`, part 1 notification acceptance. The existing reminder collector summed direct-category expense rows only. It could warn the original category for the entire purchase, miss the split category, and retain a warning after a linked refund. The notification screen also lacked the current period's carry/transfer limits.

Reused the existing `budgetOverview` calculation and split loader. No backend/schema change, dependency installation, production data mutation or public APK release was needed.

## Implementation

- `budgetWarnings` filters archived transactions/splits and applies the same split/refund allocation and exact threshold as Planning. Explicit zero period limits remain zero rather than falling back to defaults.
- Both notification consumers use complete shared transaction history, loaded splits, and current-period limits. Budget warnings are suppressed until those inputs are ready; unrelated bill/subscription/keepsake reminders remain available.
- Period results are owner/month/budget-revision scoped; late results after cleanup are ignored. The hook does not substitute default limits when the cloud period request fails.
- Shared split-loading hook is now tracked with this increment. It keeps the existing owner/month/history-revision cache guards and does not overwrite a durable split snapshot with an initial empty history.

## TDD evidence

| Guarantee | Evidence | Result |
| --- | --- | --- |
| Linked refunds reduce spending before checking the threshold | `budget-warnings.test.ts` | PASS |
| Split expenses and explicit refund splits use their allocated categories | Same target | PASS |
| Period overrides, zero limits, inactive budgets and archived rows do not generate false warnings | Same target | PASS |
| A previous-month purchase supplies refund allocation without becoming current-month spending | Same target | PASS |
| Both consumers wire split/period readiness and period limits | Same target, source-contract assertion, not a rendered React test | PASS |

RED: the focused target failed when the newly specified policy module was absent. The normal checkpoint hook rejected that RED commit because the import could not resolve; hooks were not bypassed. A later executed source-contract assertion also failed before period-readiness wiring was implemented (4 PASS / 1 FAIL). GREEN: the same target passed all 5 tests. The initial RED does not claim a runtime reproduction of every old collector branch.

GREEN checkpoint: `3bd6dee` (`fix(notifications): align budget warnings with splits refunds and period limits`). No separate RED checkpoint was created because the normal hook blocked it.

## Native Android acceptance

Dedicated generated QA owner A only, `emulator-5556`, package `com.picket.mobile.qa`. The real production account/package was not modified.

1. Created separate FOOD/TRAVEL/CONTROL categories and budgets, each limit 700 and threshold 80% (560).
2. A 1000 purchase allocated FOOD 400 / TRAVEL 600. The Android notification screen showed TRAVEL's warning and no FOOD warning. A separate CONTROL expense of 600 kept a positive-control warning visible.
3. Refunded 100. The deployed refund RPC automatically allocated FOOD 40 / TRAVEL 60; API readback verified those split amounts. Directly editing a refund's splits correctly returned 409, so that harness step was removed rather than changing server authorization/business rules.
4. In the same running Android process, without restarting between refund and observation, TRAVEL net spending became 540 and its warning disappeared. CONTROL's warning remained visible. Rechecked after 5 seconds; screenshot visually inspected.

Evidence: `.artifacts/roadmap-qa/budget-warnings-native-results.json`, `budget-warning-fixtures.json`, `emulator-5556-budget-warning-before-refund.xml`, `emulator-5556-budget-warning-after-refund-stable.xml`, and `budget-warning-after-refund.png`. Fixtures remain confined to the generated QA owner for subsequent testing; they are not user financial records.

This accepts the named **in-app** warning/realtime recalculation branch. It does not verify OS push delivery, guest budget notifications, month-boundary transitions, offline period-load failure rendering or Partner Notice. Budget notices currently have `notifyAt: null` and are not scheduled as OS alarms by the existing scheduler; no push-delivery claim is made.

## Verification

- Complete discovered mobile suite: **259/259 PASS**, no skips (`node --import tsx --test` over all `src/**/*.test.ts`).
- Focused coverage: **100% lines / 95% branches / 100% functions** for `budget-warnings.ts`; not whole-app or hook coverage.
- `npm run typecheck`: PASS.
- `npm run lint`: 0 errors / 23 existing warnings.
- QA x86_64 release build: PASS, 36 seconds; installed without clearing app data. Public ARM64/landing APK unchanged.
- Targeted source scan found no new secret constants, privileged keys or debug logging in the increment. This is not a comprehensive security audit.
- Diff review: the policy, two consumers, period hook, shared split hook and tests were reviewed; unrelated dirty worktree changes were preserved.

## Separate auth status

The complete revoked-account A–B–A native harness was rerun with the QA emulator host alias after correcting localhost/ADB offline-test behavior. A's offline logout reached login, but immediate B sign-in still failed. The finally block unbanned A and restored connectivity; a cold-start QA A login subsequently passed. This does not close the auth matrix. See `AUTH_TRANSPORT_ANDROID_TDD_20261020.md`.
