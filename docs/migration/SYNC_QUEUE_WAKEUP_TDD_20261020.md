# Active-app mutation queue wakeup — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Latest mixed-bulk follow-up: the initial success/queued/conflict result did not constitute full acceptance. A queued archive that had committed before losing its response generated a false 409 on replay. A local API regression fix and 79 passing API tests are recorded in [ARCHIVE_RETRY_TDD_20261020.md](ARCHIVE_RETRY_TDD_20261020.md); VPS deployment and native rerun remain pending.

## Journey and observed defect

An authenticated Android user retries a resolved conflict while Picket remains open. The resulting queued mutation must be attempted without restarting or backgrounding the app. If the server advances again, the mutation must return to the conflict list without overwriting the server.

The extended native harness exposed a gap: queue subscriptions updated counts but did not trigger a flush. The provider flushed on initial mount/foreground, while its periodic task only refreshed remote snapshots and refused refresh while pending writes existed. Earlier harness failures also included stale permission dialogs, clipped-node scrolling and incomplete field selection; these were corrected separately and are not reported as app defects.

## Changes

- New work is debounced for 350 ms per mounted owner scope.
- Notifications originating during an active flush do not schedule an immediate retry loop.
- Realtime reconnection wakes pending work; a bounded 30-second poll also attempts a flush when realtime is unavailable.
- Disposal cancels an old owner's timer. Existing executor/flush overlap guards, persisted idempotency and conflict policy remain in place.

## TDD evidence

| Guarantee | Evidence | Result |
| --- | --- | --- |
| Coalesce enqueue notifications; ignore empty/busy notifications | `queue-wakeup.test.ts`, Node mock timers | PASS |
| Old owner timer cannot run after disposal | Same test target | PASS |
| Provider connects enqueue, reconnect, polling and cleanup | Source-contract assertion; not a rendered React test | PASS |
| Cancel merge preserves version, keep-server clears without writing, edit again conflicts, server change during merge re-conflicts | `conflict-variants-native-results.json` and native XML from QA Android 35 | PASS |
| Actual Android clipboard paste, grouping-separator backspace, repeated backspace and second formatted paste | `money-clipboard-native-results.json`; no transaction submitted | PASS |

RED: `npx --no-install tsx --test src/core/sync/queue-wakeup.test.ts` failed all three new tests (missing wakeup function and missing provider wiring). The attempted RED checkpoint was rejected by the normal TypeScript hook because the new export did not yet exist; hooks were not bypassed. GREEN: the same target passed all three tests after implementation.

Focused coverage command:

```text
node --import tsx --test --experimental-test-coverage --test-coverage-include=src/core/sync/finance-realtime-policy.ts src/core/sync/queue-wakeup.test.ts src/core/sync/finance-realtime.test.ts
```

Six tests PASS; policy coverage **97.44% lines / 96.43% branches / 100% functions**. This is scoped policy coverage, not whole-app coverage. Complete discovered mobile suite at this checkpoint: **244/244 PASS**; the later auth increment reached **254/254 PASS**. Typecheck and QA x86_64 release build passed.

Checkpoint commits: `856bb0c` (policy/tests), `17acc89` (provider integration and completion-plan updates). Native QA APK installed in `com.picket.mobile.qa`; the real Google account/package was not replaced. No push or public ARM64/landing update.

## Remaining acceptance

Follow-up: mixed success/offline-queued/version-conflict bulk passed after the separately approved API-only archive-retry deployment: 1 completed/6 queued/1 genuine conflict, failed-only retry 1/1, no pending/conflict rows for any of the eight fixture entity keys. See `ARCHIVE_RETRY_TDD_20261020.md`. Natural server-expiry API integration also passed (old token 401, refresh 200, fresh API 200), but the complete revoked-account native A–B–A case remains open; see `AUTH_TRANSPORT_ANDROID_TDD_20261020.md`. No entire roadmap group is promoted by this report. TalkBack is already manually accepted by the user and is not being retested.
