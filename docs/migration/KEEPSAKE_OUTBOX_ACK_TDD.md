# Keepsake outbox acknowledgement — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Later native acceptance: [KEEPSAKE_CONTROLLED_LOSS_ANDROID.md](KEEPSAKE_CONTROLLED_LOSS_ANDROID.md) adds controlled metadata PATCH response loss, queue 1→0/object audit and one cached-photo A–B–A scenario. Earlier statements below about those cases being unverified describe the preceding increment; cache-full/race and durable create-before-network remain open.

Source: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), offline/media durability. Scope: Expo Android, no BE, remote schema, Storage policy, credentials, or public release changes. No commit/push per user request.

## Findings

- Replay previously removed the local row/photo before persisting the confirmed cloud collection. A cache write failure could leave no durable local copy for the next offline start.
- Replay deleted by owner/ID alone, even if a newer local edit replaced that row during upload/API work. The final UI merge also used a stale pre-request outbox snapshot.

## Implementation

- Persist the confirmed cloud collection before acknowledging the outbox. If persistence rejects, acknowledgement is never called.
- In an exclusive SQLite transaction, read the current owner/ID row, compare all persisted semantic fields (including original remote version, photo URI and upload intent), and delete only an unchanged snapshot. No schema migration required; unknown legacy photo intent remains distinct from false/true.
- Reload the live outbox after replay rather than filtering the pre-request snapshot, so a concurrent newer edit remains overlaid on cloud data.
- Acknowledgement deliberately does not delete the local source photo: another pending edit/display may still reference it. This prioritizes data retention; bounded, ownership-aware orphan cleanup is still required.
- Comparison is not automatic conflict merge/rebase. A newer local edit can remain pending against the earlier server version and need conflict resolution. No claim that every concurrent edit now auto-syncs.

## RED/GREEN and verification

- `npm run test:keepsakes --prefix apps/mobile`: RED 25 passed/3 failed because the new persistence/comparison functions were absent; GREEN **28/28** after implementation.
- New tests: cache-full failure never acknowledges; ordering and SQLite failure stay retryable; missing/different-owner/newer payload/photo/version/legacy intent never matches the old snapshot.
- Full `npm run test:mobile`: **162/162 PASS**, no failures/skips. Typecheck PASS. Full lint 0 errors/24 pre-existing warnings.
- Pure media-policy coverage: 10/10 tests, lines/functions 100%, branches 97.87%. This is not SQLite/native adapter coverage.
- Signed x86_64 assembleRelease PASS, 1m46s, 834 tasks (24 executed). Signature verified with the existing Picket certificate. Package `com.picket.mobile`, version 1.0.1/code 2, x86_64; 72,172,591 bytes, SHA-256 `a84e1ec0b5fa07245c2ff587efe97c0c50d6b8f3e056e6321b96c0c81de96029`. Installed with `adb install -r`: Success. This local test binary is not the public ARM64 artifact.
- Targeted changed-code scan found no console.log/service-role secret patterns; diff whitespace check PASS. Not a complete security audit.

## Native acceptance boundary

AVD `Picket_Production_Test` opened; user completed Google login after the initial app presented sign-in. No password/token read and no app-data clear. Native results are recorded below when completed. Disk-full, overlapping edits at a controlled acknowledgement boundary, exact queue/object counts, and response-drop remain separate acceptance cases; unit policy results do not prove these on Android.

### Native results

- Baseline UI: `Chào Son Nguyen`, balance -261,345 VND, existing `EE2E Offline Keepsake` retained. Created only `QA_ACK_20261020` at value 0, no photo, initial note `QA_NOTE_BEFORE`. This is metadata/outbox acceptance, not a new photo-upload or OCR test.
- Before pressing Save, confirmed `Active default network: none`. UI reported durable local save. Edited the pending item again while still offline to `QA_ACK_20261020_FINAL` / `QA_NOTE_LATEST`, then force-stopped/restarted. The latest title and note survived offline navigation back to the collection.
- Reconnected (network 110), left and reopened the collection to trigger refresh/replay. Logs show GET 200 followed by one POST 201 at `2026-10-19T23:10:50.750450` UTC (20/10 local). UI showed exactly one final-title fixture and the original keepsake. This is focus-triggered replay, not proof of autonomous reconnect while remaining on the same form.
- Second force-stop/restart with network none: the post-sync cached fixture still had `QA_NOTE_LATEST`. Native SQLite acknowledgement and the successful cache path exercised without JS/native error; exact outbox contents were not read.
- Reconnected (network 112), refreshed again: no additional POST/PATCH in the observed API interval. Archived only the named fixture through Android confirmation. DELETE 200 for ID `3d5996d5-bdf2-4d3c-ad98-91d1a24fb6e5?expectedVersion=1`; following GET 200. Archiving is recoverable server state, not hard purge.
- Ignored UI evidence: `.artifacts/roadmap-qa/ack-*.xml`. API logs contain only method/status/path in the recorded evidence; no user session exported.
- Observed empty-state flash while the collection was still loading, then correct data arrived. This remains a loading-state UX follow-up, not evidence of deleted cloud data.
- No production deploy, migration, permission change, public APK update, commit or push. Controlled cache-full/racing-edit/response-drop on Android, Storage/outbox audit, media A–B, conflict rebase and orphan cleanup remain open.
- Final cleanup verified fixture absent and original keepsake still present. Home owner/balance unchanged, network 113 active, current-process AndroidRuntime/ReactNativeJS error filter returned 0 lines. Changed keepsake files pass targeted ESLint. Emulator left open for further tests.
