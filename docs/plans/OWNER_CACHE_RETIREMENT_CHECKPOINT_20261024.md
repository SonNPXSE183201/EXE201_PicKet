# Owner cache retirement — 24 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Implemented increment, not full account-data erasure or release acceptance.

## Behavior

- Account deletion now retires every resource in `picket-offline.db` for the
  selected owner before issuing the server request. This supersedes the
  forecast-only retirement wiring; forecasts are included in the common cache.
- The SQLite owner tombstone and resource deletion commit in one exclusive
  transaction. No ciphertext must be decoded to erase corrupt cache entries.
- Owner queues drain dispatched operations, reject queued stale generations,
  and check the durable tombstone before every subsequent read/write. Restarting
  the app or failing device sign-out does not remove the tombstone.
- Other owners, device-guest data, shared encryption keys and original/exported
  files are preserved. Retirement is idempotent. Storage failures stop the server
  request; connection initialization can retry after a failed open/schema attempt.
- An unconfirmed remote request uses the existing explicit recovery path to
  reopen an empty cache. Confirmed deletion never reopens it or repeats the server
  request merely because device sign-out failed. vi/en copy describes this scope.

## Evidence

- RED `0c47277`: six behavior tests failed against the compiling lifecycle stub.
- RED `9fd7372`: account deletion wiring test failed until the common cache was
  connected. A further real SQLite test failed before extracting the driver.
- All **614 mobile tests pass** (all `src/**/*.test.ts` discovered with `rg` and
  executed together). The existing root mobile script covers only 528 of these
  tests, so its green result alone is not the complete suite.
- Real Node SQLite tests cover owner-only erasure, unreadable ciphertext,
  idempotence, empty-cache resume, and trigger-induced rollback with retry.
- Focused lifecycle/database coverage: **100% lines / 96.49% branches /
  100% functions**. Typecheck passes. Lint: 0 errors, 25 existing warnings.
- Android JavaScript export passes; this is not an installed native build or
  physical-device acceptance. Export preceded a connection-initialization retry
  adjustment; final typecheck and all 614 tests include that adjustment.
- Logs: `.artifacts/mobile-owner-cache-all-tests.log`,
  `owner-cache-coverage.log`, `mobile-owner-cache-types.log`,
  `mobile-owner-cache-lint.log`, `mobile-owner-cache-export.log`.

## Remaining gates

Later behavior is documented in `OWNER_PRIVACY_LIFECYCLE_CHECKPOINT_20261025.md`:
uncertain server outcomes never automatically resume local data. The remaining
gate list below is historical; attributed media/preferences were subsequently
implemented, while unknown legacy caches and native acceptance remain open.

This covers the common encrypted resource cache only. Separate mutation/conflict
queues, receipt/capture drafts, keepsake files, notification/lock preferences and
system-managed image caches still require attributed cleanup and in-flight
operation fencing. Do not delete a whole shared directory or encryption key.

Superseded on 25 October: `OWNER_CACHE_RECOVERY_CHECKPOINT_20261025.md` implements
the following recovery gap. Native acceptance remains pending.

A fresh server-verified sign-in recovery path was still needed for an account
whose cache was retired before the app stopped and whose server deletion did
not happen. Cached auth bootstrap/refresh must never clear a tombstone. Retrying
the deletion screen remains idempotent, and unconfirmed remote outcomes in the
current running session explicitly resume the empty cache.

Native storage/process-death/owner-switch acceptance remains pending. No
production schema/data changes, Google Play purchase acceptance, or release
activation are included in this increment. The larger P1–P5 gates remain open.
