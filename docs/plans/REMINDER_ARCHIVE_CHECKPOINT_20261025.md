# Reminder archive checkpoint — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Deleted bills and recurring expenses are excluded by the reminder collector. Deleted budgets are excluded by shared budget warning calculation. Live records still generate their existing reminders. RED 6ae1a4ad reproduces all three ghost reminders against real collector code transpiled with deterministic native-independent adapters.

Validation: all 732 mobile tests and 19 notification tests pass; typecheck passes. Evidence: .artifacts/reminder-archive-{tests,focused,types}.log. Native OS cancellation/delivery, timezone boundaries and device accessibility acceptance are not established by these tests. Existing delivered-notice history is unchanged. No production configuration, data or billing was changed; full product acceptance remains open.

## Reminder local month continuation
The notification screen, coordinator and reminder collector now select the device-local calendar month, matching planning rather than switching on UTC. RED 9d0134bc reproduces the October-local/September-UTC boundary in all three consumers. All 733 mobile tests and 20 notification tests pass; typecheck passes. Evidence: .artifacts/reminder-month-{tests,focused,types}.log. Existing transaction stored month-key rules are unchanged. This does not provide an automatic midnight/background clock refresh or certify native timezone behavior. User theme edits were preserved outside the staged screen change.

## Reminder priority continuation
The native scheduling batch now selects the earliest 50 future notification times instead of the first 50 collection rows. Sorting uses the filtered copy and preserves caller input. RED 973264be reproduces the omitted nearest reminder among 51 reverse-ordered items using real scheduleNow code and an OS adapter. All 734 mobile tests and 21 notification tests pass; typecheck passes. Evidence: .artifacts/reminder-priority-{tests,focused,types}.log. The existing 50-item cap remains; background replenishment and native delivery acceptance are not established by this increment.

## Notification screen concurrency continuation
A synchronous per-screen-operation lock blocks rapid toggle/reschedule writes. Owner/language lifetime checks reject stale success/error/read-state updates; exact scope identity also prevents an old A operation from becoming valid after A→B→A. Scope changes reset transient UI and focus loading includes language changes. Scheduling receives the same exact-lifetime predicate. This cannot undo a preference write already dispatched for its original owner.

RED 0b41be6d reproduces duplicate writes and stale owner completion. Real screen callback tests use deterministic hook/native/transport adapters, not native rendering. All 737 mobile tests pass; focused notification tests pass 24/24, typecheck passes and Android JS export passes. Evidence: .artifacts/notification-races-{tests,focused,types,export}.log. User theme changes remain unstaged and preserved. Native/device and broader release acceptance remain open.

## Reminder date-only calendar continuation
Date-only bill and recurring deadlines now use a local calendar date when calculating 9am reminders and recent-deadline eligibility. Explicit instants retain their previous instant-to-local-date interpretation. Bill labels reuse the existing calendar formatter to avoid showing the previous day west of UTC. RED 8eaa33ba reproduces the scheduling drift; tests cover Vietnam, Los Angeles across DST, Kiritimati, explicit UTC instants and date-only labels. All 740 mobile tests and 27 notification tests pass; typecheck and Android JS export pass. Evidence: .artifacts/reminder-calendar-{tests,focused,types,export}.log. No native delivery/timezone-change acceptance is claimed; existing reminders are refreshed through the normal scheduling flow.

## Reminder calendar refresh continuation
A shared calendar hook checks the local day and timezone offset every minute and on app foreground. It preserves the snapshot identity within the same day/offset, avoiding native batch churn every minute. The notification screen and coordinator use its month for split/period loading and its captured instant for reminder calculation. Cleanup removes both timer and AppState listener. RED 73ce10ac; all 745 mobile tests and 30 notification tests pass; typecheck and Android JS export pass. The test-only import ordering warning was also corrected. Evidence: .artifacts/reminder-clock-{tests,focused,types,lint,export}.log. Active-app rollover can lag up to one minute; no background execution guarantee or native OS acceptance is claimed. This supersedes the earlier lack of automatic calendar refresh, while preserving existing stored transaction month rules.

## Keepsake reminder refresh and owner isolation continuation
The coordinator versions each overlapping keepsake reload and ignores responses from superseded requests. Both the coordinator and notification screen tag loaded keepsake state with its owner and derive an empty collection immediately for a different owner, before the new load finishes. Existing owner/token cleanup remains. These changes prevent late data resurrection and calculating B reminders from A's retained component state; they do not change cloud/local merge or offline freshness policy.

RED 4492e1c3 reproduces stale deletion-refresh overwrite; a25e5746 and 0b74aa26 reproduce cross-owner state in the real coordinator and screen using deterministic adapters. All 749 mobile tests and 34 notification tests pass; typecheck and Android JS export pass. Evidence: .artifacts/reminder-keepsake-races-{tests,focused,types,export}.log. Native notification cancellation/delivery and wider cache freshness/privacy acceptance remain open. User theme edits are preserved outside staged changes.
