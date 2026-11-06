# Write-ahead keepsakes and completion slices — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Source: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), user requested groups 1 and 2 first. Expo Android only. No commit/push, public APK update, BE deployment, remote migration or RLS change. Product delivery/TDD sequence used; user prohibition overrides checkpoint commits.

## Implemented behavior and RED → GREEN

| Guarantee | Test target | Evidence |
| --- | --- | --- |
| Durable payload/photo before upload/API; disk-full prevents network; response/cache failure retains pending intent | `keepsake-media-policy.test.ts` | Five new write-ahead/owner-lock tests executed RED for missing implementation, then GREEN |
| Same-owner save/replay serializes; other owners do not block each other | Same | Lock releases after failed operation |
| Cleanup requires matching fresh replacement and no pending/remote references; journal persists before upload | Same + Android SQLite/Storage audit | Two additional cache-path/cleanup tests RED → GREEN; journal adapter exercised natively |
| Loading/failure does not claim collection is empty; no-match search has its own state | `keepsake-view-policy.test.ts` | Two tests RED → GREEN |
| Protected routes mount only after session/local-mode recovery | `session-route-policy.test.ts` | Missing module RED → implementation GREEN; cold authenticated deep link exercised on AVD |
| Transaction-update conflict selects fields explicitly, uses fresh server version, preserves unselected fields and validates payload | `conflict-resolution.test.ts` | Three tests RED → GREEN; no silent default to local |
| Successful `File.move` must not delete the now-committed cache file | `keepsake-media-policy.test.ts` | Native checksum failed on the intermediate QA build; two regression tests RED → GREEN; final native recheck recorded below |

Commands actually used: `npm run test:keepsakes --prefix apps/mobile`, `npm run test:auth --prefix apps/mobile`, `npm run test:sync --prefix apps/mobile`, `npm run test:ui --prefix apps/mobile`, `npm run test:mobile`, `npm run typecheck --prefix apps/mobile`, `npm run lint --prefix apps/mobile`. Final full mobile suite **178/178**, typecheck PASS, lint 0 errors/24 pre-existing warnings. Final targeted Node coverage: 27 tests, **97.25% lines/94.22% branches/100% functions** across the four policy files, not whole-app coverage. `git diff --check` PASS (line-ending notices only).

## Android write-ahead create and replacement

Separate debuggable `com.picket.mobile.qa` on existing AVD, generated QA A/B accounts, loopback proxy allowing only their subjects; main Google package untouched. Public CORD receipt selected through native Photo Picker and Crop, value 0 (not a financial transaction). Cropping changes bytes; do not claim original corpus checksum or OCR acceptance.

- Fixture `045987ca-8c84-43b3-9de7-20c4ea0b9e1a`, owner `6277c715-cf84-4c76-93af-0751670def96`, title `QA_MEDIA_FAULT_WRITEAHEAD`, note `QA_EARLY_STOP`.
- Proxy forwarded POST, observed 201/version 1, held its response for 30 seconds and blocked subsequent keepsake calls. App force-stopped after the commit event, without waiting for fallback/local-save confirmation. QA SQLite already contained the full pending row and app-owned copied JPEG, `photo_upload_required=1`.
- Cold `com.picket.mobile://keepsakes` reached the collection (not Dashboard). Restart under API outage showed pending item/photo control. After resuming and allowing the collection to finish loading, SQLite pending became empty; API still version 1/one row, Storage one object. Events contained exactly one successful POST, no successful retry mutation.
- Selected the same public receipt and rotated it through Crop to produce different replacement bytes. PATCH response held/dropped after 200/version 2; force-stop retained pending expected version 1, new local photo and durable cleanup row old→new.
- Before recovery: two Storage objects. After fresh collection/recovery: pending `[]`, cleanup `[]`, exactly one live server row/version 2 and one replacement object. Original object `045804fd-518f-4f01-af48-2d5407d59f14` removed; replacement object `fb973883-35e0-4361-8706-bbfc89dd0556` retained. No extra successful PATCH.
- Initial photo digest `83ae0b337741bc1148e830ccbf2230df2bd69865480b42aa7a7e8a94993cd493`; replacement digest `45df6e15fbc09b766932e22b2d69f113f1654bc0291441211383917d99ff71be` in owner/item/content-addressed paths.

## Bug found during native verification

The intermediate QA build used a temporary `File` and `move(destination)`, then deleted `temporary` in `finally`. Expo mutates the File handle's URI on move, so that cleanup removed the committed image. UI still exposed an image accessibility label, which is not proof its bytes exist. Raw cache read failed checksum: adb/run-as emitted a `cat:` error on stdout despite return code zero. The QA checker now rejects that condition explicitly. Production code cleans the temporary only on failure, never after successful commit; partial cleanup cannot mask the original download failure.

This bug was introduced and caught within this increment; the public ARM64 APK was never changed. Cache repair requires reloading online on the final build; offline-only startup cannot recreate an image that has already been removed.

Final native cache recheck: online reload repaired the fixture cache. Removed adb reverse, airplane on/Wi-Fi off, force-stop and cold deep link back to collection, confirmed default network none. Raw cached JPEG **136,244 bytes**, SHA-256 `45df6e15fbc09b766932e22b2d69f113f1654bc0291441211383917d99ff71be`, matched uploaded replacement. Inspected `writeahead-final-offline.png`: rotated receipt really displayed, not just an accessibility label.

## Transaction merge, bulk and Planning Android acceptance

- Transaction `b01198af-4fcd-435f-b5fd-825be3715bc3`: Android edited version 1 offline to `QA_MERGE_LOCAL`/`QA_LOCAL_NOTE`; separate QA API session changed server to version 2, title `QA_MERGE_SERVER`, amount 2,000 and note `QA_SERVER_NOTE`. Reconnect produced real PATCH 409. The conflict screen initially hid the newly discovered conflict because it loaded only at mount; fixed queue subscription, added a RED → GREEN source-contract test. This contract test is not React component rendering coverage.
- Final Android field editor loaded fresh server data. Explicitly selected local title, server amount/category/note, confirmed the dialog, then restarted to flush. API verified version 3, title `QA_MERGE_LOCAL`, amount 2,000, note `QA_SERVER_NOTE`. Conflict list empty. This is Android + API session, **not two Android devices**, and does not prove every mutation type has field merge.
- Natural bulk version conflict: selected `QA_BULK_REAL_OK` and `QA_BULK_REAL_STALE`, opened Android archive confirmation, then changed the stale row via the other API session. First native batch reported **1/2**, left only failed row selected. Retry reported **1/1** and no selection. Audit: stale DELETE expectedVersion 1 →409, OK DELETE expectedVersion 1 →200, stale retry expectedVersion 2 →200; successful row submitted only once. No injected proxy 409 in this case. IDs `c068361b-1442-4077-ae30-6f5b9e8b7b46` / `fd213995-6aeb-4a65-8962-6f4565369e5d`.
- Planning refusal branches now exercised through Android. Prepared isolated split/refund/transfer fixture and closed September via API. Native attempted to rename closed-month expense `ae5c96c4-465b-4f69-9279-0def3bb58c57`: PATCH409, UI error, server retained `QA SEPT SPLIT`/version2. Native selected August/checklist/rollover and confirmed close into already closed September: POST409, UI error; GET August still `close:null`. These are refused operations, not financial mutations to the personal account.

## QA artifact and cleanup

- Final QA APK `.artifacts/roadmap-qa/picket-writeahead-qa.apk`: 83,371,752 bytes, SHA-256 `dd4640a98dce14302dc822e5393fadb0db89678778e760a6514ab445f7e07e9a`; signed certificate verified. Debuggable isolated package/loopback endpoint, **never distribute**. Initial full build 3m39s; final incremental build 38s PASS. Intermediate artifacts were overwritten only at this task-owned QA path.
- Generated QA Storage folders deleted and audit returned `objects:[]`; then purged A/B data and deleted both QA Auth accounts. This permanently removed only temporary test rows/images, including budgets/transactions/month close fixtures; personal data untouched. QA app force-stopped, proxy process identity verified and stopped, adb reverse removed, connectivity restored.
- Default local-env release preflight correctly rejected its local HTTP API; rerun with explicit production HTTPS API passed. No `.env` edits or secret exposure. No public landing/APK changes, commits or push.

## Boundaries still requiring work

- This is not completion of all groups 1/2. Photo-at-rest encryption, bounded local orphan-file cleanup, metadata-conflict/rebase in the separate keepsake queue, two-Android merge, real disk-full/schema corruption recovery, natural/revoked token matrix and all wider UI/backup/reminder cases remain open.
- Remote cleanup journal deliberately retains unsafe/unconfirmed candidates. Fresh GET/reference checks are conservative client-side checks, not an atomic cross-device storage transaction.
- General conflict editor now has field selection for `transaction.update`; other mutation types retain the existing advanced JSON editor. No claim that every conflict type has field merge.
- Generated evidence: ignored `.artifacts/roadmap-qa/writeahead-*.xml`, audit/event JSON and SQLite snapshots. No personal Auth storage read. Startup dump timing failures were retried, not counted as product failures or acceptance.
