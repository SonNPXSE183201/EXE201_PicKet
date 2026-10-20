# Archive retry after a lost response — 2026-10-20

## Observed Android defect

The mixed bulk archive exercise produced successful, queued and version-conflict rows in one run. Follow-up inspection found an additional false conflict: one queued DELETE had already committed before connectivity was lost, and retrying its original version returned 409. The mixed bulk scenario therefore remains open, despite its initial nominal result.

## Guarantee and implementation

When a version-guarded archive updates no rows, the API reads that transaction using the same user JWT and publishable key. An already archived, visible transaction is returned without another write. An active transaction, or a row hidden/missing under RLS, remains a 409. Authentication and upstream permission failures are not converted into success. No schema change or privileged fallback is used.

## Evidence

- RED: `dart test test/archive_retry_gateway_test.dart` executed four cases; all four failed against the old gateway. The already-archived case reproduced the unexpected 409. Checkpoint: `b43145c`.
- GREEN: the same four cases passed after the fix. Three additional cases cover ordinary success, authentication failure and write permission failure without a fallback read.
- Full regression: `dart test` in `apps/api` passed **79 tests**.
- Static analysis: `dart analyze` reported no issues before the final test-only additions.
- GREEN checkpoint: `2e5b738`.
- Coverage was not collected for the full gateway; no coverage threshold is claimed.

## Remaining acceptance

The API fix has not been deployed to the VPS. Repeat the mixed bulk Android test against the updated API and verify no redundant archive conflict remains before accepting this scenario. The current production APK/API must not be described as containing this fix.

## Accessibility acceptance

The user personally tested TalkBack speech and interaction in the visible emulator and explicitly confirmed acceptance. That manual check is accepted and will not be repeated. This does not imply automated speech verification for every route or completion of the separate large-font screen matrix.
