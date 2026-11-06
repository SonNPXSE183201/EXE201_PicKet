# OCR fallback durability — 2026-10-21

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Status: core Android lost-response/restart and manual-edit/consent cases PASS; expanded fault branches remain OPEN. This report is not a completion certificate for parts 1–2.

## Reproduced source defects

- Capture forwarded a temporary `<owner>/ocr/` object to permanent receipt creation. OCR expiry deletes that object after the job retention period. New captures now hand off a local image with no remote receipt path. Saving a legacy pending draft reuploads to the exact owner's `receipts/` namespace. Already-saved server receipts are not migrated by this client fix.
- A failed OCR POST deleted its uploaded image even if the server had committed the job but lost its response. A fresh retry generated a different key. The new encrypted SQLite/WAL outbox persists owner, capture/image identity, digest, canonical confidence, manual-edit baseline, submission phase and job ID before dependent operations.
- Process restart previously lost the job ID. Retry now GETs the recorded job or repeats the original POST/key without reuploading an already-submitted image, including expired jobs. The retry is user-initiated; this increment does not claim automatic background OCR polling.
- Late OCR results overwrote manual fields. Title, amount and date now apply only when their current values still match the original consent baseline. Manual draft edits remain autosaved during remote polling.

## Test ledger

| Case | Expected | Result |
| --- | --- | --- |
| Durable receipt namespace | Reject temporary, foreign-owner, traversal and URL paths | PASS local policy and integration source contracts, 3 tests |
| Concurrent consent/retry | One pinned intent and one submission; subsequent call reads recorded job | PASS pure protocol |
| POST committed / response lost | Keep input, retry exact canonical request, no reupload/delete | PASS pure protocol and fresh full native run: `ocr-outbox-response-loss-fresh-native.log`, `ocr-outbox-80d7d602/result.json` |
| Restart with recorded/expired job | GET exact job; no new object | PASS pure protocol; Android restart OPEN |
| Disk full / WAL marker failure | No dependent network mutation before durable marker | PASS injected I/O protocol; native full-disk OPEN |
| Wrong owner/image/digest/path | Fail closed before mutation or applying result | PASS pure protocol |
| Local job acknowledgement lost | Recover persisted job through GET | PASS pure protocol |
| Owner switches during upload | Stop new job submission; retain recoverable submitted phase | PASS pure protocol; Android in-flight switch OPEN |
| Lost upload acknowledgement / 409 | Verify existing object's exact length and digest; never overwrite | PASS pure upload protocol |
| Missing/different object / verification failure | Preserve original error, not false success | PASS pure upload protocol |
| Empty, oversized or changed local image | Reject before upload | PASS pure upload protocol |
| Manual baseline across retry | Original baseline remains canonical | PASS pure protocol and actual Android corrupt-photo/edit/restart/retry: title `QA CORRUPT EDIT`, amount 77001 and date 2026-10-20 retained after the existing server result. Editing during a held live processing request remains OPEN |
| Attachment opt-out | Server OCR must not re-enable transaction attachment | Actual native RED (`ocr-attachment-consent-native-red-viewport.log`), then GREEN on rebuilt QA (`ocr-attachment-consent-native-green.log`); no financial mutation submitted |

Evidence: `.artifacts/roadmap-qa/receipt-storage-red.log`, `receipt-storage-green.log`, `fallback-outbox-red.log`, `fallback-protocol-green.log`, `fallback-protocol-coverage.log`, `part12-fallback-tests.log`.

At checkpoint `af17110`: all mobile tests **338 PASS, 0 FAIL, 0 SKIP**. New outbox/upload modules: **100% line, 89.47% branch, 95.83% function coverage**. Scoped commit hooks ran lint and typecheck successfully. Later camera-finalizer changes require a fresh whole-suite checkpoint. No production deployment, GitHub push or public APK replacement.

Follow-up: receipt image uploads now use the durable draft UUID instead of a fresh random object name on each attempt. An ambiguous upload response is accepted only after verifying the existing private object has exactly the same length and SHA-256; otherwise the draft and original error remain. This prevents new orphan objects from that retry branch but is not a cleanup/audit of previously orphaned objects. RED `3b2a60d`, GREEN `bce3cca`; protocol/source tests passed, native upload-ack fault acceptance remains OPEN.

Native upload/local-progress fault follow-up now PASS: `.artifacts/native-receipt-upload-progress-loss.py`, log `receipt-upload-progress-native.log`, result `receipt-upload-progress-1600768e/result.json`. A QA-owner-scoped SQLite trigger rejected only the storage-path progress update **after** a real private Storage upload. The encrypted canonical request remained and the server had no receipt yet. After force-stop and removal of only that trigger from a fresh DB snapshot, retry verified the existing object, completed exactly one receipt (`35b6ded3-2c73-4246-969a-8d403f8fedaf`) and transaction (`12d3101d-49bf-4388-9ac1-c3cf061f5f4c`), preserved the image SHA-256 and removed the pending journal. Exactly one stable filename was present in the owner's receipt folder. This is actual upload commit plus failed local acknowledgement, not a claim of physically dropping the Storage HTTP response. Network-level ambiguity remains covered separately by the upload protocol tests. No real-user data was touched.

Latest mobile suite: **342 PASS, 0 FAIL, 0 SKIP**, `part12-final-consent-tests.log`; current QA build PASS, `part12-consent-repair-build.log`. Installed QA SHA-256 `4c5752ce8b63458f5cfbc86f2e0517f2e9a256a2d117b20517a35007cca72de5`. Original outbox-native build SHA-256 `ed2d4f6b0aa30fef7490e889efa72edb43cfb563ee4d79dda5d88c441952c1bc` has a preserved source manifest. Neither is a public ARM64 release.

Additional Android recovery: an unsubmitted pending receipt's copied image was moved aside, then repaired from the intact encrypted capture using the same draft identity/path. Repaired bytes have the same SHA-256, owner and unpinned metadata are unchanged; `pending-image-repair-native.log`. No canonical request or financial mutation was submitted in that case.

Harness hygiene: the first OCR waiter incorrectly used the rolling last-25-event status response, which had evicted the original POST amid finance requests. The full retained event log and read-only follow-up confirmed two identical-key POSTs, one completed job and readable image. A fresh full run with the complete event log then passed. The first corrupt-image waiter searched only the current viewport; it was corrected to scroll to the error and collect fields across the form. These invalid waiter attempts are not counted as product failures or successful full runs.

## Backend protection and authorized deployment

Migration `202610210001_ocr_receipt_image_retention.sql` now persists a deletion claim before returning an object to the worker. Receipt and job table triggers acquire the same per-path advisory lock and reject attachment/reuse after claim. The expiry routine rechecks references in a separate statement after acquiring the lock, including archived receipts and another live job sharing the object. Claims survive delayed/failed Storage DELETE and remain after acknowledgement. Filtering protected objects before the 100-object candidate limit prevents cleanup starvation; checks are repeated after locking.

Functional SQL RED reproduced deletion selection for an active receipt; GREEN passed the full existing SQL validation suite plus reference/claim/ACK/import-write/shared-job checks. A second RED reproduced starvation behind 101 protected objects; GREEN passed after prefiltering. Logs: `ocr-retention-sql-red.log`, `ocr-retention-sql-green.log`, `ocr-retention-starvation-red.log`, `ocr-retention-starvation-green.log` under the QA artifact directory. These run on the repository's PGlite fixture, not a two-session concurrency proof.

Real PostgreSQL two-connection races now PASS (21 October): receipt wins, claim wins, and insert during delayed Storage DELETE. Command: `python supabase/tests/ocr-retention-concurrency.py --container picket-ocr-retention-0c21a001`; evidence `.artifacts/roadmap-qa/ocr-retention-real-postgres.log`, three cases PASS. The official PostgreSQL 16 Alpine image ran with network disabled, a 128 MiB tmpfs data directory, no host binds or persistent volumes, 256 MiB RAM and one CPU. The first harness preflight incorrectly expected tmpfs in `Mounts`; Docker 29 reports it in `HostConfig.Tmpfs`. That setup failure was corrected before the successful database run. The disposable QA database and container were removed after verification; no user database was touched.

Deployment PASS, 21 October, after explicit user approval: the linked Supabase project `qyokoyopodjtvfyunyde` applied only migrations `202610210001` and `202610210002`. The OCR worker was stopped gracefully with a 60-second stop timeout, and an additional interval exceeded the old Storage DELETE timeout before deployment. API/web remained running. Function definitions were backed up before deployment; the migration list subsequently matched local and remote versions.

Real deployed PostgreSQL postflight PASS: a transaction scoped fixture writes to generated QA owner `7dfe8955-86b1-45d9-ac54-af514b8b2503`, temporarily references one existing OCR image, expires two QA jobs, verifies that the referenced path is not claimed, verifies that the unreferenced path is claimed, and verifies that attaching the claimed path is rejected with `OCR_IMAGE_DELETION_CLAIMED`. Cleanup RPC privileges reject `anon`/`authenticated` and allow `service_role`. All fixture changes, including expiry updates, were rolled back; no Storage objects were deleted in this test. Both protection triggers exist. The worker was restarted successfully with its provider healthy; API health returned `ok`. Evidence: `supabase-migration-apply.log`, `supabase-migration-list-postflight.json`, `ocr-production-postflight.json`, `ocr-worker-postmigration-resume.log` under `.artifacts/roadmap-qa/`. This does not recover images deleted before protection was deployed, nor certify every owner's historical objects.

Real-PostgreSQL harness: `supabase/tests/ocr-retention-concurrency.py`. It accepts only an explicitly labelled `picket-ocr-retention-<8 hex>` container with network disabled and tmpfs-only data; no production DSN is accepted. The script waits for an actual advisory-lock wait in `pg_stat_activity`, rather than inferring concurrency from sleeps. The named run above passed on real PostgreSQL. On any deployment problem, the safe rollback is to keep the worker stopped while retaining reference protection and investigating; blindly restoring the old unprotected expiry routine is not a safe image-preservation rollback.

Post-resume read-only verification also PASS: the exact QA legacy OCR object and durable receipt object both returned nonempty bytes through private signed reads (`ocr-deployed-images.json`). The first REST table-read probe was denied because `service_role` intentionally lacks direct table SELECT; verification used the authorized linked SQL connection instead, without broadening grants. Worker status remained `running` with restart count 0 and API health `ok`. Whole mobile regression after the gallery follow-up: **355 PASS, 0 FAIL, 0 SKIP**, `part12-postmigration-mobile-tests.log`.

## Backend boundary still requiring work

Existing OCR job RPC has unique owner/key and returns an existing job before storage/quota checks, so same-key ambiguous retry is supported. However concurrent POSTs may race before the advisory lock and one can receive a unique violation; a subsequent same-key retry recovers the existing job.

The deployed database now uses the protected expiry behavior, and the worker has resumed. Uploaded images with no job still need server retention cleanup. No broad service-role enumeration or mutation of real-user receipts was performed. Cancelling client polling does not promise cancellation of an already-created server job.
