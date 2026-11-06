# Archive retry after a lost response — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


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

The user explicitly approved an API-only deployment on 2026-10-20. The fix is deployed and the targeted mixed bulk Android rerun passed as recorded below. This does not complete the other roadmap matrices or imply that a new public APK has been released.

## API-only deployment and live regression

- Reran `dart analyze`: no issues. Reran `dart test`: **79/79 passed**.
- Compared 70 deployed source/build-input hashes. Kept the deployed API source tree and replaced only `lib/src/supabase_gateway.dart`; its differences are the archive retry fix and formatting. Did not copy other locally changed API files.
- Preserved old source at `/opt/picket/deploy/rollback-api-20261020-archive/supabase_gateway.dart` and old image as `picket-api:rollback-20261020-archive` (image ID `sha256:2e34ba291a011460afa5153a88ab476591eeacf87dfb88f3fe75499ffc7ac4a4`).
- Built `picket-api:archive-retry-20261020`, image ID `sha256:f3a083db06c3af9b1717d546f060aee4df5d7054ef4d5b33e90b3bf101dbc326`; retagged `picket-api:latest` and recreated **only** `api` with `--no-deps --no-build` using the existing production environment file.
- Public `/health` returned HTTP 200 with `status: ok`. Caddy, web, OCR worker and OCR provider container IDs remained unchanged. No migration, secret change, landing update or database-wide operation was run.
- Live authenticated QA test: archive version 1 returned version 2; repeating the original version-1 DELETE returned the same version 2 and identical `deletedAt`. The same transaction remained hidden from QA owner B (409); no extra mutation or cross-owner disclosure. Evidence: `.artifacts/roadmap-qa/api-archive-deployed-results.json`.

### Android rerun controls

The first fixture-creation attempt stopped on an upstream 504 before UI acceptance. A subsequent run returned 7 successes/1 genuine conflict but did not exercise offline queueing: ADB localhost forwarding remained reachable after Wi-Fi was disabled. That run is not accepted as the three-outcome scenario. The QA-only harness was moved to the emulator host alias with a narrowly scoped QA cleartext exception; production network security configuration was not changed. A third nominal UI summary alone will not suffice: the rerun must also inspect persisted queue/conflict metadata for all fixture entity IDs.

### Accepted Android rerun

- Clean QA x86_64 APK built successfully (42 seconds) and installed without clearing app data. Used only the generated QA owner A on `emulator-5556`, package `com.picket.mobile.qa`; the real production account/package was not modified.
- One bulk request selected eight generated transactions. A server version advance caused one genuine conflict; after the first successful archive, Wi-Fi/data were disabled. UI result: **1 completed + 6 queued + 1 failed**, with only the failed row still selected.
- Restoring connectivity replayed queued rows. Only the version-conflict row remained active on the API.
- Retrying the selection processed **1/1**, not all eight. API readback confirmed all eight fixture IDs were archived.
- Force-stopped the QA app and inspected its persisted SQLite database/WAL snapshot. All eight entity keys had **zero rows in both `pending_mutations` and `mutation_conflicts`** for owner A. Existing conflicts from unrelated earlier QA exercises were not used to claim a clean global queue.
- Evidence: `.artifacts/roadmap-qa/bulk-three-native-results.json` (`noFixturePendingOrConflictAfterRetry: true`, `apiArchiveRetryRelease: 20261020`) and the corresponding `bulk-after-deploy-*` SQLite snapshot. Network was restored in the harness finally block.
- This accepts the targeted success/offline-queue/version-conflict/retry scenario against the deployed fix. It is not acceptance of every validation failure, prolonged network chaos or the separate auth A–B–A matrix.

### Rollback

From `/opt/picket`, tag `picket-api:rollback-20261020-archive` back to `picket-api:latest`, then run `docker compose --env-file deploy/.env.production -f compose.production.yml up -d --no-deps --no-build api`. Recheck `/health`. Restore the saved gateway source before a later rebuild if rolling back the source as well. No database rollback is necessary because this release has no schema/data migration.

## Accessibility acceptance

The user personally tested TalkBack speech and interaction in the visible emulator and explicitly confirmed acceptance. That manual check is accepted and will not be repeated. This does not imply automated speech verification for every route or completion of the separate large-font screen matrix.
