# Financial outbox retirement — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Continuation of owner cache/recovery work. This completes retirement of the
general financial mutation outbox, not separate receipt/keepsake drafts or files.

## Implemented

- The existing queue SQL is extracted into an injected store, exercised against
  real SQLite, and wired back to the native adapter. Existing encryption, legacy
  migrations, first-version update merging and dependency mappings are retained.
- All queue reads/writes use the common owner lifecycle queue. This includes
  list operations that can migrate plaintext legacy rows. A dispatched encrypted
  write drains before retirement; queued or later callbacks cannot recreate rows.
- Account deletion first commits the common durable fence, then erases that
  owner's pending mutations, conflicts and entity mappings in one exclusive
  outbox transaction. Failure/rollback prevents the remote account request.
  Retry is idempotent. Another owner's and device-guest rows are retained.
- Queue delete/retry methods now require and bind the owner. Conflict moves and
  retries verify current row ownership inside exclusive transactions and reject
  missing/resolved rows or identities belonging to another owner.
- The executor checks retirement before dispatching additional work; an already
  dispatched server request is not claimed to be canceled. Its late local queue
  updates remain fenced. Retired queue counts resolve to zero for coordinators,
  and foreground wake-ups handle rejection without unhandled promises.
- The existing verified recovery boundary also covers the outbox because it
  uses the same fence. An aborted deletion may preserve an outbox whose erasure
  rolled back, but it cannot send remote account deletion until cleanup succeeds.
- vi/en deletion copy distinguishes these financial changes from separate media
  and other drafts. No shared encryption key or source/exported file is removed.

## Verification

- RED `a387332`: SQLite-backed tests failed against the unfenced extracted
  implementation, including a wrong-owner retry/removal. Additional ownership
  tests failed before current-row guards were added.
- **628 mobile tests pass**. Typecheck passes. Lint: 0 errors, 25 existing
  warnings. Android JavaScript export passes.
- Focused extracted queue coverage: **97.92% lines / 88.41% branches /
  97.67% functions**. Real SQLite tests cover mutation/conflict/mapping erasure,
  trigger-induced rollback, repeated erasure, owner isolation, dispatched/queued
  write races, legacy migration and update merging.
- Logs: `.artifacts/mobile-outbox-retirement-tests.log`,
  `mobile-outbox-retirement-types.log`, `mobile-outbox-retirement-lint.log`,
  `mobile-outbox-retirement-coverage.log`, `mobile-outbox-retirement-export.log`.

Native Expo SQLite/filesystem/process-death acceptance is still pending; Node
SQLite does not substitute for that. Separate receipt/capture/keepsake storage,
notification/lock preferences and attributed media cleanup remain open. Other
P1–P5/content/release/Google Play gates in the main checkpoint remain unchanged.
